using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using KAEAAlumni.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace KAEAAlumni.Infrastructure.Repositories;

// ── Base Repository ───────────────────────────────────────
public class Repository<T> : IRepository<T> where T : Domain.Common.BaseEntity
{
    protected readonly AppDbContext _db;
    protected readonly DbSet<T> _set;

    public Repository(AppDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
        => await _set.FirstOrDefaultAsync(e => e.Id == id);

    public async Task<IEnumerable<T>> GetAllAsync()
        => await _set.ToListAsync();

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
        => await _set.Where(predicate).ToListAsync();

    public async Task<T> AddAsync(T entity)
    {
        await _set.AddAsync(entity);
        return entity;
    }

    public Task UpdateAsync(T entity)
    {
        _set.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        _set.Remove(entity);
        return Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync()
        => await _db.SaveChangesAsync();
}

// ── Member Repository ─────────────────────────────────────
public class MemberRepository : Repository<Member>, IMemberRepository
{
    public MemberRepository(AppDbContext db) : base(db) { }

    public async Task<Member?> GetByEmailAsync(string email)
        => await _db.Members.FirstOrDefaultAsync(m => m.Email == email);

    public async Task<bool> EmailExistsAsync(string email)
        => await _db.Members.AnyAsync(m => m.Email == email);
}

// ── Event Repository ───────────────────────────────────────
public class EventRepository : Repository<Event>, IEventRepository
{
    public EventRepository(AppDbContext db) : base(db) { }

    public async Task<(List<Event> Events, int Total)> GetPagedAsync(
        bool? upcomingOnly, int page, int pageSize, int? year = null)
    {
        var query = _db.Events.Include(e => e.Rsvps).AsQueryable();

        if (upcomingOnly == true)
        {
            query = query.Where(e => e.EventDate >= DateTime.UtcNow && e.IsActive);
            // 다가오는 행사는 가까운 날짜순(오름차순)으로 보여줍니다.
            query = query.OrderBy(e => e.EventDate);
        }
        else
        {
            // 전체 목록(행사 및 모임 페이지)은 최근/최신 날짜순(내림차순)으로 보여줍니다.
            query = query.OrderByDescending(e => e.EventDate);
        }

        if (year.HasValue)
            query = query.Where(e => e.EventDate.Year == year.Value);

        var total = await query.CountAsync();
        var events = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (events, total);
    }

    public async Task<Event?> GetWithDetailsAsync(Guid id)
        => await _db.Events
            .Include(e => e.Rsvps)
            .Include(e => e.GalleryItems)
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<List<int>> GetDistinctYearsAsync()
        => await _db.Events
            .Select(e => e.EventDate.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToListAsync();
}

// ── EventRsvp Repository ───────────────────────────────────
public class EventRsvpRepository : Repository<EventRsvp>, IEventRsvpRepository
{
    public EventRsvpRepository(AppDbContext db) : base(db) { }

    public async Task<List<EventRsvp>> GetByEventIdAsync(Guid eventId)
        => await _db.EventRsvps
            .Where(r => r.EventId == eventId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<int> CountAttendeesAsync(Guid eventId)
        => await _db.EventRsvps
            .Where(r => r.EventId == eventId)
            .SumAsync(r => 1 + r.AdditionalGuests);
}

// ── Article Repository ─────────────────────────────────────
public class ArticleRepository : Repository<Article>, IArticleRepository
{
    public ArticleRepository(AppDbContext db) : base(db) { }

    public async Task<(List<Article> Articles, int Total)> GetPagedAsync(
        ArticleCategory? category, int page, int pageSize)
    {
        // 목록에서도 댓글/좋아요 개수를 함께 보여주기 위해 Include.
        var query = _db.Articles.Include(a => a.Comments).Include(a => a.Likes).AsQueryable();

        if (category.HasValue)
        {
            query = query.Where(a => a.Category == category.Value);
            query = query.OrderByDescending(a => a.CreatedAt);
        }
        else
        {
            // "전체" 탭: 공지사항(NOTICE)은 항상 최상단에 고정하고, 나머지는 최신순으로 정렬.
            query = query
                .OrderByDescending(a => a.Category == ArticleCategory.NOTICE)
                .ThenByDescending(a => a.CreatedAt);
        }

        var total = await query.CountAsync();
        var articles = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (articles, total);
    }

    public async Task<Article?> GetWithGalleryAsync(Guid id)
        => await _db.Articles
            .Include(a => a.GalleryItems)
            .Include(a => a.Comments)
            .Include(a => a.Likes)
            .FirstOrDefaultAsync(a => a.Id == id);
}

// ── GalleryItem Repository ─────────────────────────────────
public class GalleryItemRepository : Repository<GalleryItem>, IGalleryItemRepository
{
    public GalleryItemRepository(AppDbContext db) : base(db) { }

    public async Task<(List<GalleryItem> Items, int Total)> GetPagedAsync(
        MediaType? mediaType, Guid? eventId, Guid? articleId, int page, int pageSize, bool? hasEvent = null, int? year = null, bool? showOnHome = null, string? category = null)
    {
        var query = _db.GalleryItems.Include(g => g.Event).AsQueryable();

        if (mediaType.HasValue)
            query = query.Where(g => g.MediaType == mediaType.Value);
        if (eventId.HasValue)
            query = query.Where(g => g.EventId == eventId.Value);
        if (articleId.HasValue)
            query = query.Where(g => g.ArticleId == articleId.Value);
        // 홈페이지에서 "최근 행사 미디어"(행사에 연결된 항목)와 "고대 자료실"/"학교 갤러리"(교가/응원가,
        // 캠퍼스 사진 등 특정 행사와 무관한 항목)를 분리해서 보여주기 위한 필터.
        if (hasEvent.HasValue)
            query = hasEvent.Value ? query.Where(g => g.EventId != null) : query.Where(g => g.EventId == null);
        // 행사와 무관한 항목을 다시 "SCHOOL_SONG"(교가/응원가)과 "CAMPUS"(캠퍼스 사진)로 세분화.
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(g => g.Category == category);
        // 갤러리 메인 페이지의 연도 선택 드롭다운용 필터 (등록일 기준).
        if (year.HasValue)
            query = query.Where(g => g.CreatedAt.Year == year.Value);
        // 홈페이지 노출 여부 필터 — 홈페이지 위젯에서만 showOnHome=true로 필터링해서 호출.
        if (showOnHome.HasValue)
            query = query.Where(g => g.ShowOnHome == showOnHome.Value);

        if (hasEvent == true)
        {
            // 행사에 연결된 미디어("최근 행사 미디어", 행사 사진 탭)는 최신 행사(행사일자 내림차순)의
            // 사진이 먼저 보이도록 정렬하고, 같은 행사 안에서는 기존처럼 등록 순서(DisplayOrder)를 따릅니다.
            query = query.OrderByDescending(g => g.Event!.EventDate).ThenBy(g => g.DisplayOrder).ThenByDescending(g => g.CreatedAt);
        }
        else
        {
            // hasEvent==false(학교 갤러리/고대 자료실만 조회) 또는 필터 없음("전체보기", 모든 종류가 섞임).
            // 행사에 연결된 항목이 섞여 있으면 최신 행사 순으로, 행사와 무관한 항목(교가/응원가, 캠퍼스
            // 사진 등)은 이벤트 날짜가 없으므로 가장 나중으로 밀려나고 그 안에서는 기존처럼 DisplayOrder로 정렬됩니다.
            query = query
                .OrderByDescending(g => g.EventId != null ? g.Event!.EventDate : DateTime.MinValue)
                .ThenBy(g => g.DisplayOrder)
                .ThenByDescending(g => g.CreatedAt);
        }

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<List<int>> GetDistinctYearsAsync()
        => await _db.GalleryItems
            .Select(g => g.CreatedAt.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToListAsync();
}

// ── Payment Repository ─────────────────────────────────────
public class PaymentRepository : Repository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext db) : base(db) { }

    public async Task<(List<Payment> Payments, int Total)> GetPagedAsync(
        int? year, PaymentType? type, int page, int pageSize)
    {
        var query = _db.Payments.Include(p => p.Member).AsQueryable();

        if (year.HasValue)
            query = query.Where(p => p.TargetYear == year.Value);
        if (type.HasValue)
            query = query.Where(p => p.PaymentType == type.Value);

        query = query.OrderByDescending(p => p.PaymentDate);

        var total = await query.CountAsync();
        var payments = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (payments, total);
    }

    public async Task<Payment?> GetWithMemberAsync(Guid id)
        => await _db.Payments.Include(p => p.Member).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<List<Payment>> GetByYearAsync(int year)
        => await _db.Payments.Where(p => p.TargetYear == year).ToListAsync();
}

// ── EmailBatch Repository ──────────────────────────────────
public class EmailBatchRepository : Repository<EmailBatch>, IEmailBatchRepository
{
    public EmailBatchRepository(AppDbContext db) : base(db) { }

    public async Task<(List<EmailBatch> Batches, int Total)> GetPagedAsync(
        EmailKind? kind, int page, int pageSize)
    {
        var query = _db.EmailBatches.Include(b => b.Event).AsQueryable();

        if (kind.HasValue)
            query = query.Where(b => b.Kind == kind.Value);

        query = query.OrderByDescending(b => b.CreatedAt);

        var total = await query.CountAsync();
        var batches = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (batches, total);
    }

    // 무료 SMTP 티어(월 발송 한도) 소진 속도를 가늠하기 위한 이번 달 누적 발송 성공 건수.
    public async Task<int> CountSentThisMonthAsync()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return await _db.EmailLogs.CountAsync(l => l.Status == EmailLogStatus.SENT && l.SentAt >= monthStart);
    }
}
