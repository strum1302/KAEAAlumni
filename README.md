# 🐯 KAEA Alumni — 고려대학교 미중서부 교우회 (KU Chicago)

고려대학교 미중서부 교우회 포털. Google Docs 기획 문서(제1~5장)와
KPickleball(strum1302/KPickleball) 프로젝트의 아키텍처를 기반으로 제작되었습니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | ASP.NET Core 8 Web API |
| Database | PostgreSQL 16 (Supabase) |
| ORM | Entity Framework Core 8 + Npgsql |
| Auth | JWT Bearer (BCrypt 해시 + Refresh Token) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (고려대 크림슨 #860038 테마) |
| State | Zustand + TanStack Query |
| Media | YouTube 임베드 (영상), Supabase Storage 권장 (사진) |

---

## 프로젝트 구조

```
KAEAAlumni/
├── src/
│   ├── KAEAAlumni.API             # ASP.NET Core Web API (Controllers, Program.cs)
│   ├── KAEAAlumni.Application     # DTOs, Interfaces
│   ├── KAEAAlumni.Domain          # Entities, Enums
│   └── KAEAAlumni.Infrastructure  # EF Core DbContext, Repositories, AuthService
├── tests/
│   └── KAEAAlumni.Tests
├── db/
│   └── schema.sql                 # Supabase/PostgreSQL 통합 DDL (+ Auth 확장 컬럼)
├── frontend/                      # React + TypeScript + Vite + Tailwind
└── KAEAAlumni.sln
```

이 구조와 계층 분리(Domain/Application/Infrastructure/API), Program.cs의 JWT·CORS·Swagger·Serilog
구성, 프론트엔드의 Zustand 인증 스토어·axios 인터셉터·React Router 레이아웃 패턴은
KPickleball 프로젝트와 동일한 방식을 따릅니다.

---

## 정보 구조 (IA)

1. 홈 (Home) — 히어로 배너, 다가오는 행사 카드, 최근 미디어 하이라이트, 공지/이야기 피드
2. 교우회 소개 (About) — 인사말/연혁, 임원진, 교가 아카이브
3. 행사 및 모임 (Events) — 목록/캘린더, 상세 페이지(RSVP + 하부 사진/영상 갤러리)
4. 미디어 갤러리 (Gallery) — 전체/사진/영상 필터, 행사별 앨범
5. 커뮤니티 (Community) — 공지사항(Notice) / 우리 이야기(Story) / 후원(Fellowship)
6. 교우 명부 등록 (Join) — 신입 교우 등록 (Cell/Home Phone 분리, 미국 주소 체계)
7. 회비 및 후원 (Giving & Admin) — 납부 안내, 수납/도네이션 대시보드

## 권한 체계 (role)

| 코드 | 명칭 | 비고 |
|------|------|------|
| GUEST | 비회원 | 로그인 안 함 — 읽기 전용 + 비회원 RSVP |
| MEMBER | 일반 정회원 | 기본값. RSVP 간편 신청, 커뮤니티 글 작성 |
| YT | Young Tigers (청년 교우) | MEMBER 권한 + 청년 전용 섹션 |
| OFFICER | 임원진 | 행사/공지/갤러리 작성·관리, RSVP 명단 조회 |
| ADMIN | 시스템 관리자 | 회비/도네이션 대시보드, 회원 권한 변경, 전체 관리 |

---

## 시작하기

### 1. DB 스키마 적용 (Supabase SQL Editor)
`db/schema.sql`을 Supabase SQL Editor에서 실행합니다. (원본 DDL + Auth 확장 컬럼 포함)

### 2. 백엔드 실행
```bash
cd src/KAEAAlumni.API
# appsettings.json 의 ConnectionStrings:DefaultConnection, Jwt:Secret 을
# 실제 값으로 교체하세요 (플레이스홀더 상태로는 실행되지 않습니다).
dotnet restore
dotnet run
# → http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

### 3. 프론트엔드 실행
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

---

## 환경 변수 설정

### Backend (appsettings.json)
| 키 | 설명 |
|----|------|
| `ConnectionStrings:DefaultConnection` | Supabase PostgreSQL 연결 문자열 |
| `Jwt:Secret` | 최소 32자 이상의 임의 문자열 |

### Frontend (.env)
| 키 | 설명 |
|----|------|
| `VITE_API_URL` | 백엔드 API 주소 (기본: /api, Vite 프록시 사용) |

---

## API 엔드포인트 (주요)

| Method | URL | 설명 | Auth |
|--------|-----|------|------|
| POST | /api/auth/register | 신입 교우 명부 등록 | - |
| POST | /api/auth/login | 로그인 | - |
| GET | /api/events | 행사 목록 | - |
| GET | /api/events/{id} | 행사 상세 | - |
| POST | /api/events/{id}/rsvps | 참가 신청 (RSVP) | - (비회원 가능) |
| GET | /api/events/{id}/rsvps | 참가자 명단 | Officer/Admin |
| GET | /api/articles?category=NOTICE | 공지/이야기/후원/연혁 | - |
| GET | /api/gallery?mediaType=PHOTO | 갤러리 (사진/영상 필터) | - |
| POST | /api/gallery | 미디어 등록 | Officer/Admin |
| GET | /api/payments | 수납 내역 | Officer/Admin |
| GET | /api/payments/summary?year=2026 | 연도별 집계 | Officer/Admin |
| POST | /api/payments | 수납 등록 | Admin |
| PUT | /api/members/{id}/role | 회원 권한 변경 | Admin |

전체 API 문서: http://localhost:5000/swagger

---

## 참고 문서

- 기획 문서: Google Docs "제1장. 프로젝트 개요 및 전략" ~ "제5장. 구현 및 배포 가이드"
- 기준 아키텍처: `strum1302/KPickleball` (동일 개발자의 이전 프로젝트, ASP.NET Core 8 + React/Vite/TS/Tailwind Clean Architecture)
