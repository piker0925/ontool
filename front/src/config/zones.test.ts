import {describe, expect, it} from 'vitest'
import {ZONES, zoneOf} from './zones'

describe('ZONES', () => {
    it('구역은 dev/files/life/fun 4개, 이 순서대로 정의된다', () => {
        expect(ZONES.map(z => z.id)).toEqual(['dev', 'files', 'life', 'fun'])
    })

    it('각 구역은 표시명·라우트·액센트 토큰·설명을 갖는다', () => {
        for (const zone of ZONES) {
            expect(zone.name).toBeTruthy()
            expect(zone.route).toMatch(/^\//)
            expect(zone.accent).toBeTruthy()
            expect(zone.description).toBeTruthy()
        }
    })

    it('dev 구역의 라우트는 /dev, 표시명은 개발자 도구이다', () => {
        const dev = ZONES.find(z => z.id === 'dev')
        expect(dev?.route).toBe('/dev')
        expect(dev?.name).toBe('개발자 도구')
    })

    it('files 구역의 라우트는 /files, 표시명은 파일·문서이다', () => {
        const files = ZONES.find(z => z.id === 'files')
        expect(files?.route).toBe('/files')
        expect(files?.name).toBe('파일·문서')
    })

    it('life 구역의 라우트는 /life, 표시명은 생활 도구이다', () => {
        const life = ZONES.find(z => z.id === 'life')
        expect(life?.route).toBe('/life')
        expect(life?.name).toBe('생활 도구')
    })

    it('fun 구역의 라우트는 /fun, 표시명은 게임이다', () => {
        const fun = ZONES.find(z => z.id === 'fun')
        expect(fun?.route).toBe('/fun')
        expect(fun?.name).toBe('게임')
    })
})

describe('zoneOf', () => {
    it('유효한 zoneId가 주어지면 해당 구역을 반환한다', () => {
        expect(zoneOf('files').id).toBe('files')
    })

    it('undefined가 주어지면 기본 구역(ZONES[0])을 반환한다', () => {
        expect(zoneOf(undefined)).toBe(ZONES[0])
    })
})
