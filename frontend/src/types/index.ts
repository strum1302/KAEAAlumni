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
  emailVerified: boolean
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
export type ArticleCategory = 'NOTICE' | 'STORY' | 'FREE' | 'FELLOWSHIP' | 'HISTORY'

export interface ArticleList {
  id: string
  category: ArticleCategory
  title: string
  authorName: string
  authorId?: string
  viewCount: number
  commentCount: number
  likeCount: number
  createdAt: string
}

export interface ArticleComment {
  id: string
  articleId: string
  memberId: string
  authorName: string
  content: string
  createdAt: string
}

export interface ArticleDetail extends ArticleList {
  content: string
  galleryItems: GalleryItem[]
  likedByMe: boolean
  comments: ArticleComment[]
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
  showOnHome: boolean
  eventId?: string
  eventTitle?: string
  articleId?: string
  createdAt: string
  category?: string | null // 'SCHOOL_SONG' | 'CAMPUS' | null (행사와 무관한 항목만 해당)
}

// ── Payment ─────────────────────────────────────────────
export interface Payment {
  id: string
  paymentDate: string
  memberId: string
  memberName: string
  graduationInfo: string
  paymentType: 'MEMBERSHIP_FEE' | 'MEMBERSHIP_FEE_BOARD' | 'DONATION' | 'EVENT_FEE' | 'GENERAL'
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

// ── Email (발송 이력) ─────────────────────────────────────
export type EmailTarget = 'ALL' | 'RSVP' | 'NOT_RSVP'
export type EmailKind = 'EVENT_NOTIFY' | 'ARTICLE_NOTIFY' | 'SIGNUP_VERIFY' | 'NEW_MEMBER_ADMIN_NOTIFY' | 'PASSWORD_RESET' | 'MANUAL'

export interface EmailBatch {
  id: string
  kind: EmailKind
  target?: EmailTarget | null
  eventId?: string | null
  eventTitle?: string | null
  subject: string
  recipientCount: number
  successCount: number
  failureCount: number
  status: 'PENDING' | 'SENDING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS'
  sentByName?: string | null
  createdAt: string
  completedAt?: string | null
}

export interface EmailLog {
  id: string
  toEmail: string
  toName?: string | null
  status: 'PENDING' | 'SENT' | 'FAILED'
  errorMessage?: string | null
  sentAt?: string | null
}

// ── Common ─────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
