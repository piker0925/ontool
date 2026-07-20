FROM eclipse-temurin:25-jre-noble
WORKDIR /app

# 영상 모듈(037)이 ffmpeg/ffprobe를 PATH에서 찾는다 — Noble(Ubuntu) apt 패키지는 arm64/amd64 공용.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system spring && adduser --system --ingroup spring spring \
    && mkdir -p /app/uploads && chown -R spring:spring /app/uploads

USER spring

COPY app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
