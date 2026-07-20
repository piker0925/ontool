import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import JwtDecoderTool from './JwtDecoderTool.vue'
import {signJwt} from '../../utils/jwtSign'

vi.mock('../../utils/jwtSign', () => ({
    signJwt: vi.fn(),
    verifyJwtSignature: vi.fn(),
}))

const mockSignJwt = signJwt as ReturnType<typeof vi.fn>

function delayed<T>(value: T, ms: number): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

describe('JwtDecoderTool — 생성 탭 요청 순번 가드', () => {
    it('먼저 시작된 느린 요청이 나중에 시작된 빠른 요청보다 늦게 끝나도 최신 입력의 결과만 반영된다', async () => {
        // 1차 호출(느림, 50ms 뒤 'stale-token')이 2차 호출(즉시 'fresh-token')보다 늦게 resolve된다 —
        // 가드가 없으면 나중에 도착한 stale 결과가 genToken을 덮어써 최신 입력과 불일치하게 된다.
        mockSignJwt
            .mockImplementationOnce(() => delayed('stale-token', 50))
            .mockImplementationOnce(() => Promise.resolve('fresh-token'))

        const wrapper = mount(JwtDecoderTool)
        const generateModeButton = wrapper.findAll('button').find(b => b.text() === '생성')!
        await generateModeButton.trigger('click')

        const payloadArea = wrapper.find('textarea[placeholder=\'{"sub": "1234567890"}\']')
        const secretInput = wrapper.find('input[placeholder="secret"]')

        await payloadArea.setValue('{"a":1}')
        await secretInput.setValue('secret-1') // → signJwt 1차 호출 트리거 (느린 stale-token)
        await payloadArea.setValue('{"a":2}') // → signJwt 2차 호출 트리거 (빠른 fresh-token)

        // 1차 호출의 50ms 지연이 끝날 때까지 충분히 기다린다.
        await new Promise(resolve => setTimeout(resolve, 80))

        expect(wrapper.text()).toContain('fresh-token')
        expect(wrapper.text()).not.toContain('stale-token')
        expect(mockSignJwt).toHaveBeenCalledTimes(2)
    })
})
