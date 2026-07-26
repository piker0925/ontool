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

describe('generateFakerKoRecords — 신규 필드', () => {
    it('나이는 1~99 범위의 정수 문자열이다', () => {
        const records = generateFakerKoRecords(200, {age: true})
        for (const record of records) {
            expect(record.age).toMatch(/^\d{1,2}$/)
            const n = Number(record.age)
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(99)
        }
    })

    it('성별은 남성 또는 여성 중 하나다', () => {
        const records = generateFakerKoRecords(100, {gender: true})
        for (const record of records) {
            expect(['남성', '여성']).toContain(record.gender)
        }
    })

    it('생년월일은 YYYY-MM-DD 형식이며 실제로 유효한 날짜다(윤년 2월 포함 롤오버 없음)', () => {
        const records = generateFakerKoRecords(300, {birthDate: true})
        for (const record of records) {
            expect(record.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            const [y, m, d] = record.birthDate!.split('-').map(Number)
            expect(y).toBeGreaterThanOrEqual(1940)
            expect(y).toBeLessThanOrEqual(new Date().getFullYear())
            const date = new Date(y, m - 1, d)
            // Date는 잘못된 날짜(예: 2월 30일)를 다음 달로 롤오버시키므로, 롤오버 여부로 유효성을 검증한다.
            expect(date.getFullYear()).toBe(y)
            expect(date.getMonth()).toBe(m - 1)
            expect(date.getDate()).toBe(d)
        }
    })

    it('직업은 비어있지 않은 문자열이다', () => {
        const records = generateFakerKoRecords(50, {job: true})
        for (const record of records) {
            expect(record.job).toBeTruthy()
            expect(typeof record.job).toBe('string')
        }
    })

    it('아이디는 영문 소문자로 시작하는 영숫자 문자열이며 최소 100개 샘플에서 중복이 0건이다', () => {
        const records = generateFakerKoRecords(100, {username: true})
        for (const record of records) {
            expect(record.username).toMatch(/^[a-z][a-z0-9]+$/)
        }
        const usernames = records.map(r => r.username)
        expect(new Set(usernames).size).toBe(100)
    })

    it('우편번호는 5자리 숫자다', () => {
        const records = generateFakerKoRecords(100, {zipCode: true})
        for (const record of records) {
            expect(record.zipCode).toMatch(/^\d{5}$/)
        }
    })

    it('선택하지 않은 필드는 레코드에 포함되지 않는다(신규 필드도 동일하게 동작)', () => {
        const records = generateFakerKoRecords(10, {zipCode: true})
        for (const record of records) {
            expect(Object.keys(record)).toEqual(['zipCode'])
        }
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
