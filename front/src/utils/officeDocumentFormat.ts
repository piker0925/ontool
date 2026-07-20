export type OfficeDocumentFormat = 'hwp' | 'hwpx' | 'pptx' | 'ppt' | 'doc' | 'xls'

const LABELS: Record<OfficeDocumentFormat, string> = {
    hwp: 'HWP', hwpx: 'HWPX', pptx: 'PPTX', ppt: 'PPT', doc: 'DOC', xls: 'XLS',
}

/** 파일명 확장자로 오피스 문서 변환기가 처리할 수 있는 포맷인지 판별한다. */
export function detectOfficeFormat(fileName: string): OfficeDocumentFormat | null {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'hwp' || ext === 'hwpx' || ext === 'pptx' || ext === 'ppt' || ext === 'doc' || ext === 'xls') {
        return ext
    }
    return null
}

export function officeFormatLabel(format: OfficeDocumentFormat): string {
    return LABELS[format]
}
