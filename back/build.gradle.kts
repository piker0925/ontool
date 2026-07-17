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

tasks.jacocoTestReport {
	dependsOn(tasks.test)
	reports {
		html.required = true
		xml.required = true
	}
}

tasks.jacocoTestCoverageVerification {
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
