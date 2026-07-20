import {describe, expect, it} from 'vitest'
import * as XLSX from 'xlsx'
import {parseWorkbook} from './xlsxViewer'

function buildWorkbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
    const wb = XLSX.utils.book_new()
    for (const [name, rows] of Object.entries(sheets)) {
        const ws = XLSX.utils.aoa_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, name)
    }
    return XLSX.write(wb, {type: 'array', bookType: 'xlsx'})
}

describe('parseWorkbook', () => {
    it('시트 하나짜리 워크북의 시트명과 데이터를 그대로 읽는다', () => {
        const buffer = buildWorkbookBuffer({'Sheet1': [['이름', '나이'], ['철수', 20]]})

        const result = parseWorkbook(buffer)

        expect(result.sheetNames).toEqual(['Sheet1'])
        expect(result.sheets['Sheet1']).toEqual([['이름', '나이'], ['철수', 20]])
    })

    it('시트가 여러 개면 각 시트가 서로 다른 실제 데이터를 담고 있다 (첫 시트 반복 아님)', () => {
        const buffer = buildWorkbookBuffer({
            '매출': [['1월', 100], ['2월', 200]],
            '비용': [['1월', 50], ['2월', 60]],
        })

        const result = parseWorkbook(buffer)

        expect(result.sheetNames).toEqual(['매출', '비용'])
        expect(result.sheets['매출']).toEqual([['1월', 100], ['2월', 200]])
        expect(result.sheets['비용']).toEqual([['1월', 50], ['2월', 60]])
        expect(result.sheets['매출']).not.toEqual(result.sheets['비용'])
    })

    it('손상된 파일은 명확한 에러를 던진다', () => {
        const garbage = new Uint8Array([1, 2, 3, 4, 5]).buffer

        expect(() => parseWorkbook(garbage)).toThrow()
    })
})
