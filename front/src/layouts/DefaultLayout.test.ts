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

    it('구역 스위처가 4구역 라우트로 이동 가능한 링크를 렌더링한다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
        expect(hrefs).toEqual(expect.arrayContaining(['/dev', '/files', '/life', '/fun']))
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

    it('구역 스위처는 모바일 드로어(aside) 밖에 있어 드로어를 열지 않아도 항상 보인다', async () => {
        await router.push('/dev')
        const wrapper = mount(DefaultLayout, {global: {plugins: [router]}})
        await flushPromises()

        const aside = wrapper.find('aside')
        const asideHrefs = aside.findAll('a').map(a => a.attributes('href'))
        expect(asideHrefs).not.toEqual(expect.arrayContaining(['/files', '/life', '/fun']))

        const outsideAsideHrefs = wrapper.findAll('a')
            .filter(a => !aside.element.contains(a.element))
            .map(a => a.attributes('href'))
        expect(outsideAsideHrefs).toEqual(expect.arrayContaining(['/dev', '/files', '/life', '/fun']))
    })
})
