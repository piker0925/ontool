import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import WatermarkEditorCanvas, {type WatermarkTextElement} from './WatermarkEditorCanvas.vue'

// pdfjs-dist는 지연 로딩(await import)된다 — PdfThumbnail.test.ts와 동일한 목 패턴.
const {mockGetDocument} = vi.hoisted(() => ({mockGetDocument: vi.fn()}))
vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {workerSrc: ''},
    getDocument: mockGetDocument,
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({default: 'blob:worker'}))

function fakePdfDoc(numPages: number) {
    return {
        promise: Promise.resolve({
            numPages,
            getPage: () => Promise.resolve({
                getViewport: ({scale}: {scale: number}) => ({width: 120 * scale, height: 160 * scale}),
                render: () => ({promise: Promise.resolve()}),
            }),
        }),
    }
}

function pdfFile(name = 'doc.pdf') {
    const file = new File(['%PDF-1.4'], name, {type: 'application/pdf'})
    file.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))
    return file
}

async function mountEditor(file: File | null, elements: WatermarkTextElement[] = []) {
    const wrapper = mount(WatermarkEditorCanvas, {props: {file, elements}})
    await flushPromises()
    await flushPromises()
    return wrapper
}

beforeEach(() => {
    vi.clearAllMocks()
    mockGetDocument.mockReturnValue(fakePdfDoc(1))
    // jsdom은 canvas 2d 컨텍스트를 구현하지 않는다 — 렌더 배선만 검증하기 위한 최소 스텁.
    ;(HTMLCanvasElement.prototype as unknown as {getContext: () => object}).getContext = () => ({})
    // jsdom은 레이아웃을 계산하지 않아 getBoundingClientRect가 항상 0을 반환한다 — 드래그 좌표 계산에 고정값이 필요하다.
    HTMLElement.prototype.getBoundingClientRect = () => ({
        width: 400, height: 500, left: 0, top: 0, right: 400, bottom: 500, x: 0, y: 0, toJSON: () => '',
    })
})

describe('WatermarkEditorCanvas', () => {
    it('파일이 없으면 안내 문구만 보이고 캔버스는 없다', async () => {
        const wrapper = await mountEditor(null)
        expect(wrapper.text()).toContain('파일을 업로드하면')
        expect(wrapper.find('canvas').exists()).toBe(false)
    })

    it('PDF 파일이 있으면 캔버스를 렌더하고, 1페이지짜리면 페이지 네비게이터가 없다', async () => {
        const wrapper = await mountEditor(pdfFile())
        expect(wrapper.find('canvas').exists()).toBe(true)
        expect(wrapper.find('[data-testid="wm-page-indicator"]').exists()).toBe(false)
    })

    it('여러 페이지 PDF면 페이지 네비게이터가 뜨고, 다음/이전으로 페이지를 이동할 수 있다', async () => {
        mockGetDocument.mockReturnValue(fakePdfDoc(3))
        const wrapper = await mountEditor(pdfFile())

        expect(wrapper.find('[data-testid="wm-page-indicator"]').text()).toBe('1 / 3 페이지')
        const buttons = wrapper.findAll('button').filter(b => b.attributes('type') === 'button')
        const nextButton = buttons.find(b => !b.attributes('disabled') && b.html().includes('chevron-right'))
        expect(nextButton).toBeTruthy()
    })

    it('+ 텍스트 추가를 누르면 새 요소가 추가되고 선택되어 편집 패널이 뜬다', async () => {
        const wrapper = await mountEditor(pdfFile())
        await wrapper.find('[data-testid="wm-add-text"]').trigger('click')

        const emitted = wrapper.emitted('update:elements')
        expect(emitted).toHaveLength(1)
        const newElements = emitted![0][0] as WatermarkTextElement[]
        expect(newElements).toHaveLength(1)
        expect(newElements[0].text).toBe('텍스트')
        expect(newElements[0].page).toBeNull()
    })

    it('선택된 요소의 텍스트·색상·크기를 바꾸면 update:elements가 그 값으로 emit된다', async () => {
        const el: WatermarkTextElement = {id: 'el-0', text: '초기값', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const wrapper = await mountEditor(pdfFile(), [el])
        // 요소를 선택해야 편집 패널이 뜬다.
        await wrapper.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})

        await wrapper.find('[data-testid="wm-text-input"]').setValue('바뀐텍스트')
        const patched = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(patched[0].text).toBe('바뀐텍스트')
    })

    it('새 요소는 기본 굵기가 REGULAR이다', async () => {
        const wrapper = await mountEditor(pdfFile())
        await wrapper.find('[data-testid="wm-add-text"]').trigger('click')
        const added = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(added[0].fontWeight).toBe('REGULAR')
    })

    it('굵기를 바꾸면 update:elements에 반영된다', async () => {
        const el: WatermarkTextElement = {id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const wrapper = await mountEditor(pdfFile(), [el])
        await wrapper.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})

        await wrapper.find('[data-testid="wm-weight-select"]').setValue('BLACK')
        const patched = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(patched[0].fontWeight).toBe('BLACK')
    })

    it('삭제 버튼을 누르면 해당 요소가 제거된다', async () => {
        const el: WatermarkTextElement = {id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const wrapper = await mountEditor(pdfFile(), [el])
        await wrapper.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})

        await wrapper.find('[data-testid="wm-remove-element"]').trigger('click')
        const result = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(result).toHaveLength(0)
    })

    it('페이지가 2개 이상일 때만 "이 페이지에만 적용" 토글이 보인다', async () => {
        mockGetDocument.mockReturnValue(fakePdfDoc(1))
        const el: WatermarkTextElement = {id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const single = await mountEditor(pdfFile(), [el])
        await single.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})
        expect(single.find('[data-testid="wm-page-scope-toggle"]').exists()).toBe(false)

        mockGetDocument.mockReturnValue(fakePdfDoc(3))
        const multi = await mountEditor(pdfFile(), [el])
        await multi.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})
        expect(multi.find('[data-testid="wm-page-scope-toggle"]').exists()).toBe(true)
    })

    it('현재 페이지에만 적용되는 요소는 다른 페이지에서 보이지 않는다', async () => {
        mockGetDocument.mockReturnValue(fakePdfDoc(2))
        const elements: WatermarkTextElement[] = [
            {id: 'all', text: '전체', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false},
            {id: 'p2only', text: '2페이지전용', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: 2, fontWeight: 'REGULAR', tiled: false},
        ]
        const wrapper = await mountEditor(pdfFile(), elements)

        expect(wrapper.find('[data-testid="wm-element-all"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="wm-element-p2only"]').exists()).toBe(false)

        const nextButton = wrapper.findAll('button').find(b => b.html().includes('chevron-right'))!
        await nextButton.trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="wm-element-all"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="wm-element-p2only"]').exists()).toBe(true)
    })

    it('드래그하면 요소의 xPercent/yPercent가 포인터 위치에 맞게 갱신된다', async () => {
        const el: WatermarkTextElement = {id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const wrapper = await mountEditor(pdfFile(), [el])
        const handle = wrapper.find('[data-testid="wm-element-el-0"]')
        const domEl = handle.element as HTMLElement
        ;(domEl as unknown as {setPointerCapture: () => void}).setPointerCapture = vi.fn()
        ;(domEl as unknown as {releasePointerCapture: () => void}).releasePointerCapture = vi.fn()

        domEl.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, bubbles: true}))
        // stage 400x500 기준으로 (200,250) → 정중앙(50%, 50%)
        domEl.dispatchEvent(new PointerEvent('pointermove', {pointerId: 1, clientX: 200, clientY: 250}))
        domEl.dispatchEvent(new PointerEvent('pointerup', {pointerId: 1}))
        await flushPromises()

        const updated = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(updated[0].xPercent).toBeCloseTo(50, 0)
        expect(updated[0].yPercent).toBeCloseTo(50, 0)
    })

    it('새 요소는 기본적으로 배경 채우기(tiled)가 꺼져 있다', async () => {
        const wrapper = await mountEditor(pdfFile())
        await wrapper.find('[data-testid="wm-add-text"]').trigger('click')
        const added = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(added[0].tiled).toBe(false)
    })

    it('배경 전체 채우기를 켜면 update:elements에 반영되고, 드래그 박스는 캔버스에서 사라진다', async () => {
        const el: WatermarkTextElement = {id: 'el-0', text: 'X', xPercent: 10, yPercent: 10, color: '#000000', fontSize: 24, page: null, fontWeight: 'REGULAR', tiled: false}
        const wrapper = await mountEditor(pdfFile(), [el])
        await wrapper.find('[data-testid="wm-element-el-0"]').trigger('pointerdown', {pointerId: 1})
        expect(wrapper.find('[data-testid="wm-element-el-0"]').exists()).toBe(true)

        await wrapper.find('[data-testid="wm-tiled-toggle"]').setValue(true)
        const patched = wrapper.emitted('update:elements')!.at(-1)![0] as WatermarkTextElement[]
        expect(patched[0].tiled).toBe(true)

        // 부모가 v-model로 갱신된 elements를 다시 내려줘야 캔버스에도 반영된다.
        await wrapper.setProps({elements: patched})
        // tiled 요소는 위치가 의미 없으므로 드래그 박스를 그리지 않아야 한다.
        expect(wrapper.find('[data-testid="wm-element-el-0"]').exists()).toBe(false)
    })
})
