import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import {ref} from 'vue'
import DefaultLayout from './DefaultLayout.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {get: vi.fn()},
}))

// useTheme/useFavorites는 모듈 로드 시점에 localStorage를 건드린다 — 이 프로젝트의 jsdom
// 테스트 환경에서 localStorage가 불완전하게 동작하는 기존 문제(ZoneHomePage.test.ts와 동일)를
// 피하기 위해 컴포저블 자체를 모킹한다.
vi.mock('../composables/useTheme', () => ({
    useTheme: () => ({preference: ref('system'), isDark: ref(false), setTheme: vi.fn()}),
}))
vi.mock('../composables/useFavorites', () => ({
    useFavorites: () => ({favoriteIds: ref([]), isFavorite: () => false, toggle: vi.fn()}),
}))
vi.mock('../composables/useActiveJobs', () => ({
    useActiveJobs: () => ({jobs: ref([]), track: vi.fn(), dismiss: vi.fn()}),
}))

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

const Stub = {template: '<div/>'}
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {path: '/dev', component: Stub},
        {path: '/files', component: Stub},
        {path: '/life', component: Stub},
        {path: '/fun', component: Stub},
        {path: '/tools/:moduleId', component: Stub},
    ],
})

const MODULES = [
    {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, zones: ['dev']},
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
]

beforeEach(async () => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({data: MODULES})
    delete document.documentElement.dataset.zone
})

describe('DefaultLayout — 구역 스코프 사이드바', () => {
    it('현재 구역(files)의 카테고리만 사이드바에 노출된다', async () => {
        await router.push('/files')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('PDF')
        expect(wrapper.text()).not.toContain('포맷터')
    })

    it('현재 구역(dev)의 카테고리만 사이드바에 노출된다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        expect(wrapper.text()).toContain('포맷터')
        expect(wrapper.text()).not.toContain('PDF')
    })

    it('워크스페이스 스위처를 클릭하면 4구역 라우트로 이동 가능한 링크가 나타난다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}, attachTo: document.body})
        await flushPromises()

        // DropdownMenuContent는 reka-ui가 document.body로 텔레포트하므로 wrapper 밖에서 찾는다
        await wrapper.find('[data-testid="workspace-switcher-trigger"]').trigger('click')
        await flushPromises()

        const hrefs = Array.from(document.body.querySelectorAll('a')).map(a => a.getAttribute('href'))
        expect(hrefs).toEqual(expect.arrayContaining(['/dev', '/files', '/life', '/fun']))

        wrapper.unmount()
    })

    it('현재 구역을 document.documentElement의 data-zone 속성에 반영한다', async () => {
        await router.push('/files')
        mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        expect(document.documentElement.dataset.zone).toBe('files')
    })

    it('/tools/:id 진입 시 모듈의 기본 구역(zones[0])을 data-zone에 반영한다', async () => {
        await router.push('/tools/pdf-merge')
        mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        expect(document.documentElement.dataset.zone).toBe('files')
    })

    it('워크스페이스 스위처는 사이드바(aside) 안, 카테고리 목록보다 위에 있다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const aside = wrapper.find('aside')
        const trigger = wrapper.find('[data-testid="workspace-switcher-trigger"]')
        expect(trigger.exists()).toBe(true)
        expect(aside.element.contains(trigger.element)).toBe(true)
    })
})

describe('DefaultLayout — 내 작업 패널 (043)', () => {
    it('사이드바(aside) 안에 내 작업 패널이 상시 렌더링된다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const aside = wrapper.find('aside')
        const panel = wrapper.find('[data-testid="active-jobs-panel"]')
        expect(panel.exists()).toBe(true)
        expect(aside.element.contains(panel.element)).toBe(true)
    })
})

describe('DefaultLayout — 모바일 드로어', () => {
    it('백드롭의 z-index가 드로어(aside)보다 낮아야 한다 — 백드롭이 위에 있으면 메뉴가 블러 처리된 검은 막에 가려 안 보인다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        await wrapper.findAll('header button')[0].trigger('click')
        await flushPromises()

        const backdrop = wrapper.find('[data-testid="drawer-backdrop"]')
        const aside = wrapper.find('aside')
        expect(backdrop.exists()).toBe(true)

        const backdropZ = Number(backdrop.attributes('class')?.match(/(?:^| )z-(\d+)/)?.[1])
        const asideZ = Number(aside.attributes('class')?.match(/(?:^| )z-(\d+)/)?.[1])
        expect(backdropZ).toBeLessThan(asideZ)
    })
})

describe('DefaultLayout — 브레드크럼', () => {
    it('/tools/:id 진입 시 홈 > 구역 > 카테고리 순으로 브레드크럼을 렌더링한다', async () => {
        await router.push('/tools/sql-formatter')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const breadcrumb = wrapper.find('[data-testid="breadcrumb"]')
        expect(breadcrumb.text()).toContain('개발자 도구')
        expect(breadcrumb.text()).toContain('포맷터')
    })

    it('브레드크럼의 홈 링크는 아이콘 전용 로고를 쓴다 — 워드마크 전체를 쓰면 좁은 화면에서 구역·카테고리 텍스트가 밀려 폭 0으로 사라지는 회귀가 있었다', async () => {
        await router.push('/tools/sql-formatter')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const breadcrumb = wrapper.find('[data-testid="breadcrumb"]')
        expect(breadcrumb.text()).not.toContain('ontool')
    })

    it('구역 링크는 해당 모듈의 기본 구역(zones[0]) 홈으로 이동한다', async () => {
        await router.push('/tools/pdf-merge')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const breadcrumb = wrapper.find('[data-testid="breadcrumb"]')
        const zoneLink = breadcrumb.findAll('a').at(1)
        expect(zoneLink?.attributes('href')).toBe('/files')
    })

    it('카테고리 링크는 구역 홈 경로에 category 쿼리를 붙여 이동한다', async () => {
        await router.push('/tools/sql-formatter')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const breadcrumb = wrapper.find('[data-testid="breadcrumb"]')
        const categoryLink = breadcrumb.findAll('a').at(2)
        const href = categoryLink?.attributes('href') ?? ''
        const url = new URL(href, 'http://localhost')
        expect(url.pathname).toBe('/dev')
        expect(url.searchParams.get('category')).toBe('포맷터')
    })
})
