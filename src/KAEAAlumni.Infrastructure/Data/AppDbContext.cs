using KAEAAlumni.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KAEAAlumni.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Member> Members => Set<Member>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventRsvp> EventRsvps => Set<EventRsvp>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleComment> ArticleComments => Set<ArticleComment>();
    public DbSet<ArticleLike> ArticleLikes => Set<ArticleLike>();
    public DbSet<GalleryItem> GalleryItems => Set<GalleryItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<EmailBatch> EmailBatches => Set<EmailBatch>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── members ──────────────────────────────────────
        modelBuilder.Entity<Member>(e =>
        {
            e.ToTable("members");
            e.HasIndex(m => m.Email).IsUnique();
            e.HasIndex(m => m.EntryYear);
            e.HasIndex(m => m.Name);
            e.Property(m => m.Id).HasColumnName("id");
            e.Property(m => m.Name).HasColumnName("name").HasMaxLength(100);
            e.Property(m => m.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(m => m.CellPhone).HasColumnName("cell_phone").HasMaxLength(50);
            e.Property(m => m.HomePhone).HasColumnName("home_phone").HasMaxLength(50);
            e.Property(m => m.AddressLine1).HasColumnName("address_line1").HasMaxLength(255);
            e.Property(m => m.AddressLine2).HasColumnName("address_line2").HasMaxLength(100);
            e.Property(m => m.City).HasColumnName("city").HasMaxLength(100);
            e.Property(m => m.State).HasColumnName("state").HasMaxLength(50);
            e.Property(m => m.ZipCode).HasColumnName("zip_code").HasMaxLength(20);
            e.Property(m => m.EntryYear).HasColumnName("entry_year");
            e.Property(m => m.Major).HasColumnName("major").HasMaxLength(100);
            e.Property(m => m.Degree).HasColumnName("degree").HasMaxLength(50);
            e.Property(m => m.Role).HasColumnName("role").HasMaxLength(30).HasConversion<string>();
            e.Property(m => m.Bio).HasColumnName("bio");
            e.Property(m => m.OfficerTitle).HasColumnName("officer_title").HasMaxLength(50);
            e.Property(m => m.IsActive).HasColumnName("is_active");
            e.Property(m => m.PhotoUrl).HasColumnName("photo_url");
            e.Property(m => m.EmailVerified).HasColumnName("email_verified");
            e.Property(m => m.EmailVerificationToken).HasColumnName("email_verification_token");
            e.Property(m => m.CreatedAt).HasColumnName("created_at");
            // Auth 확장 컬럼 (schema.sql 기본 DDL에는 없음 — db/schema.sql 하단 ALTER TABLE 참고)
            e.Property(m => m.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
            e.Property(m => m.RefreshToken).HasColumnName("refresh_token");
            e.Property(m => m.RefreshTokenExpiry).HasColumnName("refresh_token_expiry");
        });

        // ── events ───────────────────────────────────────
        modelBuilder.Entity<Event>(e =>
        {
            e.ToTable("events");
            e.HasIndex(ev => ev.EventDate);
            e.Property(ev => ev.Id).HasColumnName("id");
            e.Property(ev => ev.Title).HasColumnName("title").HasMaxLength(200);
            e.Property(ev => ev.Description).HasColumnName("description");
            e.Property(ev => ev.EventDate).HasColumnName("event_date");
            e.Property(ev => ev.Location).HasColumnName("location").HasMaxLength(255);
            e.Property(ev => ev.GoogleMapsUrl).HasColumnName("google_maps_url");
            e.Property(ev => ev.Fee).HasColumnName("fee").HasColumnType("decimal(10,2)");
            e.Property(ev => ev.MaxAttendees).HasColumnName("max_attendees");
            e.Property(ev => ev.IsActive).HasColumnName("is_active");
            e.Property(ev => ev.CreatedAt).HasColumnName("created_at");
        });

        // ── event_rsvps ──────────────────────────────────
        modelBuilder.Entity<EventRsvp>(e =>
        {
            e.ToTable("event_rsvps");
            e.HasIndex(r => r.EventId);
            e.HasOne(r => r.Event).WithMany(ev => ev.Rsvps)
                .HasForeignKey(r => r.EventId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Member).WithMany(m => m.EventRsvps)
                .HasForeignKey(r => r.MemberId).OnDelete(DeleteBehavior.SetNull);
            e.Property(r => r.Id).HasColumnName("id");
            e.Property(r => r.EventId).HasColumnName("event_id");
            e.Property(r => r.MemberId).HasColumnName("member_id");
            e.Property(r => r.GuestName).HasColumnName("guest_name").HasMaxLength(100);
            e.Property(r => r.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(r => r.CellPhone).HasColumnName("cell_phone").HasMaxLength(50);
            e.Property(r => r.GraduationInfo).HasColumnName("graduation_info").HasMaxLength(100);
            e.Property(r => r.AdditionalGuests).HasColumnName("additional_guests");
            e.Property(r => r.PaymentStatus).HasColumnName("payment_status").HasMaxLength(20).HasConversion<string>();
            e.Property(r => r.Note).HasColumnName("note");
            e.Property(r => r.CreatedAt).HasColumnName("created_at");
        });

        // ── articles ─────────────────────────────────────
        modelBuilder.Entity<Article>(e =>
        {
            e.ToTable("articles");
            e.HasIndex(a => a.Category);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.Category).HasColumnName("category").HasMaxLength(50).HasConversion<string>();
            e.Property(a => a.Title).HasColumnName("title").HasMaxLength(255);
            e.Property(a => a.Content).HasColumnName("content");
            e.Property(a => a.AuthorName).HasColumnName("author_name").HasMaxLength(100);
            e.Property(a => a.AuthorId).HasColumnName("author_id");
            e.Property(a => a.ViewCount).HasColumnName("view_count");
            e.Property(a => a.CreatedAt).HasColumnName("created_at");
        });

        // ── article_comments (자유게시판/우리 이야기 전용) ─
        modelBuilder.Entity<ArticleComment>(e =>
        {
            e.ToTable("article_comments");
            e.HasIndex(c => c.ArticleId);
            e.HasOne(c => c.Article).WithMany(a => a.Comments)
                .HasForeignKey(c => c.ArticleId).OnDelete(DeleteBehavior.Cascade);
            e.Property(c => c.Id).HasColumnName("id");
            e.Property(c => c.ArticleId).HasColumnName("article_id");
            e.Property(c => c.MemberId).HasColumnName("member_id");
            e.Property(c => c.AuthorName).HasColumnName("author_name").HasMaxLength(100);
            e.Property(c => c.Content).HasColumnName("content");
            e.Property(c => c.CreatedAt).HasColumnName("created_at");
        });

        // ── article_likes (자유게시판/우리 이야기 전용) ────
        modelBuilder.Entity<ArticleLike>(e =>
        {
            e.ToTable("article_likes");
            e.HasIndex(l => l.ArticleId);
            e.HasIndex(l => new { l.ArticleId, l.MemberId }).IsUnique();
            e.HasOne(l => l.Article).WithMany(a => a.Likes)
                .HasForeignKey(l => l.ArticleId).OnDelete(DeleteBehavior.Cascade);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.ArticleId).HasColumnName("article_id");
            e.Property(l => l.MemberId).HasColumnName("member_id");
            e.Property(l => l.CreatedAt).HasColumnName("created_at");
        });

        // ── gallery_items ────────────────────────────────
        modelBuilder.Entity<GalleryItem>(e =>
        {
            e.ToTable("gallery_items");
            e.HasIndex(g => g.EventId);
            e.HasIndex(g => g.ArticleId);
            e.HasIndex(g => g.MediaType);
            e.HasOne(g => g.Event).WithMany(ev => ev.GalleryItems)
                .HasForeignKey(g => g.EventId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(g => g.Article).WithMany(a => a.GalleryItems)
                .HasForeignKey(g => g.ArticleId).OnDelete(DeleteBehavior.Cascade);
            e.Property(g => g.Id).HasColumnName("id");
            e.Property(g => g.EventId).HasColumnName("event_id");
            e.Property(g => g.ArticleId).HasColumnName("article_id");
            e.Property(g => g.Title).HasColumnName("title").HasMaxLength(255);
            e.Property(g => g.Description).HasColumnName("description");
            e.Property(g => g.MediaType).HasColumnName("media_type").HasMaxLength(20).HasConversion<string>();
            e.Property(g => g.MediaUrl).HasColumnName("media_url");
            e.Property(g => g.ThumbnailUrl).HasColumnName("thumbnail_url");
            e.Property(g => g.DisplayOrder).HasColumnName("display_order");
            e.Property(g => g.ShowOnHome).HasColumnName("show_on_home");
            e.Property(g => g.Category).HasColumnName("category").HasMaxLength(20);
            e.HasIndex(g => g.Category);
            e.Property(g => g.CreatedAt).HasColumnName("created_at");
        });

        // ── payments ─────────────────────────────────────
        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasIndex(p => p.MemberId);
            e.HasIndex(p => p.PaymentType);
            e.HasIndex(p => p.TargetYear);
            e.HasIndex(p => p.PaymentDate);
            e.HasOne(p => p.Member).WithMany(m => m.Payments)
                .HasForeignKey(p => p.MemberId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.MemberId).HasColumnName("member_id");
            e.Property(p => p.PaymentType).HasColumnName("payment_type").HasMaxLength(50).HasConversion<string>();
            e.Property(p => p.TargetYear).HasColumnName("target_year");
            e.Property(p => p.Amount).HasColumnName("amount").HasColumnType("decimal(10,2)");
            e.Property(p => p.PaymentMethod).HasColumnName("payment_method").HasMaxLength(30).HasConversion<string>();
            e.Property(p => p.PaymentStatus).HasColumnName("payment_status").HasMaxLength(20).HasConversion<string>();
            e.Property(p => p.PaymentDate).HasColumnName("payment_date").HasColumnType("date");
            e.Property(p => p.TransactionId).HasColumnName("transaction_id").HasMaxLength(100);
            e.Property(p => p.PurposeDetail).HasColumnName("purpose_detail").HasMaxLength(255);
            e.Property(p => p.ReceiptIssued).HasColumnName("receipt_issued");
            e.Property(p => p.Note).HasColumnName("note");
            e.Property(p => p.CreatedAt).HasColumnName("created_at");
        });

        // ── email_batches (발송 단위) ─────────────────────
        modelBuilder.Entity<EmailBatch>(e =>
        {
            e.ToTable("email_batches");
            e.HasIndex(b => b.CreatedAt);
            e.HasIndex(b => b.Kind);
            e.HasIndex(b => b.EventId);
            e.HasOne(b => b.Event).WithMany()
                .HasForeignKey(b => b.EventId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(b => b.Article).WithMany()
                .HasForeignKey(b => b.ArticleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(b => b.SentByMember).WithMany()
                .HasForeignKey(b => b.SentBy).OnDelete(DeleteBehavior.SetNull);
            e.Property(b => b.Id).HasColumnName("id");
            e.Property(b => b.Kind).HasColumnName("kind").HasMaxLength(30).HasConversion<string>();
            e.Property(b => b.Target).HasColumnName("target").HasMaxLength(20).HasConversion<string>();
            e.Property(b => b.EventId).HasColumnName("event_id");
            e.Property(b => b.ArticleId).HasColumnName("article_id");
            e.Property(b => b.Subject).HasColumnName("subject").HasMaxLength(300);
            e.Property(b => b.Body).HasColumnName("body");
            e.Property(b => b.RecipientCount).HasColumnName("recipient_count");
            e.Property(b => b.SuccessCount).HasColumnName("success_count");
            e.Property(b => b.FailureCount).HasColumnName("failure_count");
            e.Property(b => b.Status).HasColumnName("status").HasMaxLength(25).HasConversion<string>();
            e.Property(b => b.SentBy).HasColumnName("sent_by");
            e.Property(b => b.SentByName).HasColumnName("sent_by_name").HasMaxLength(100);
            e.Property(b => b.CreatedAt).HasColumnName("created_at");
            e.Property(b => b.CompletedAt).HasColumnName("completed_at");
        });

        // ── email_logs (수신자 단위) ──────────────────────
        modelBuilder.Entity<EmailLog>(e =>
        {
            e.ToTable("email_logs");
            e.HasIndex(l => l.BatchId);
            e.HasIndex(l => l.Status);
            e.HasIndex(l => l.ToEmail);
            e.HasOne(l => l.Batch).WithMany(b => b.Logs)
                .HasForeignKey(l => l.BatchId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Member).WithMany()
                .HasForeignKey(l => l.MemberId).OnDelete(DeleteBehavior.SetNull);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.BatchId).HasColumnName("batch_id");
            e.Property(l => l.MemberId).HasColumnName("member_id");
            e.Property(l => l.ToEmail).HasColumnName("to_email").HasMaxLength(200);
            e.Property(l => l.ToName).HasColumnName("to_name").HasMaxLength(100);
            e.Property(l => l.Status).HasColumnName("status").HasMaxLength(20).HasConversion<string>();
            e.Property(l => l.ErrorMessage).HasColumnName("error_message");
            e.Property(l => l.AttemptCount).HasColumnName("attempt_count");
            e.Property(l => l.SentAt).HasColumnName("sent_at");
            e.Property(l => l.CreatedAt).HasColumnName("created_at");
        });
    }
}
