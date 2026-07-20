import {describe, expect, it} from 'vitest'
import {MOCK_MODULES} from './mock'
import {ZONES} from '../config/zones'

describe('MOCK_MODULES', () => {
    it('GIF 생성 모듈의 id는 백엔드 GifModule.getId()와 동일한 gif-create여야 한다', () => {
        const gif = MOCK_MODULES.find(m => m.name === 'GIF 생성')
        expect(gif?.id).toBe('gif-create')
    })

    const validZoneIds = ZONES.map(z => z.id)

    it('모든 모듈이 zones를 1개 이상 갖는다', () => {
        const missing = MOCK_MODULES.filter(m => m.zones.length === 0).map(m => m.id)
        expect(missing).toEqual([])
    })

    it('모든 zones 값은 유효한 ZoneId이다 (오타 방지)', () => {
        const invalid = MOCK_MODULES.flatMap(m => m.zones)
            .filter(z => !validZoneIds.includes(z))
        expect(invalid).toEqual([])
    })

    it('PDF·이미지 카테고리 모듈은 files 구역을 포함한다', () => {
        const filesCategoryModules = MOCK_MODULES.filter(m => m.category === 'PDF' || m.category === '이미지')
        for (const m of filesCategoryModules) {
            expect(m.zones).toContain('files')
        }
    })

    it('포맷터·보안·암호화·텍스트·네트워크·DevOps·생성기 카테고리 모듈은 dev 구역을 포함한다', () => {
        const devCategories = ['포맷터', '보안·암호화', '텍스트', '네트워크', 'DevOps', '생성기']
        const devCategoryModules = MOCK_MODULES.filter(m => devCategories.includes(m.category))
        for (const m of devCategoryModules) {
            expect(m.zones).toContain('dev')
        }
    })

    it('kind가 game인 모듈은 fun 구역을 포함한다 (ADR-0026)', () => {
        const games = MOCK_MODULES.filter(m => m.kind === 'game')
        expect(games.length).toBeGreaterThan(0)
        for (const m of games) {
            expect(m.zones).toContain('fun')
        }
    })
})
