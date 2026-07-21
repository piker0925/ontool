// 한도는 서버가 /api/v1/modules로 모듈별(레인별)로 내려준다(106) — 여기서 하드코딩하지 않는다.
// 값이 없으면(0 이하, 모듈 정보 로딩 전 등) 클라이언트 사전검증을 건너뛴다 — 서버 쪽 검증이 최종 방어선이다.

function formatMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1)
}

export function isOversizedFile(file: File, maxFileSizeBytes: number): boolean {
    return maxFileSizeBytes > 0 && file.size > maxFileSizeBytes
}

export function oversizedFileMessage(file: File, maxFileSizeBytes: number): string {
    return `"${file.name}"(${formatMb(file.size)}MB)이 업로드 최대 크기(${formatMb(maxFileSizeBytes)}MB)를 초과합니다. 더 작은 파일로 시도해 주세요.`
}
