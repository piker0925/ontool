import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import MyPage from './MyPage.vue'
import {accessToken, user} from '../composables/useAuth'

vi.mock('vue-sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()},
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({replace: vi.fn(), push: vi.fn()}),
}))

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn(), delete: vi.fn()},
}))

const mockUser = {
    id: 1,
    provider: 'GOOGLE' as const,
    nickname: '테스터',
    email: 'tester@example.com',
    createdAt: '2026-01-01T00:00:00Z',
}

function mountMyPage() {
    return mount(MyPage, {
        global: {
            // 작업 이력 섹션은 이 이슈(아이콘 버튼 aria-label)와 무관하고 자체적으로 API를 호출하므로 스텁으로 대체한다.
            stubs: {JobHistorySection: true},
        },
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    accessToken.value = 'token'
    user.value = {...mockUser}
})

describe('MyPage 닉네임 편집 아이콘 버튼 접근성', () => {
    it('편집 버튼(연필 아이콘)에 aria-label="닉네임 수정"이 있다', () => {
        const wrapper = mountMyPage()

        const editBtn = wrapper.find('button[aria-label="닉네임 수정"]')
        expect(editBtn.exists()).toBe(true)
    })

    it('편집 모드로 전환하면 저장/취소 아이콘 버튼에 각각 aria-label이 있다', async () => {
        const wrapper = mountMyPage()

        const editBtn = wrapper.find('button[aria-label="닉네임 수정"]')
        await editBtn.trigger('click')

        const saveBtn = wrapper.find('button[aria-label="저장"]')
        const cancelBtn = wrapper.find('button[aria-label="취소"]')
        expect(saveBtn.exists()).toBe(true)
        expect(cancelBtn.exists()).toBe(true)
    })
})
