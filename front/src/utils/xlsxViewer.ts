import * as XLSX from 'xlsx'

export interface ParsedWorkbook {
    sheetNames: string[]
    sheets: Record<string, unknown[][]>
}

// xlsx는 ZIP 컨테이너(OOXML)라 로컬 파일 헤더 시그니처("PK\x03\x04")로 시작해야 한다.
// SheetJS는 이 시그니처가 없어도 예외 없이 임의 바이트를 셀 텍스트로 파싱해버리므로 직접 검증한다.
const ZIP_SIGNATURE = [0x50, 0x4B, 0x03, 0x04]

/** XLSX 워크북 바이너리를 파싱해 시트별 2차원 배열 데이터로 변환한다. */
export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
    const bytes = new Uint8Array(buffer)
    const isZip = ZIP_SIGNATURE.every((b, i) => bytes[i] === b)
    if (!isZip) {
        throw new Error('유효한 엑셀 파일이 아닙니다')
    }

    const wb = XLSX.read(buffer, {type: 'array'})
    if (wb.SheetNames.length === 0) {
        throw new Error('유효한 엑셀 파일이 아닙니다')
    }

    const sheets: Record<string, unknown[][]> = {}
    for (const name of wb.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {header: 1})
    }

    return {sheetNames: wb.SheetNames, sheets}
}
