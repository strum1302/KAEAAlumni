using KAEAAlumni.Domain.Common;

namespace KAEAAlumni.Domain.Entities;

// ── 행사 (events) ───────────────────────────────────────
public class Event : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime EventDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public decimal Fee { get; set; } = 0;
    public int MaxAttendees { get; set; } = 0;   // 0 = 무제한
    public bool IsActive { get; set; } = true;

    public ICollection<EventRsvp> Rsvps { get; set; } = new List<EventRsvp>();
    public ICollection<GalleryItem> GalleryItems { get; set; } = new List<GalleryItem>();
}
