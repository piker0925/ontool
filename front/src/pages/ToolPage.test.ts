import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import ToolPage from './ToolPage.vue'
import {apiClient} from '../api/client'
import type {Module} from '../types'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), post: vi.fn()},
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

function mockModules(modules: Module[]) {
    mockGet.mockImplementation((url: string) => {
        if (url === '/api/v1/modules') return Promise.resolve({data: modules})
        if (url.includes('/stats')) return Promise.resolve({data: {useCount: 0, likeCount: 0}})
        return Promise.reject(new Error('unexpected GET ' + url))
    })
}

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: '/tools/:moduleId', component: ToolPage}],
})

async function mountAt(moduleId: string, modules: Module[]) {
    mockModules(modules)
    await router.push(`/tools/${moduleId}`)
    const wrapper = mount(ToolPage, {global: {plugins: [router], stubs: {CommentSection: true}}})
    await flushPromises()
    return wrapper
}

function inputForLabel(wrapper: ReturnType<typeof mount>, labelText: string) {
    const label = wrapper.findAll('label').find(l => l.text() === labelText)
    if (!label) return null
    return label.element.parentElement?.querySelector('input') as HTMLInputElement | null
}

beforeEach(() => vi.clearAllMocks())

describe('ToolPage 파라미터 필드 (024)', () => {
    it('barcode 모듈에 너비/높이 입력 필드가 기본값과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('barcode', [
            {id: 'barcode', name: '바코드 생성', category: '생성기', isHeavy: false},
        ])

        const width = inputForLabel(wrapper, '너비 (px)')
        const height = inputForLabel(wrapper, '높이 (px)')

        expect(width?.value).toBe('400')
        expect(height?.value).toBe('120')
    })

    it('cron 모듈에 count 입력 필드가 기본값 5와 함께 렌더링된다', async () => {
        const wrapper = await mountAt('cron', [
            {id: 'cron', name: 'Cron 표현식', category: 'DevOps', isHeavy: false},
        ])

        const count = inputForLabel(wrapper, '다음 실행 횟수')

        expect(count?.value).toBe('5')
    })

    it('qr-code 모듈에 size 입력 필드가 기본값 300과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('qr-code', [
            {id: 'qr-code', name: 'QR 코드 생성', category: '생성기', isHeavy: false},
        ])

        const size = inputForLabel(wrapper, '크기 (px)')

        expect(size?.value).toBe('300')
    })

    it('gif-create 모듈에 delay 입력 필드가 기본값 100과 함께 렌더링된다', async () => {
        const wrapper = await mountAt('gif-create', [
            {id: 'gif-create', name: 'GIF 생성', category: '이미지', isHeavy: true},
        ])

        const delay = inputForLabel(wrapper, '프레임 간격 (ms)')

        expect(delay?.value).toBe('100')
    })
})
