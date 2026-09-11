using System.Text;
using KAEAAlumni.API.Middleware;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Railway 배포 시 포트 바인딩 ─────────────────────
// Railway는 컨테이너에 PORT 환경변수를 주입하고 그 포트로만 트래픽을 보냅니다.
// 로컬 개발(dotnet run)에서는 PORT가 없으므로 launchSettings.json의 5000번을 그대로 사용합니다.
var railwayPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(railwayPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{railwayPort}");
}

// ── Serilog ──────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/kaeaalumni-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// ── Database ─────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Authentication / JWT ─────────────────────────
var jwtKey = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT Secret not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────
// Frontend:Url 에 콤마(,)로 여러 origin을 넣을 수 있습니다.
// 예: "http://localhost:5173,https://kaeaalumni.vercel.app"
var allowedOrigins = (builder.Configuration["Frontend:Url"] ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── DI - Services ────────────────────────────────
builder.Services.AddScoped<IAuthService, KAEAAlumni.Infrastructure.Services.AuthService>();

// ── DI - Repositories ────────────────────────────
// 게시글 댓글/좋아요는 전용 인터페이스 없이 제네릭 IRepository<T>(기본 CRUD + FindAsync)만으로
// 충분해 open generic으로 등록 (ArticleComment/ArticleLike에 주입해서 사용).
builder.Services.AddScoped(typeof(IRepository<>), typeof(KAEAAlumni.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<IMemberRepository, KAEAAlumni.Infrastructure.Repositories.MemberRepository>();
builder.Services.AddScoped<IEventRepository, KAEAAlumni.Infrastructure.Repositories.EventRepository>();
builder.Services.AddScoped<IEventRsvpRepository, KAEAAlumni.Infrastructure.Repositories.EventRsvpRepository>();
builder.Services.AddScoped<IArticleRepository, KAEAAlumni.Infrastructure.Repositories.ArticleRepository>();
builder.Services.AddScoped<IGalleryItemRepository, KAEAAlumni.Infrastructure.Repositories.GalleryItemRepository>();
builder.Services.AddScoped<IPaymentRepository, KAEAAlumni.Infrastructure.Repositories.PaymentRepository>();
builder.Services.AddScoped<IEmailBatchRepository, KAEAAlumni.Infrastructure.Repositories.EmailBatchRepository>();

// ── DI - Email (Brevo REST API로 메일 발송) ────────────
// 큐는 프로세스 내 싱글턴(인메모리)이라 Railway가 재시작되면 대기 중이던 배치가 유실될 수 있음
// (테이블 status가 PENDING/SENDING으로 남으므로 관리자가 발송 내역 화면에서 확인/재시도 가능).
// 여러 인스턴스로 확장하면 DB 폴링 등 별도 큐로 교체 필요.
// IEmailSender 구현체로 SMTP(SmtpEmailSender) 대신 BrevoApiEmailSender를 등록한다 —
// Railway가 아웃바운드 SMTP 포트를 막고 있어 SMTP로는 계속 타임아웃이 났기 때문
// (BrevoApiEmailSender 주석 참고). HttpClient 발급을 위해 AddHttpClient()가 필요하다.
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IEmailQueue, KAEAAlumni.Infrastructure.Services.InMemoryEmailQueue>();
builder.Services.AddScoped<IEmailSender, KAEAAlumni.Infrastructure.Services.BrevoApiEmailSender>();
builder.Services.AddHostedService<KAEAAlumni.Infrastructure.Services.EmailDispatchService>();

// ── Swagger ───────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "KAEA Alumni API",
        Version = "v1",
        Description = "고려대학교 미중서부 교우회 (KU Chicago) Alumni Portal API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header. Example: Bearer {token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                    { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

// ── 응답 압축 ─────────────────────────────────────
// 사진/영상이 base64로 JSON 응답에 그대로 실려서 응답 크기가 큰 편이라(갤러리 목록 등),
// gzip 압축을 켜서 브라우저까지 전달되는 바이트 수를 줄인다. HTTPS에서도 압축되도록 명시.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[] { "application/json" });
});

var app = builder.Build();

// ── Auto Migration ────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ── Middleware Pipeline ───────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseResponseCompression();
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionMiddleware>();
app.UseRouting();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
