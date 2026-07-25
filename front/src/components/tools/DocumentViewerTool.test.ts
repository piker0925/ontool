import {describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import * as XLSX from '@e965/xlsx'
import DocumentViewerTool from './DocumentViewerTool.vue'

// xlsxViewer.test.ts와 동일한 방식으로 실제 XLSX 바이너리를 만든다 — 확장자만 맞춘 가짜 파일이 아니라
// 실제 파싱 가능한 파일이어야 "드롭 경로가 실제로 동작하는지"를 검증할 수 있다.
function buildWorkbookFile(sheets: Record<string, unknown[][]>, name = 'sheet.xlsx'): File {
    const wb = XLSX.utils.book_new()
    for (const [sheetName, rows] of Object.entries(sheets)) {
        const ws = XLSX.utils.aoa_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
    const buffer = XLSX.write(wb, {type: 'array', bookType: 'xlsx'}) as ArrayBuffer
    const file = new File([buffer], name, {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    file.arrayBuffer = () => Promise.resolve(buffer)
    return file
}

describe('DocumentViewerTool', () => {
    it('145: 드래그앤드롭으로 XLSX 파일을 올리면 시트 데이터를 렌더링한다(기존엔 클릭 선택만 가능했던 경로)', async () => {
        const wrapper = mount(DocumentViewerTool)
        const file = buildWorkbookFile({'Sheet1': [['이름', '점수'], ['철수', 90]]})

        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        expect(wrapper.text()).toContain('sheet.xlsx')
        expect(wrapper.text()).toContain('철수')
        expect(wrapper.text()).toContain('90')
    })

    it('지원하지 않는 확장자를 드롭하면 에러 메시지를 보여주고 시트를 렌더링하지 않는다', async () => {
        const wrapper = mount(DocumentViewerTool)
        const file = new File(['data'], 'photo.png', {type: 'image/png'})

        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        expect(wrapper.text()).toContain('지원하지 않는 파일 형식입니다')
        expect(wrapper.text()).not.toContain('photo.png')
    })

    it('클릭(파일 선택) 경로는 마이그레이션 이후에도 그대로 동작한다(회귀 없음)', async () => {
        const wrapper = mount(DocumentViewerTool)
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const file = buildWorkbookFile({'Sheet1': [['a', 'b']]}, 'clicked.xlsx')
        Object.defineProperty(input, 'files', {value: [file], configurable: true})

        await wrapper.find('[data-testid="upload-dropzone-input"]').trigger('change')
        await flushPromises()

        expect(wrapper.text()).toContain('clicked.xlsx')
    })

    it('파일을 로드한 뒤 "다른 파일" 버튼을 누르면 업로드 상자를 다시 열 수 있다(재선택 어포던스 유지)', async () => {
        const wrapper = mount(DocumentViewerTool)
        const file = buildWorkbookFile({'Sheet1': [['x']]})
        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        // 로드 후에는 안내 박스가 숨겨지지만, input 자체는 계속 마운트되어 있어야 재선택이 가능하다.
        expect(wrapper.find('[data-testid="upload-dropzone"]').exists()).toBe(false)
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')

        const reselectButton = wrapper.findAll('button').find(b => b.text() === '다른 파일')
        expect(reselectButton).toBeTruthy()
        await reselectButton!.trigger('click')

        expect(clickSpy).toHaveBeenCalled()
    })
})
