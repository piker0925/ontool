// 업로드 실패를 사용자용 메시지로 변환한다. 여러 업로드 경로(FileUploader, 텍스트-파일 업로드)가 공유한다.
// 크기 초과(413)는 프록시가 자르면 JSON 바디가 없을 수 있으므로 body의 code가 아니라 HTTP status로 구분한다.
export function uploadErrorMessage(e: unknown): string {
    const err = e as { response?: { status?: number; data?: { message?: string } | string } }
    const status = err.response?.status
    const data = err.response?.data
    const serverMessage = data && typeof data === 'object' ? data.message : undefined

    if (status === 413) {
        return serverMessage ?? '파일 크기가 제한을 초과합니다. 더 작은 파일로 시도해 주세요.'
    }
    if (status === 429) {
        return serverMessage ?? '동시에 처리 중인 작업이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    }
    return serverMessage ?? '업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}
