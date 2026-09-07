// ── Auth / Member ─────────────────────────────────────────
export type MemberRole = 'MEMBER' | 'YT' | 'OFFICER' | 'ADMIN'

export interface Member {
  id: string
  name: string
  email: string
  entryYear: number
  major: string
  degree: string
  cellPhone: string
  homePhone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state: string
  zipCode?: string
  bio?: string
  role: MemberRole
  officerTitle?: string
  photoUrl?: string | null
}

export interface Officer {
  id: string
  name: string
  entryYear: number
  major: string
  officerTitle: string
  photoUrl?: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  member: Member
}

// ── Event ───────────────────────────────────────────────
export interface EventList {
  id: string
  title: string
  eventDate: string
  location: string
  googleMapsUrl?: string | null
  fee: number
  maxAttendees: number
  currentAttendees: number
  isActive: boolean
}

export interface EventDetail extends EventList {
  description?: string
  photoCount: number
  videoCount: number
}

export interface EventRsvp {
  id: string
  guestName: string
  email: string
  cellPhone: string
  graduationInfo: string
  additionalGuests: number
  note?: string
  paymentStatus: string
  createdAt: string
}

// ── Article ─────────────────────────────────────────────
export type ArticleCategory = 'NOTICE' | 'STORY' | 'FELLOWSHIP' | 'HISTORY'

export interface ArticleList {
  id: string
  category: ArticleCategory
  title: string
  authorName: string
  viewCount: number
  createdAt: string
}

export interface ArticleDetail extends ArticleList {
  content: string
  galleryItems: GalleryItem[]
}

// ── Gallery ─────────────────────────────────────────────
export type MediaType = 'PHOTO' | 'VIDEO'

export interface GalleryItem {
  id: string
  title: string
  description?: string
  mediaType: MediaType
  mediaUrl: string
  thumbnailUrl?: string
  displayOrder: number
  eventId?: string
  eventTitle?: string
  articleId?: string
  createdAt: string
}

// ── Payment ─────────────────────────────────────────────
export interface Payment {
  id: string
  paymentDate: string
  memberId: string
  memberName: string
  graduationInfo: string
  paymentType: 'MEMBERSHIP_FEE' | 'DONATION' | 'EVENT_FEE'
  targetYear: number
  amount: number
  paymentMethod: string
  transactionId?: string
  purposeDetail?: string
  paymentStatus: string
  receiptIssued: boolean
}

export interface PaymentSummary {
  year: number
  totalAmount: number
  membershipFeeTotal: number
  donationTotal: number
  eventFeeTotal: number
}

// ── Common ─────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
