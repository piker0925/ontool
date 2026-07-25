import {describe, expect, it} from 'vitest'
import {moduleCanFail, normalizeApiModules} from './modules'
import type {Module} from '../types'

describe('normalizeApiModules', () => {
    it('백엔드 응답에 zones가 없으면 MOCK_MODULES 메타에서 채운다', () => {
        const backendShaped: Module[] = [
            // 백엔드는 zones를 모른다 — Module 타입상 필수이지만 실제 API 응답엔 없는 필드라
            // 백엔드 원시 응답 형태를 흉내내기 위해 캐스팅으로 필드를 생략한다.
            {id: 'bcrypt', name: 'Bcrypt 해시', category: 'security', isHeavy: false} as unknown as Module,
        ]

        const result = normalizeApiModules(backendShaped)

        const bcrypt = result.find(m => m.id === 'bcrypt')
        expect(bcrypt?.zones).toEqual(['dev'])
    })

    it('백엔드 응답이 이미 zones를 갖고 있으면 그 값을 유지한다', () => {
        const backendShaped: Module[] = [
            {id: 'bcrypt', name: 'Bcrypt 해시', category: 'security', isHeavy: false, zones: ['dev', 'files']},
        ]

        const result = normalizeApiModules(backendShaped)

        expect(result.find(m => m.id === 'bcrypt')?.zones).toEqual(['dev', 'files'])
    })

    it('frontendOnly 모듈은 MOCK_MODULES에 정의된 zones를 그대로 갖는다', () => {
        const result = normalizeApiModules([])

        const uuid = result.find(m => m.id === 'uuid')
        expect(uuid?.zones).toEqual(['dev'])
    })
})

describe('moduleCanFail', () => {
    // 161: 관리자 통계 탭 "모듈별 실패율 랭킹" 전용 — 백엔드 failCount는 저장 카운터가 아니라
    // job 테이블에서 status=FAILED로 실시간 집계되므로, 실제로 Job을 만들어 백엔드 큐를 타는
    // 도구만 0이 아닌 값을 가질 수 있다.
    it('Heavy 도구(isHeavy=true)는 true다', () => {
        expect(moduleCanFail('pdf-merge')).toBe(true)
    })

    it('isFrontendOnly=true지만 useHeavyJob 등으로 백엔드에 직접 배선된 도구는 true다', () => {
        expect(moduleCanFail('pdf-watermark')).toBe(true)
    })

    it('순수 프론트 계산 도구(Job을 전혀 만들지 않음)는 false다', () => {
        expect(moduleCanFail('uuid')).toBe(false)
    })

    it('레지스트리에 없는 moduleId는 false다', () => {
        expect(moduleCanFail('deleted-module')).toBe(false)
    })
})
