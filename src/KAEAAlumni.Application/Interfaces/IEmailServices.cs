namespace KAEAAlumni.Application.Interfaces;

/// <summary>
/// SMTP 발송만 담당한다. 이력 저장이나 수신자 조립은 하지 않는다.
/// 구현체를 갈아끼우면(SMTP2GO → Amazon SES) 나머지 코드는 손대지 않아도 된다.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// 메일 1통을 발송한다. 실패 시 예외를 던지며, 호출자가 잡아서 로그에 기록한다.
    /// </summary>
    Task SendAsync(
        string toEmail,
        string? toName,
        string subject,
        string body,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// 발송 요청을 백그라운드로 넘기는 큐.
/// 100통을 HTTP 요청 안에서 동기 발송하면 타임아웃이 나기 때문에,
/// 컨트롤러는 배치를 만들고 큐에 배치 ID만 넣은 뒤 즉시 202를 반환한다.
/// </summary>
public interface IEmailQueue
{
    ValueTask EnqueueAsync(Guid batchId, CancellationToken cancellationToken = default);

    IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken);
}
