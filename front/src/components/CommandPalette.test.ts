import {afterEach, describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import CommandPalette from './CommandPalette.vue'
import type {Module} from '../types'

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: '/tools/:moduleId', component: {template: '<div/>'}}],
})

// CommandDialog는 reka-ui Teleport로 document.body에 렌더된다 — unmount하지 않으면
// 다음 테스트의 document.body 기반 검증이 이전 테스트의 잔여 DOM과 섞인다.
let activeWrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
})

const MODULES: Module[] = [
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
    {id: 'sql-formatter', name: 'SQL 포맷터', category: '포맷터', isHeavy: false, zones: ['dev']},
]

/** CommandDialog는 reka-ui Teleport로 document.body에 렌더되므로 wrapper 밖에서 조회해야 한다. */
async function search(wrapper: ReturnType<typeof mount>, term: string) {
    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = term
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
}

function itemNames(): string[] {
    return Array.from(document.body.querySelectorAll('[data-slot="command-item"]')).map(el => el.textContent?.trim() ?? '')
}

describe('CommandPalette — 결과 그룹핑', () => {
    it('그룹 헤딩이 구역명(zones[0]) 단위다 — 카테고리까지 묶지 않아 스캐닝을 극대화한다 (ADR-0023)', async () => {
        const wrapper = activeWrapper = mount(CommandPalette, {props: {modules: MODULES}, global: {plugins: [router]}, attachTo: document.body})
        wrapper.vm.open()
        await wrapper.vm.$nextTick()

        // CommandDialog는 reka-ui DialogPortal로 document.body에 텔레포트되어 wrapper 밖에 렌더된다
        expect(document.body.textContent).toContain('파일·문서')
        expect(document.body.textContent).toContain('개발자 도구')
        // 그룹 헤딩 자체는 구역명만이다 — "카테고리명"을 붙인 합성 헤딩(예: "파일·문서 > PDF")은 없다
        expect(document.body.textContent).not.toContain('파일·문서 > PDF')
        expect(document.body.textContent).not.toContain('개발자 도구 > 포맷터')
    })
})

// 순서 주의: watermark(약한 매치)를 pdf-merge(강한 매치)보다 원본 배열에서 앞에 둔다 —
// 정렬이 실제로 일어나야만 랭킹 테스트가 통과하고, 원본 순서가 우연히 맞아떨어져 통과하지 않게 한다.
const FUZZY_MODULES: Module[] = [
    {
        id: 'watermark',
        name: '워터마크 추가',
        category: '이미지',
        isHeavy: false,
        zones: ['files'],
        description: '이미지에 워터마크를 넣고 PDF로도 내보낼 수 있습니다',
    },
    {id: 'image-resize', name: '이미지 리사이즈', category: '이미지', isHeavy: false, zones: ['files']},
    {id: 'pdf-merge', name: 'PDF 병합', category: 'PDF', isHeavy: true, zones: ['files']},
]

describe('CommandPalette — 퍼지 매칭', () => {
    it('축약 입력("이리사")도 대상 도구("이미지 리사이즈")에 순서대로만 나오면 매치된다', async () => {
        const wrapper = activeWrapper = mount(CommandPalette, {props: {modules: FUZZY_MODULES}, global: {plugins: [router]}, attachTo: document.body})
        wrapper.vm.open()
        await wrapper.vm.$nextTick()

        await search(wrapper, '이리사')

        expect(document.body.textContent).toContain('이미지 리사이즈')
    })

    it('연속·이른 위치로 매치되는 결과가 흩어져(늦게) 매치되는 결과보다 위에 온다', async () => {
        const wrapper = activeWrapper = mount(CommandPalette, {props: {modules: FUZZY_MODULES}, global: {plugins: [router]}, attachTo: document.body})
        wrapper.vm.open()
        await wrapper.vm.$nextTick()

        // "PDF"는 pdf-merge에서 이름 맨 앞에 연속으로 매치되고, watermark에서는 description 뒤쪽에서만 매치된다
        await search(wrapper, 'PDF')

        const names = itemNames()
        const pdfMergeIndex = names.findIndex(t => t.includes('PDF 병합'))
        const watermarkIndex = names.findIndex(t => t.includes('워터마크 추가'))
        expect(pdfMergeIndex).toBeGreaterThanOrEqual(0)
        expect(watermarkIndex).toBeGreaterThanOrEqual(0)
        expect(pdfMergeIndex).toBeLessThan(watermarkIndex)
    })

    it('기존 정확 일치 검색("PDF 병합")은 회귀 없이 그대로 동작한다', async () => {
        const wrapper = activeWrapper = mount(CommandPalette, {props: {modules: FUZZY_MODULES}, global: {plugins: [router]}, attachTo: document.body})
        wrapper.vm.open()
        await wrapper.vm.$nextTick()

        await search(wrapper, 'PDF 병합')

        expect(document.body.textContent).toContain('PDF 병합')
        expect(document.body.textContent).not.toContain('워터마크 추가')
    })
})
