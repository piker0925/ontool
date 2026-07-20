plugins {
	java
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
	jacoco
}

group = "com"
version = "0.0.1-SNAPSHOT"
description = "back"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// Spring Boot
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-client")

	// JWT (access 토큰 발급/검증 — refresh 토큰은 opaque 랜덤 문자열로 별도 관리, ADR-0024)
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

	// DB
	runtimeOnly("com.mysql:mysql-connector-j")
	// Spring Boot 4 모듈화로 flyway-mysql만으로는 자동 설정이 붙지 않는다 — starter가 autoconfigure 모듈을 가져온다.
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.flywaydb:flyway-mysql")

	// Lombok
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// PDF (openhtmltopdf 1.0.10 requires pdfbox 2.x)
	implementation("org.apache.pdfbox:pdfbox:2.0.31")
	implementation("com.vladsch.flexmark:flexmark-all:0.64.8")
	implementation("com.openhtmltopdf:openhtmltopdf-pdfbox:1.0.10")

	// Image
	implementation("net.coobird:thumbnailator:0.4.20")
	implementation("com.drewnoakes:metadata-extractor:2.19.0")
	// ImageIO 플러그인 확장 — javax.imageio.* 서비스 등록 방식이라 ImageIO.read/write를 쓰는
	// 기존 코드는 수정 없이 새 포맷을 인식한다. WebP는 읽기만 가능(TwelveMonkeys 자체가 쓰기 미지원),
	// TIFF는 읽기·쓰기 모두 가능. JPEG 플러그인은 JDK 기본 리더보다 다양한 변형(CMYK 등)을 더 안정적으로 읽는다.
	implementation("com.twelvemonkeys.imageio:imageio-webp:3.14.0")
	implementation("com.twelvemonkeys.imageio:imageio-tiff:3.14.0")
	implementation("com.twelvemonkeys.imageio:imageio-jpeg:3.14.0")

	// QR / Barcode
	implementation("com.google.zxing:core:3.5.3")
	implementation("com.google.zxing:javase:3.5.3")

	// Security — BouncyCastle (RSA/EC key pair, PEM)
	implementation("org.bouncycastle:bcprov-jdk18on:1.80")
	implementation("org.bouncycastle:bcpkix-jdk18on:1.80")

	// Code generation
	implementation("org.jsonschema2pojo:jsonschema2pojo-core:1.2.2")
	implementation("org.openapitools:openapi-generator:7.5.0") {
		exclude(group = "org.slf4j", module = "slf4j-simple")
	}

	// Formatter
	implementation("com.github.jsqlparser:jsqlparser:4.9")

	// Converter
	implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml")
	implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")
	implementation("com.moandjiezana.toml:toml4j:0.7.2")
	implementation("org.apache.commons:commons-csv:1.11.0")

	// Text
	implementation("com.google.guava:guava")

	// Monitoring
	implementation("org.springframework.boot:spring-boot-starter-actuator")

	// API Docs
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.9")

	// Test
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-mysql")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.awaitility:awaitility:4.2.2")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
	finalizedBy(tasks.jacocoTestReport)
}

// 커버리지 리포트에서 제외하는 클래스 — "테스트가 없다"가 아니라 "이 방식으로는 측정 자체가 안 된다"는
// 뜻이라 여기 남긴다. 패키지 와일드카드가 아니라 클래스를 하나씩 나열한다 — tool/network 패키지에는
// HtmlFetchModule처럼 실제로 미검증 분기가 있는 클래스도 있어서, 와일드카드를 쓰면 그런 진짜 공백까지
// 같이 가려진다.
val jacocoExcludes = listOf(
	// main()은 모든 @SpringBootTest가 부트스트랩 과정에서 암묵적으로 검증한다 — 스프링 부트 관례상
	// main() 자체를 직접 호출하는 테스트는 두지 않는다.
	"com/back/BackApplication.class",
	// DnsPinning*은 DnsPinningTest·DnsPinningResolverProviderTest로 실제 검증되고 통과한다. 하지만
	// JEP 418 DNS 리졸버 SPI라 JVM 부트스트랩 단계에서 ServiceLoader가 로드하는데, 이 로딩 경로가
	// JaCoCo 에이전트의 계측 타이밍을 벗어나 실행 카운터가 항상 0으로 잡힌다(도구의 구조적 한계).
	"com/back/tool/network/DnsPinning.class",
	"com/back/tool/network/DnsPinningResolverProvider.class",
	"com/back/tool/network/DnsPinningResolverProvider\$1.class",
)

tasks.jacocoTestReport {
	dependsOn(tasks.test)
	reports {
		html.required = true
		xml.required = true
	}
	classDirectories.setFrom(classDirectories.files.map { fileTree(it) { exclude(jacocoExcludes) } })
}

tasks.jacocoTestCoverageVerification {
	classDirectories.setFrom(classDirectories.files.map { fileTree(it) { exclude(jacocoExcludes) } })
	violationRules {
		rule {
			limit {
				minimum = "0.80".toBigDecimal()
			}
		}
	}
}

tasks.check {
	dependsOn(tasks.jacocoTestCoverageVerification)
}

// 로컬 .env(gitignore 대상, 구글·카카오 client-id/secret) 주입은 이제 Gradle bootRun 태스크가 아니라
// com.back.global.config.DotenvEnvironmentPostProcessor가 Spring Boot 부트스트랩 단계에서 담당한다 —
// IntelliJ 내장 러너·java -jar 등 실행 방식과 무관하게 동작하도록 하기 위함.
