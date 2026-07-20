import {describe, expect, it} from 'vitest'
import {MOCK_MODULES} from '../api/mock'
import {FRONTEND_TOOL_COMPONENTS} from './frontendToolRegistry'
import {GAME_COMPONENTS} from './gameRegistry'

describe('FRONTEND_TOOL_COMPONENTS — 등록 일관성', () => {
    // GAME_COMPONENTS가 이미 담당하는 id(게임뿐 아니라 뽀모도로처럼 GamePage 셸만 재사용하는
    // 생활 도구도 포함 — kind로 구분하지 않는다, ADR-0026: kind는 렌더 결정권이 없다)는 대상에서 제외.
    const frontendOnlyIds = MOCK_MODULES.filter(m => m.isFrontendOnly && !(m.id in GAME_COMPONENTS)).map(m => m.id)
    const registryIds = Object.keys(FRONTEND_TOOL_COMPONENTS)

    it('모든 isFrontendOnly 모듈이 registry에 정확히 1개씩 등록되어 있다 (누락 없음)', () => {
        const missing = frontendOnlyIds.filter(id => !registryIds.includes(id))
        expect(missing).toEqual([])
    })

    it('registry에 고아 항목이 없다 (isFrontendOnly가 아닌 id는 등록되지 않음)', () => {
        const orphans = registryIds.filter(id => !frontendOnlyIds.includes(id))
        expect(orphans).toEqual([])
    })

    it('id 집합 개수가 양쪽 동일하다 (중복 등록 없음)', () => {
        expect(registryIds.length).toBe(frontendOnlyIds.length)
    })

    it.each(Object.entries(FRONTEND_TOOL_COMPONENTS))(
        '%s 의 loader가 실제 컴포넌트로 resolve된다',
        async (_id, entry) => {
            const mod = await entry.load()
            expect(mod.default).toBeTruthy()
        },
    )
})
