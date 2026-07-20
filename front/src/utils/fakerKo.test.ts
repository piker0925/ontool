import {describe, expect, it} from 'vitest'
import {fakerKoToCsv, generateFakerKoRecords} from './fakerKo'

function parseCsv(csv: string): Record<string, string>[] {
    const [headerLine, ...rows] = csv.trim().split('\n')
    const headers = headerLine.split(',')
    return rows.map(row => {
        const cells = row.split(',')
        const record: Record<string, string> = {}
        headers.forEach((h, i) => (record[h] = cells[i]))
        return record
    })
}

describe('generateFakerKoRecords', () => {
    it('개수를 지정하면 정확히 그 개수만큼 레코드가 생성된다', () => {
        const records = generateFakerKoRecords(100, {name: true, phone: true, address: true, email: true, company: true})
        expect(records).toHaveLength(100)
    })

    it('전화번호는 010-XXXX-XXXX 형식, 이메일은 @를 포함한다', () => {
        const records = generateFakerKoRecords(100, {phone: true, email: true})
        for (const record of records) {
            expect(record.phone).toMatch(/^010-\d{4}-\d{4}$/)
            expect(record.email).toContain('@')
        }
    })

    it('선택하지 않은 필드는 레코드에 포함되지 않는다', () => {
        const records = generateFakerKoRecords(10, {name: true})
        for (const record of records) {
            expect(Object.keys(record)).toEqual(['name'])
        }
    })

    it('같은 실행에서 생성된 이름·전화번호는 최소 100개 샘플에서 중복이 0건이다', () => {
        const records = generateFakerKoRecords(100, {name: true, phone: true})
        const names = records.map(r => r.name)
        const phones = records.map(r => r.phone)
        expect(new Set(names).size).toBe(100)
        expect(new Set(phones).size).toBe(100)
    })

    it('500개처럼 사람이 손으로 만든 고정 목록으로는 감당하기 힘든 샘플 수에서도 이름이 전부 고유하다(고정 목록 순환이 아님을 방증)', () => {
        const records = generateFakerKoRecords(500, {name: true})
        const names = records.map(r => r.name)
        expect(new Set(names).size).toBe(500)
    })

    it('고유 조합 공간을 초과하는 개수를 요청하면 무한 루프 대신 명확한 에러를 던진다', () => {
        expect(() => generateFakerKoRecords(9000, {name: true})).toThrow()
    })
})

describe('fakerKoToCsv', () => {
    it('CSV 출력이 JSON(레코드 배열)과 동일한 필드 개수·값을 담는다', () => {
        const records = generateFakerKoRecords(20, {name: true, phone: true, email: true})
        const csv = fakerKoToCsv(records)
        const parsed = parseCsv(csv)

        expect(parsed).toHaveLength(records.length)
        parsed.forEach((row, i) => {
            expect(Object.keys(row)).toEqual(Object.keys(records[i]))
            expect(row.name).toBe(records[i].name)
            expect(row.phone).toBe(records[i].phone)
            expect(row.email).toBe(records[i].email)
        })
    })
})
