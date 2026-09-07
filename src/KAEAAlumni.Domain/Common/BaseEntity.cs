namespace KAEAAlumni.Domain.Common;

// db/schema.sql uses `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()` and a bare
// `created_at` column on every table (no updated_at / is_deleted columns), so the
// base entity mirrors that exactly.
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
