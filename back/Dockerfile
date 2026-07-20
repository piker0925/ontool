FROM eclipse-temurin:25-jre-noble
WORKDIR /app

# 영상 모듈(037)이 ffmpeg/ffprobe를 PATH에서 찾는다 — Noble(Ubuntu) apt 패키지는 arm64/amd64 공용.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 오피스 문서 변환기(094, ADR-0029)가 soffice를 PATH에서 찾는다.
# 전체 슈트 대신 필요한 컴포넌트만 설치해 이미지 용량을 줄인다(Draw/Math/Base 등 제외).
# fonts-noto-cjk 없이는 한글 텍스트가 PDF에서 대체 글리프로 깨져 나온다(TDD 중 실제로 발견한 문제).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-calc libreoffice-impress libreoffice-java-common \
    fonts-noto-cjk curl \
    && rm -rf /var/lib/apt/lists/*

# H2Orestart 확장(HWP/HWPX 임포트, ebandal/H2Orestart) — LibreOffice 자체는 이 포맷을 못 읽는다.
RUN curl -fsSL -o /tmp/H2Orestart.oxt \
    https://github.com/ebandal/H2Orestart/releases/download/v0.7.13/H2Orestart.oxt \
    && unopkg add --shared /tmp/H2Orestart.oxt \
    && rm -f /tmp/H2Orestart.oxt

# --home /app 미지정 시 spring 유저 홈이 /nonexistent가 되어, LibreOffice(H2Orestart 내부 로거·dconf·
# fontconfig 캐시)가 홈 밑에 쓰려다 Permission denied로 stderr에 노이즈를 남긴다(변환 자체는 실패하지
# 않지만 로그가 지저분해짐 — 094 TDD 중 실제로 발견).
RUN addgroup --system spring && adduser --system --ingroup spring --home /app spring \
    && mkdir -p /app/uploads && chown -R spring:spring /app

USER spring

COPY app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
