import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import {ref} from 'vue'
import LandingPage from './LandingPage.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn()},
}))

const recentIds = ref<string[]>([])
vi.mock('../composables/useRecentTools', () => ({
    useRecentTools: () => ({recentIds, record: vi.fn()}),
}))
vi.mock('../composables/useTheme', () => ({
    useTheme: () => ({preference: ref('system'), isDark: ref(false), setTheme: vi.fn()}),
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {path: '/', component: LandingPage},
        {path: '/dev', component: {template: '<div/>'}},
        {path: '/files', component: {template: '<div/>'}},
        {path: '/life', component: {template: '<div/>'}},
        {path: '/fun', component: {template: '<div/>'}},
    ],
})

const MODULES = [
    {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, zones: ['dev']},
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
]

beforeEach(() => {
    vi.clearAllMocks()
    recentIds.value = []
    mockGet.mockResolvedValue({data: MODULES})
})

describe('LandingPage', () => {
    it('브랜드 슬로건을 히어로에 표시한다', async () => {
        const wrapper = mount(LandingPage, {global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('모든 도구, 한 곳에')
    })

    it('구역 카드 4장이 각 구역 홈으로 이동하는 링크를 갖는다', async () => {
        const wrapper = mount(LandingPage, {global: {plugins: [router]}})
        await flushPromises()

        const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
        expect(hrefs).toEqual(expect.arrayContaining(['/dev', '/files', '/life', '/fun']))
    })

    it('구역 카드에 해당 구역의 도구 수를 표시한다', async () => {
        // dev 구역은 normalizeApiModules가 항상 덧붙이는 실제 카탈로그의 isFrontendOnly 항목(전부 dev)과
        // 섞이므로, 오염되지 않는 files 구역으로 정확한 개수를 검증한다.
        const wrapper = mount(LandingPage, {global: {plugins: [router]}})
        await flushPromises()

        const filesCard = wrapper.findAll('a').find(a => a.attributes('href') === '/files')
        expect(filesCard?.text()).toContain('1개 도구')
    })

    it('검색 트리거를 클릭하면 CommandPalette가 열린다', async () => {
        const wrapper = mount(LandingPage, {global: {plugins: [router]}, attachTo: document.body})
        await flushPromises()

        await wrapper.find('[data-testid="landing-search-trigger"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(document.body.textContent).toContain('개발자 도구 > 포맷터')
    })

    it('⌘K를 누르면 CommandPalette가 열린다', async () => {
        mount(LandingPage, {global: {plugins: [router]}, attachTo: document.body})
        await flushPromises()

        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', metaKey: true}))
        await new Promise(r => setTimeout(r, 0))

        expect(document.body.textContent).toContain('개발자 도구 > 포맷터')
    })

    it('최근 사용 기록이 있으면 상단에 바로가기가 노출된다', async () => {
        recentIds.value = ['sql-formatter']

        const wrapper = mount(LandingPage, {global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('최근 사용')
        expect(wrapper.text()).toContain('SQL 포맷터')
    })

    it('최근 사용 기록이 없으면(시크릿 브라우저) 바로가기 섹션이 아예 렌더되지 않는다', async () => {
        const wrapper = mount(LandingPage, {global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).not.toContain('최근 사용')
    })
})
