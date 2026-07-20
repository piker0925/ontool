import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import {ref} from 'vue'
import ZoneHomePage from './ZoneHomePage.vue'
import {apiClient} from '../api/client'
import type {Module} from '../types'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn()},
}))

// MOCK_MODULES(isFrontendOnly 도구 목록)는 백엔드 응답과 무관하게 항상 병합되므로, "구역에 도구가
// 전혀 없는" 상태는 실제 카탈로그로는 재현할 수 없다(모든 구역에 프론트 전용 도구가 최소 1개씩
// 있음, 예: life=급여 계산기, files=오디오 도구 5종(074/075, zones는 files만)). getter로 감싸 이 파일 안에서만 테스트별로
// 내용을 갈아끼울 수 있게 한다 — 준비 중 문구 테스트에서만 빈 배열로 교체한다.
const mockModulesState = vi.hoisted(() => ({modules: [] as Module[]}))
vi.mock('../api/mock', () => ({
    get MOCK_MODULES() {
        return mockModulesState.modules
    },
}))

const favoriteIds = ref<string[]>([])
vi.mock('../composables/useFavorites', () => ({
    useFavorites: () => ({favoriteIds, isFavorite: (id: string) => favoriteIds.value.includes(id), toggle: vi.fn()}),
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: '/dev', component: ZoneHomePage}],
})

beforeEach(async () => {
    vi.clearAllMocks()
    favoriteIds.value = []
    const actual = await vi.importActual<{MOCK_MODULES: Module[]}>('../api/mock')
    mockModulesState.modules = actual.MOCK_MODULES
})

describe('ZoneHomePage', () => {
    it('현재 구역(zones)에 속한 모듈만 카드로 렌더링한다', async () => {
        mockGet.mockResolvedValueOnce({
            data: [
                {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
                {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, zones: ['dev']},
            ],
        })

        const wrapper = mount(ZoneHomePage, {props: {zoneId: 'dev'}, global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('SQL 포맷터')
        expect(wrapper.text()).not.toContain('PDF 병합')
    })

    it('프론트 전용 모듈은 카테고리가 CATEGORY_ORDER에 없어도(예: 생활) 구역 홈 그리드에 실제로 렌더링된다', async () => {
        mockGet.mockResolvedValueOnce({data: []})

        const wrapper = mount(ZoneHomePage, {props: {zoneId: 'life'}, global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('급여 계산기')
    })

    it.each(['dev', 'files'] as const)('복수 구역 모듈은 %s 구역 홈에도 노출된다 (양쪽 다 확인)', async (zoneId) => {
        mockGet.mockResolvedValueOnce({
            data: [
                {id: 'exif-strip', name: 'EXIF 제거', category: '이미지', isHeavy: false, zones: ['files', 'dev']},
            ],
        })

        const wrapper = mount(ZoneHomePage, {props: {zoneId}, global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('EXIF 제거')
    })

    it('해당 구역에 도구가 없으면 준비 중 안내 문구를 보여준다', async () => {
        // 이제 모든 구역에 프론트 전용 도구가 최소 1개씩 있어(life=급여 계산기, fun=미니게임 등)
        // 실제 카탈로그로는 빈 구역을 재현할 수 없다 — MOCK_MODULES를 이 테스트에서만 빈 배열로
        // 갈아끼워 "도구가 0개일 때" 방어 로직 자체를 검증한다.
        mockModulesState.modules = []
        mockGet.mockResolvedValueOnce({
            data: [
                {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
            ],
        })

        const wrapper = mount(ZoneHomePage, {props: {zoneId: 'fun'}, global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('준비 중')
        expect(wrapper.text()).not.toContain('PDF 병합')
    })

    it('즐겨찾기여도 현재 구역 소속이 아니면 노출되지 않는다 — 구역 홈은 카탈로그이지 개인화 위젯이 아님(사이드바가 즐겨찾기 담당)', async () => {
        mockGet.mockResolvedValueOnce({
            data: [
                {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
                {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, zones: ['dev']},
            ],
        })
        favoriteIds.value = ['pdf-merge']

        const wrapper = mount(ZoneHomePage, {props: {zoneId: 'dev'}, global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).not.toContain('PDF 병합')
        expect(wrapper.text()).toContain('SQL 포맷터')
    })
})
