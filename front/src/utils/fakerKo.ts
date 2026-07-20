export interface FakerKoFieldSet {
    name?: boolean
    phone?: boolean
    address?: boolean
    email?: boolean
    company?: boolean
}

export interface FakerKoRecord {
    name?: string
    phone?: string
    address?: string
    email?: string
    company?: string
}

export const FAKER_KO_FIELD_ORDER: (keyof FakerKoFieldSet)[] = ['name', 'phone', 'address', 'email', 'company']

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전']
const GIVEN_SYLLABLE_1 = ['민', '서', '지', '현', '준', '수', '유', '도', '예', '하', '재', '은', '별', '태', '우', '소', '나', '다', '건', '온']
const GIVEN_SYLLABLE_2 = ['준', '아', '우', '연', '진', '호', '빈', '율', '경', '원', '영', '훈', '주', '린', '결', '겸', '람', '솔', '별', '강']

const PROVINCES = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '경기도', '강원특별자치도']
const DISTRICTS = ['강남구', '서초구', '마포구', '종로구', '해운대구', '수성구', '연수구', '유성구', '분당구', '일산동구']
const STREET_SUFFIXES = ['로', '길']

const EMAIL_DOMAINS = ['naver.com', 'gmail.com', 'daum.net', 'kakao.com']

const COMPANY_PREFIXES = ['한빛', '미래', '그린', '스마트', '넥스트', '온새미', '푸른', '하늘', '별빛', '드림']
const COMPANY_SUFFIXES = ['테크', '시스템즈', '소프트', '솔루션즈', '네트웍스', '이노베이션', '랩스']

function pick<T>(pool: T[]): T {
    return pool[Math.floor(Math.random() * pool.length)]
}

function randomDigits(length: number): string {
    let out = ''
    for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10)
    return out
}

function randomAlphaNum(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let out = ''
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

const MAX_UNIQUE_RETRIES = 1000

function uniqueValue(generate: () => string, used: Set<string>): string {
    let value = generate()
    let retries = 0
    while (used.has(value)) {
        if (++retries > MAX_UNIQUE_RETRIES) {
            throw new Error('고유한 값을 생성할 수 없습니다 — 요청한 개수가 너무 많습니다.')
        }
        value = generate()
    }
    used.add(value)
    return value
}

function generateName(): string {
    return `${pick(SURNAMES)}${pick(GIVEN_SYLLABLE_1)}${pick(GIVEN_SYLLABLE_2)}`
}

function generatePhone(): string {
    return `010-${randomDigits(4)}-${randomDigits(4)}`
}

function generateAddress(): string {
    const buildingNumber = Math.floor(Math.random() * 200) + 1
    return `${pick(PROVINCES)} ${pick(DISTRICTS)} ${pick(GIVEN_SYLLABLE_1)}${pick(STREET_SUFFIXES)} ${buildingNumber}`
}

function generateEmail(): string {
    return `${randomAlphaNum(8)}@${pick(EMAIL_DOMAINS)}`
}

function generateCompany(): string {
    return `${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)}`
}

export function generateFakerKoRecords(count: number, fields: FakerKoFieldSet): FakerKoRecord[] {
    const usedNames = new Set<string>()
    const usedPhones = new Set<string>()
    const usedEmails = new Set<string>()

    const records: FakerKoRecord[] = []
    for (let i = 0; i < count; i++) {
        const record: FakerKoRecord = {}
        if (fields.name) record.name = uniqueValue(generateName, usedNames)
        if (fields.phone) record.phone = uniqueValue(generatePhone, usedPhones)
        if (fields.address) record.address = generateAddress()
        if (fields.email) record.email = uniqueValue(generateEmail, usedEmails)
        if (fields.company) record.company = generateCompany()
        records.push(record)
    }
    return records
}

export function fakerKoToCsv(records: FakerKoRecord[]): string {
    if (records.length === 0) return ''
    const fields = FAKER_KO_FIELD_ORDER.filter(field => field in records[0])
    const header = fields.join(',')
    const rows = records.map(record => fields.map(field => record[field] ?? '').join(','))
    return [header, ...rows].join('\n')
}
