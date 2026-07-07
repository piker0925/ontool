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

	// DB
	runtimeOnly("com.mysql:mysql-connector-j")

	// Lombok
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// PDF (openhtmltopdf 1.0.10 requires pdfbox 2.x)
	implementation("org.apache.pdfbox:pdfbox:2.0.31")
	implementation("com.vladsch.flexmark:flexmark-all:0.64.8")
	implementation("com.openhtmltopdf:openhtmltopdf-pdfbox:1.0.10")

	// Image
	implementation("net.coobird:thumbnailator:0.4.20")

	// QR / Barcode
	implementation("com.google.zxing:core:3.5.3")
	implementation("com.google.zxing:javase:3.5.3")

	// Security — BouncyCastle (RSA/EC key pair, PEM)
	implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
	implementation("org.bouncycastle:bcpkix-jdk18on:1.78.1")

	// Code generation
	implementation("org.jsonschema2pojo:jsonschema2pojo-core:1.2.1")
	implementation("org.openapitools:openapi-generator:7.5.0") {
		exclude(group = "org.slf4j", module = "slf4j-simple")
	}

	// Formatter
	implementation("com.github.jsqlparser:jsqlparser:4.9")
	implementation("org.apache.commons:commons-text:1.11.0")

	// Converter
	implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml")
	implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")
	implementation("com.moandjiezana.toml:toml4j:0.7.2")
	implementation("org.apache.commons:commons-csv:1.11.0")

	// Text
	implementation("com.google.guava:guava")
	implementation("io.github.java-diff-utils:java-diff-utils:4.12")

	// Security util
	implementation("com.eatthepath:java-otp:0.4.0")

	// DevOps
	implementation("com.cronutils:cron-utils:9.2.1")

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
