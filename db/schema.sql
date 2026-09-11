-- ==============================================================================
-- 고려대학교 미중서부 교우회 포털 (KU Chicago) 전체 통합 데이터베이스 스키마
-- 행사(events) 및 게시판(articles) 하부 미디어(사진/영상) 바인딩 지원
-- (원본: 제미나이 도움으로 생성된 DDL. 하단 "AUTH 확장" 섹션만 이 프로젝트에서 추가함)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 기존 테이블 초기화
DROP TABLE IF EXISTS gallery_items CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ------------------------------------------------------------------------------
-- 1. 동문 회원 테이블 (members)
-- ------------------------------------------------------------------------------
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,                 -- 교우 성명
    email VARCHAR(255) UNIQUE NOT NULL,         -- 이메일 (계정/통지)
    cell_phone VARCHAR(50) NOT NULL,            -- 휴대전화 (Cell Phone)
    home_phone VARCHAR(50),                     -- 일반/자택 전화 (Home Phone)
    address_line1 VARCHAR(255),                 -- 도로명 주소
    address_line2 VARCHAR(100),                 -- 상세 주소 (Apt/Unit)
    city VARCHAR(100),                          -- 도시
    state VARCHAR(50) DEFAULT 'IL',             -- 주 (State)
    zip_code VARCHAR(20),                       -- 우편번호 (Zip Code)
    entry_year INT NOT NULL,                    -- 학번 (예: 1983)
    major VARCHAR(100) NOT NULL,                -- 학과
    degree VARCHAR(50) DEFAULT '학사',           -- 학사/석사/박사
    role VARCHAR(30) DEFAULT 'MEMBER',          -- MEMBER, YT, OFFICER, ADMIN
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_members_entry_year ON members(entry_year);
CREATE INDEX idx_members_name ON members(name);

-- ------------------------------------------------------------------------------
-- 2. 행사 테이블 (events)
-- ------------------------------------------------------------------------------
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,                -- 행사명 (예: 2026년 하계 야유회)
    description TEXT,                           -- 행사 상세 안내
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,-- 행사 일시
    location VARCHAR(255) NOT NULL,             -- 행사 장소
    fee NUMERIC(10, 2) DEFAULT 0.00,            -- 참가비
    max_attendees INT DEFAULT 0,                -- 정원 (0: 무제한)
    is_active BOOLEAN DEFAULT TRUE,             -- 활성화 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_events_date ON events(event_date);

-- ------------------------------------------------------------------------------
-- 3. 행사 RSVP 참가 신청 테이블 (event_rsvps)
-- ------------------------------------------------------------------------------
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cell_phone VARCHAR(50) NOT NULL,
    graduation_info VARCHAR(100) NOT NULL,       -- 학번 및 학과
    additional_guests INT DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_rsvps_event_id ON event_rsvps(event_id);

-- ------------------------------------------------------------------------------
-- 4. 게시판 및 아카이브 테이블 (articles)
-- ------------------------------------------------------------------------------
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,              -- NOTICE, STORY, FREE, FELLOWSHIP, HISTORY
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_articles_category ON articles(category);

-- ------------------------------------------------------------------------------
-- 5. 갤러리 미디어 테이블 (gallery_items)
-- 핵심: event_id 및 article_id를 외래키로 두어 행사나 게시글 하부에 사진/영상을 종속 등록
-- ------------------------------------------------------------------------------
CREATE TABLE gallery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,       -- 특정 행사에 귀속 시 설정
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,   -- 특정 게시글에 귀속 시 설정

    title VARCHAR(255) NOT NULL,                -- 사진/영상 타이틀
    description TEXT,                           -- 설명
    media_type VARCHAR(20) NOT NULL,            -- 'PHOTO' 또는 'VIDEO'
    media_url TEXT NOT NULL,                    -- 이미지 원본 URL 또는 YouTube/MP4 재생 링크
    thumbnail_url TEXT,                         -- 영상 대표 썸네일 (선택)
    display_order INT DEFAULT 0,                -- 노출 순서 정렬용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_gallery_event_id ON gallery_items(event_id);
CREATE INDEX idx_gallery_article_id ON gallery_items(article_id);
CREATE INDEX idx_gallery_type ON gallery_items(media_type);

-- ------------------------------------------------------------------------------
-- 6. 회비 및 도네이션 수납 관리 테이블 (payments)
-- 연회비(MEMBERSHIP_FEE, $100), 연회비+이사회비(MEMBERSHIP_FEE_BOARD, $200),
-- 도네이션(DONATION), 행사비(EVENT_FEE) 관리
-- ------------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE, -- 납부 교우

    payment_type VARCHAR(50) NOT NULL,          -- MEMBERSHIP_FEE(연회비), MEMBERSHIP_FEE_BOARD(연회비+이사회비), DONATION(도네이션), EVENT_FEE(행사비)
    target_year INT NOT NULL,                   -- 납부 해당 연도 (예: 2026)
    amount NUMERIC(10, 2) NOT NULL,             -- 납부 금액 (USD)

    payment_method VARCHAR(30) NOT NULL,        -- ZELLE, VENMO, CHECK, CREDIT_CARD, CASH
    payment_status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED(완료), PENDING(확인중), CANCELLED(취소)
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,-- 실제 납부 일자

    transaction_id VARCHAR(100),                -- Zelle 확인번호 또는 수표 번호(Check No.)
    purpose_detail VARCHAR(255),                -- 후원 목적 세부 (예: 청년 교우 후원, 행사 후원금)
    receipt_issued BOOLEAN DEFAULT FALSE,       -- 기부금 영수증/감사증 발행 여부
    note TEXT,                                  -- 비고
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_year ON payments(target_year);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- ==============================================================================
-- AUTH 확장 (이 프로젝트에서 추가) ─────────────────────────────────────────────
-- 원본 스키마에는 로그인/비밀번호 관련 컬럼이 없습니다. ASP.NET Core Web API가
-- 자체 JWT 로그인(BCrypt 해시 + Refresh Token)을 처리하려면 아래 3개 컬럼이 필요해
-- members 테이블에 추가했습니다. Supabase Auth를 대신 사용할 경우 이 섹션은 생략하고
-- members.id를 auth.users.id와 매핑하는 방식으로 바꿀 수 있습니다.
-- ==============================================================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS refresh_token_expiry TIMESTAMP WITH TIME ZONE;

-- 임원진 조직도(교우회 소개 페이지)를 DB로 관리하기 위한 컬럼.
-- NULL이면 일반 회원, 값이 있으면 "회장"/"부회장"/"총무"/"회계"/"YT회장" 등 임원 직책으로 표시됩니다.
ALTER TABLE members ADD COLUMN IF NOT EXISTS officer_title VARCHAR(50);

-- 회원 등록 취소(soft delete)용 컬럼. 실제 행은 삭제하지 않고 false로만 바꿉니다.
-- false인 회원은 로그인이 차단되고, 기본 회원 목록/임원진 목록에서 제외됩니다.
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 프로필 사진. 별도 파일 스토리지 없이 관리자 페이지에서 업로드한 이미지를
-- (리사이즈 후) base64 data URL 형태로 그대로 저장합니다. NULL이면 사진 없음.
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 행사 장소의 구글맵 주소(또는 구글맵 링크). 관리자가 주소나 구글맵 URL을 직접 입력하면
-- 프론트엔드에서 "지도에서 보기" 링크로 표시됩니다. NULL이면 지도 링크 없음(장소명만 표시).
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- 갤러리 미디어의 홈페이지 노출 여부. false인 항목은 홈페이지 "최근 행사 미디어"/"고대 자료실"
-- 목록에서 제외되지만 갤러리 전체보기 페이지에는 계속 노출됩니다. 기존 데이터도 계속 보이도록
-- 기본값은 TRUE.
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT TRUE;

-- 행사와 무관한(event_id IS NULL) 갤러리 항목을 다시 세분화하기 위한 분류.
-- 'SCHOOL_SONG'(교가/응원가 등 기존 "고대 자료실" 자료), 'CAMPUS'(캠퍼스 사진, "학교 갤러리")
-- 중 하나이거나, 미분류 시 NULL(전체보기에서만 노출).
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS category VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_items(category);

-- 이 컬럼이 생기기 전에 등록된 "고대 자료실"(교가/응원가 등) 항목들을 SCHOOL_SONG으로
-- 명시적으로 표시합니다. 홈페이지의 "고대 자료실" 위젯이 이제 category='SCHOOL_SONG'
-- 기준으로 조회하므로, 이 백필이 없으면 기존 자료가 갑자기 안 보이게 됩니다.
UPDATE gallery_items SET category = 'SCHOOL_SONG' WHERE event_id IS NULL AND category IS NULL;

-- "학교 갤러리"(캠퍼스 사진) — 히어로 배너에 쓰지 않은 나머지 캠퍼스 사진 18장을 등록합니다.
-- media_url은 프론트엔드에 이미 정적 파일로 배포되어 있는 /images/hero/hero-NN.jpg를 그대로
-- 재사용합니다. media_url 기준으로 이미 등록된 항목은 건너뛰어 재실행해도 중복되지 않습니다.
INSERT INTO gallery_items (title, media_type, media_url, category, display_order, show_on_home)
SELECT v.title, v.media_type, v.media_url, v.category, v.display_order, v.show_on_home
FROM (VALUES
    ('캠퍼스 - 나뭇잎 사이로 보이는 시계탑', 'PHOTO', '/images/hero/hero-05.jpg', 'CAMPUS', 10, true),
    ('캠퍼스 - 잔디밭에서 바라본 시계탑', 'PHOTO', '/images/hero/hero-06.jpg', 'CAMPUS', 11, true),
    ('캠퍼스 - 야경 (본관 앞 광장)', 'PHOTO', '/images/hero/hero-08.jpg', 'CAMPUS', 12, true),
    ('캠퍼스 - 아치 너머로 보이는 시계탑 (노을)', 'PHOTO', '/images/hero/hero-10.jpg', 'CAMPUS', 13, true),
    ('캠퍼스 - 정문 아치', 'PHOTO', '/images/hero/hero-11.jpg', 'CAMPUS', 14, true),
    ('캠퍼스 - 졸업 시즌 거리 풍경', 'PHOTO', '/images/hero/hero-13.jpg', 'CAMPUS', 15, true),
    ('캠퍼스 - 나무 사이로 보이는 본관', 'PHOTO', '/images/hero/hero-14.jpg', 'CAMPUS', 16, true),
    ('캠퍼스 - 눈 오는 밤', 'PHOTO', '/images/hero/hero-15.jpg', 'CAMPUS', 17, true),
    ('캠퍼스 - 화창한 캠퍼스 거리', 'PHOTO', '/images/hero/hero-16.jpg', 'CAMPUS', 18, true),
    ('캠퍼스 - 졸업식, 붉은 현수막', 'PHOTO', '/images/hero/hero-17.jpg', 'CAMPUS', 19, true),
    ('캠퍼스 - 나뭇잎 사이 시계탑', 'PHOTO', '/images/hero/hero-18.jpg', 'CAMPUS', 20, true),
    ('캠퍼스 - 잔디밭 테이블과 본관', 'PHOTO', '/images/hero/hero-19.jpg', 'CAMPUS', 21, true),
    ('캠퍼스 - 호랑이 인형과 벚꽃', 'PHOTO', '/images/hero/hero-20.jpg', 'CAMPUS', 22, true),
    ('캠퍼스 - 졸업 인형(타이거)과 현수막', 'PHOTO', '/images/hero/hero-21.jpg', 'CAMPUS', 23, true),
    ('캠퍼스 - 응원단 (고연전)', 'PHOTO', '/images/hero/hero-23.jpg', 'CAMPUS', 24, true),
    ('캠퍼스 - 배롱나무 꽃과 아치', 'PHOTO', '/images/hero/hero-24.jpg', 'CAMPUS', 25, true),
    ('캠퍼스 - 계단과 배롱나무', 'PHOTO', '/images/hero/hero-25.jpg', 'CAMPUS', 26, true),
    ('캠퍼스 - 잔디밭에 앉은 학생들', 'PHOTO', '/images/hero/hero-27.jpg', 'CAMPUS', 27, true)
) AS v(title, media_type, media_url, category, display_order, show_on_home)
WHERE NOT EXISTS (SELECT 1 FROM gallery_items g WHERE g.media_url = v.media_url);

-- ------------------------------------------------------------------------------
-- 게시글 댓글 및 좋아요 확장 (자유게시판/우리 이야기 전용, 로그인 회원만 사용 가능)
-- ------------------------------------------------------------------------------
-- 작성자 회원 ID. 본인 글 수정/삭제 권한 판단에 사용. 이 컬럼 추가 이전에 작성된 글은 NULL.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,          -- 작성 시점 "이름 (입학연도 학과)" 스냅샷
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);

CREATE TABLE IF NOT EXISTS article_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, member_id)                -- 회원 1명당 게시글 1개에 좋아요 1개 (중복 방지, 토글용)
);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);

-- ------------------------------------------------------------------------------
-- 메일 발송 이력 (email_batches / email_logs)
-- 지금은 행사 공지(EVENT_NOTIFY) 발송에만 실제로 쓰이지만, 추후 게시글 알림/가입 인증/
-- 비밀번호 재설정 메일도 같은 구조로 이력을 남길 수 있도록 kind를 범용으로 둠.
-- 한 번의 발송 "행위"(배치)와 개별 수신자를 분리 — 배치 정보(제목/본문)가 수신자 수만큼
-- 중복 저장되는 것을 피하기 위함.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_batches (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- EVENT_NOTIFY / ARTICLE_NOTIFY / SIGNUP_VERIFY / PASSWORD_RESET / MANUAL
    kind              VARCHAR(30)  NOT NULL,
    -- 행사 공지 메일일 때만 사용: ALL / RSVP / NOT_RSVP
    target            VARCHAR(20),

    event_id          UUID REFERENCES events(id)   ON DELETE SET NULL,
    article_id        UUID REFERENCES articles(id) ON DELETE SET NULL,

    subject           VARCHAR(300) NOT NULL,
    body              TEXT         NOT NULL,

    recipient_count   INTEGER      NOT NULL DEFAULT 0,
    success_count     INTEGER      NOT NULL DEFAULT 0,
    failure_count     INTEGER      NOT NULL DEFAULT 0,

    -- PENDING / SENDING / COMPLETED / COMPLETED_WITH_ERRORS
    status            VARCHAR(25)  NOT NULL DEFAULT 'PENDING',

    -- 발송을 지시한 임원. 회원이 탈퇴해도 이력은 남기기 위해 이름을 함께 저장.
    sent_by           UUID REFERENCES members(id) ON DELETE SET NULL,
    sent_by_name      VARCHAR(100),

    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at      TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_email_batches_created_at ON email_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_batches_kind ON email_batches(kind);
CREATE INDEX IF NOT EXISTS idx_email_batches_event_id ON email_batches(event_id);

CREATE TABLE IF NOT EXISTS email_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id       UUID NOT NULL REFERENCES email_batches(id) ON DELETE CASCADE,

    -- 게스트 RSVP 수신자는 member_id가 NULL
    member_id      UUID REFERENCES members(id) ON DELETE SET NULL,

    to_email       VARCHAR(200) NOT NULL,
    to_name        VARCHAR(100),

    -- PENDING / SENT / FAILED
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    error_message  TEXT,
    attempt_count  INTEGER      NOT NULL DEFAULT 0,

    sent_at        TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_batch_id ON email_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);

-- 참고) 이번 달 누적 발송 건수 확인 — 관리자 화면의 "이번 달 누적 발송" 위젯이 사용하는 것과 동일한 조회.
-- SELECT COUNT(*) FROM email_logs WHERE status = 'SENT' AND sent_at >= date_trunc('month', NOW());

-- 참고) 1년 지난 개별 로그 정리 — 배치 요약(email_batches)은 남기고 로그만 삭제.
-- Supabase 무료 티어 용량 관리를 위해 연 1회 정도 수동 실행 권장.
-- DELETE FROM email_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- ------------------------------------------------------------------------------
-- 7. 테스트용 시드 데이터 (Seed Data)
-- ------------------------------------------------------------------------------
-- 관리자 계정 (비밀번호: Admin1234! — 최초 로그인 후 반드시 변경하세요)
-- password_hash는 BCrypt.Net.BCrypt.HashPassword("Admin1234!") 결과로 앱 최초 구동 시 직접 교체하세요.
INSERT INTO members (id, name, email, cell_phone, entry_year, major, degree, role)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    '관리자',
    'admin@kuchicago.org',
    '000-000-0000',
    2000,
    '전산학과',
    '학사',
    'ADMIN'
);

-- 2026년 하계 야유회 행사 등록
INSERT INTO events (id, title, description, event_date, location, fee, is_active)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '2026년 고려대학교 교우회 하계 야유회',
    '가족들과 함께하는 연례 시카고 북부 삼림공원 야유회 및 바베큐 행사입니다.',
    '2026-08-01 11:00:00-05',
    'Northbrook Forest Preserve, IL',
    20.00,
    true
);

-- 야유회 행사 하부에 사진 및 영상 등록
INSERT INTO gallery_items (event_id, title, description, media_type, media_url, display_order)
VALUES
('a1111111-1111-1111-1111-111111111111', '하계 야유회 단체 기념 사진', '야유회 잔디광장 전경', 'PHOTO', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80', 1),
('a1111111-1111-1111-1111-111111111111', '하계 야유회 응원가 합창 영상', '교가 및 석탑제 응원 실황 영상', 'VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2);

-- 수납 통계 테스트 시드 데이터
INSERT INTO payments (member_id, payment_type, target_year, amount, payment_method, payment_status, payment_date, transaction_id, purpose_detail, receipt_issued)
VALUES
('b0000000-0000-0000-0000-000000000001', 'MEMBERSHIP_FEE', 2026, 100.00, 'ZELLE', 'COMPLETED', '2026-01-15', 'ZEL-982341', '2026년 정기 연회비', true),
('b0000000-0000-0000-0000-000000000001', 'DONATION', 2026, 500.00, 'CHECK', 'COMPLETED', '2026-02-10', 'CHK-1052', '미중서부 고대 후원금', true);
