using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace KAEAAlumni.API.Controllers;

// ── 회비 및 도네이션 수납 관리 대시보드 (Payments) ────────
// 열람: Officer 전체, 등록/수정: Admin 및 회계 담당(officerTitle="회계") 임원
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentRepository _paymentRepo;

    public PaymentsController(IPaymentRepository paymentRepo)
        => _paymentRepo = paymentRepo;

    // Admin이거나, 임원 직책이 "회계"(회계 담당)인 경우 수납 내역 등록/수정을 허용합니다.
    // 임원 직책은 역할(Role)과 별개의 값이라 JWT의 OfficerTitle 클레임으로 확인합니다.
    private bool CanManagePayments()
        => User.IsInRole("ADMIN") || User.FindFirst("OfficerTitle")?.Value == "회계";

    // 내 납부내역 조회 (로그인한 모든 회원) — 라우트 우선순위상 {id} 계열보다 먼저 매칭되도록 위에 배치
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyPayments()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (idClaim == null || !Guid.TryParse(idClaim, out var memberId))
            return Unauthorized();

        var payments = await _paymentRepo.FindAsync(p => p.MemberId == memberId);
        var items = payments.Select(p => new
        {
            p.Id, p.PaymentDate, PaymentType = p.PaymentType.ToString(), p.TargetYear,
            p.Amount, PaymentMethod = p.PaymentMethod.ToString(), p.ReceiptIssued
        });
        return Ok(items);
    }

    // 전체 수납/도네이션 현황 열람 (Officer 열람, Admin 관리)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpGet]
    public async Task<IActionResult> GetPayments(
        [FromQuery] int? year,
        [FromQuery] string? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        PaymentType? paymentType = null;
        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<PaymentType>(type, true, out var parsed))
            paymentType = parsed;

        var (payments, total) = await _paymentRepo.GetPagedAsync(year, paymentType, page, pageSize);
        var items = payments.Select(p => new PaymentDto(
            p.Id, p.PaymentDate, p.MemberId, p.Member.Name,
            $"{p.Member.EntryYear} {p.Member.Major}",
            p.PaymentType.ToString(), p.TargetYear, p.Amount, p.PaymentMethod.ToString(),
            p.TransactionId, p.PurposeDetail, p.PaymentStatus.ToString(), p.ReceiptIssued
        )).ToList();

        return Ok(new PagedResultDto<PaymentDto>(
            items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // 연도별 총액 집계 (연회비/도네이션 구분)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int year)
    {
        var payments = await _paymentRepo.GetByYearAsync(year);
        var summary = new PaymentSummaryDto(
            year,
            payments.Sum(p => p.Amount),
            payments.Where(p => p.PaymentType is PaymentType.MEMBERSHIP_FEE or PaymentType.MEMBERSHIP_FEE_BOARD).Sum(p => p.Amount),
            payments.Where(p => p.PaymentType == PaymentType.DONATION).Sum(p => p.Amount),
            payments.Where(p => p.PaymentType == PaymentType.EVENT_FEE).Sum(p => p.Amount)
        );
        return Ok(summary);
    }

    // 수납 내역 등록 (Admin 또는 회계 담당 임원)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPost]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        if (!CanManagePayments()) return Forbid();

        if (!Enum.TryParse<PaymentType>(dto.PaymentType, true, out var paymentType))
            return BadRequest(new { message = "유효하지 않은 납부 구분입니다." });
        if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            return BadRequest(new { message = "유효하지 않은 납부 수단입니다." });

        var payment = new Payment
        {
            MemberId = dto.MemberId,
            PaymentType = paymentType,
            TargetYear = dto.TargetYear,
            Amount = dto.Amount,
            PaymentMethod = paymentMethod,
            PaymentDate = dto.PaymentDate ?? DateTime.UtcNow.Date,
            TransactionId = dto.TransactionId,
            PurposeDetail = dto.PurposeDetail,
            ReceiptIssued = dto.ReceiptIssued,
            PaymentStatus = PaymentStatus.COMPLETED
        };

        await _paymentRepo.AddAsync(payment);
        await _paymentRepo.SaveChangesAsync();
        return Ok(new { id = payment.Id });
    }

    // 수납 내역 수정 (금액/납부일자/구분 등 잘못 입력된 내역 정정용, Admin 또는 회계 담당 임원)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePayment(Guid id, [FromBody] UpdatePaymentDto dto)
    {
        if (!CanManagePayments()) return Forbid();

        var payment = await _paymentRepo.GetByIdAsync(id);
        if (payment == null) return NotFound();

        if (!Enum.TryParse<PaymentType>(dto.PaymentType, true, out var paymentType))
            return BadRequest(new { message = "유효하지 않은 납부 구분입니다." });
        if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            return BadRequest(new { message = "유효하지 않은 납부 수단입니다." });
        if (!Enum.TryParse<PaymentStatus>(dto.PaymentStatus, true, out var paymentStatus))
            return BadRequest(new { message = "유효하지 않은 납부 상태입니다." });

        payment.MemberId = dto.MemberId;
        payment.PaymentType = paymentType;
        payment.TargetYear = dto.TargetYear;
        payment.Amount = dto.Amount;
        payment.PaymentMethod = paymentMethod;
        payment.PaymentDate = dto.PaymentDate ?? payment.PaymentDate;
        payment.TransactionId = dto.TransactionId;
        payment.PurposeDetail = dto.PurposeDetail;
        payment.PaymentStatus = paymentStatus;
        payment.ReceiptIssued = dto.ReceiptIssued;

        await _paymentRepo.SaveChangesAsync();
        return NoContent();
    }

    // 수납 내역 삭제 (잘못 등록된 내역 정리용, Admin 또는 회계 담당 임원)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePayment(Guid id)
    {
        if (!CanManagePayments()) return Forbid();

        var payment = await _paymentRepo.GetByIdAsync(id);
        if (payment == null) return NotFound();

        await _paymentRepo.DeleteAsync(payment);
        await _paymentRepo.SaveChangesAsync();
        return NoContent();
    }
}
