using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;
using System.Linq.Expressions;

namespace KAEAAlumni.Application.Interfaces;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<int> SaveChangesAsync();
}

public interface IMemberRepository : IRepository<Domain.Entities.Member>
{
    Task<Domain.Entities.Member?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
}

public interface IEventRepository : IRepository<Domain.Entities.Event>
{
    Task<(List<Domain.Entities.Event> Events, int Total)> GetPagedAsync(
        bool? upcomingOnly, int page, int pageSize, int? year = null);
    Task<Domain.Entities.Event?> GetWithDetailsAsync(Guid id);
    Task<List<int>> GetDistinctYearsAsync();
}

public interface IEventRsvpRepository : IRepository<Domain.Entities.EventRsvp>
{
    Task<List<Domain.Entities.EventRsvp>> GetByEventIdAsync(Guid eventId);
    Task<int> CountAttendeesAsync(Guid eventId);
}

public interface IArticleRepository : IRepository<Domain.Entities.Article>
{
    Task<(List<Domain.Entities.Article> Articles, int Total)> GetPagedAsync(
        ArticleCategory? category, int page, int pageSize);
    Task<Domain.Entities.Article?> GetWithGalleryAsync(Guid id);
}

public interface IGalleryItemRepository : IRepository<Domain.Entities.GalleryItem>
{
    Task<(List<Domain.Entities.GalleryItem> Items, int Total)> GetPagedAsync(
        MediaType? mediaType, Guid? eventId, Guid? articleId, int page, int pageSize, bool? hasEvent = null, int? year = null, bool? showOnHome = null, string? category = null);
    Task<List<int>> GetDistinctYearsAsync();
}

public interface IPaymentRepository : IRepository<Domain.Entities.Payment>
{
    Task<(List<Domain.Entities.Payment> Payments, int Total)> GetPagedAsync(
        int? year, PaymentType? type, int page, int pageSize);
    Task<Domain.Entities.Payment?> GetWithMemberAsync(Guid id);
    Task<List<Domain.Entities.Payment>> GetByYearAsync(int year);
}

public interface IEmailBatchRepository : IRepository<Domain.Entities.EmailBatch>
{
    Task<(List<Domain.Entities.EmailBatch> Batches, int Total)> GetPagedAsync(
        EmailKind? kind, int page, int pageSize);
    Task<int> CountSentThisMonthAsync();
}
