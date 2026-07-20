import {describe, expect, it} from 'vitest'
import {MOCK_MODULES} from '../api/mock'
import {GAME_COMPONENTS} from './gameRegistry'
import {FRONTEND_TOOL_COMPONENTS} from './frontendToolRegistry'

describe('GAME_COMPONENTS — 등록 일관성', () => {
    const moduleIds = new Set(MOCK_MODULES.map(m => m.id))
    const registryIds = Object.keys(GAME_COMPONENTS)

    it('모든 등록 id가 실제 MOCK_MODULES 항목과 대응한다 (오타 방지)', () => {
        const orphans = registryIds.filter(id => !moduleIds.has(id))
        expect(orphans).toEqual([])
    })

    it('registry의 id는 FRONTEND_TOOL_COMPONENTS와 중복 등록되지 않는다', () => {
        const duplicated = registryIds.filter(id => id in FRONTEND_TOOL_COMPONENTS)
        expect(duplicated).toEqual([])
    })

    it.each(Object.entries(GAME_COMPONENTS))(
        '%s 의 loader가 실제 컴포넌트로 resolve된다',
        async (_id, load) => {
            const component = await load()
            expect(component).toBeTruthy()
        },
    )
})
