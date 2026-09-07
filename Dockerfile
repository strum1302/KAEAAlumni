# KAEAAlumni.API 배포용 Dockerfile
# 이 저장소는 backend(src/) + frontend(frontend/) 가 같이 있는 모노레포라서,
# Railway의 자동 빌드 감지(Railpack)가 어떤 프로젝트를 빌드해야 할지 판단하지 못합니다.
# Dockerfile을 두면 Railway가 이 파일을 우선 사용해서, 정확히 backend API만 빌드합니다.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# src/ 아래 4개 프로젝트(API, Application, Domain, Infrastructure)를 그대로 복사
# (ProjectReference 상대경로 ..\Sibling\Sibling.csproj 가 깨지지 않도록 폴더 구조 유지)
COPY src/ ./src/

RUN dotnet publish src/KAEAAlumni.API/KAEAAlumni.API.csproj -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/out .

ENTRYPOINT ["dotnet", "KAEAAlumni.API.dll"]
