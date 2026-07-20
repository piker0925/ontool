export type DocumentType = 'docx' | 'xlsx'

/** 파일명 확장자로 문서 뷰어가 처리할 수 있는 타입인지 판별한다. */
export function detectDocumentType(fileName: string): DocumentType | null {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'docx') return 'docx'
    if (ext === 'xlsx') return 'xlsx'
    return null
}
