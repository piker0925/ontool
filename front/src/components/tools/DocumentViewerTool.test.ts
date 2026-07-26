import {describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import * as XLSX from '@e965/xlsx'
import JSZip from 'jszip'
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

// docx-preview가 실제로 파싱할 수 있는 최소 유효 DOCX(OOXML zip)를 직접 구성한다. renderAsync를 mock으로
// 대체하면 "호출됐는지"만 확인할 뿐 실제로 문서 내용이 화면에 그려지는지는 검증하지 못한다 — 그리고
// documentViewer.test.ts는 확장자 판별(detectDocumentType)만 다룰 뿐 docx-preview 렌더링 결과를 검증하는
// 테스트는 저장소 어디에도 없다. 그래서 xlsxViewer와 동일하게 실제 바이너리를 만들어 렌더된 본문 텍스트가
// DOM에 실제로 나타나는지 직접 확인한다.
async function buildDocxFile(text: string, name = 'report.docx'): Promise<File> {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
    zip.folder('_rels')!.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
    zip.folder('word')!.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`)
    zip.folder('word')!.folder('_rels')!.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`)
    const buffer = await zip.generateAsync({type: 'arraybuffer'})
    const file = new File([buffer], name, {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
    file.arrayBuffer = () => Promise.resolve(buffer)
    return file
}

// router-link(오피스 변환기 안내 링크)를 렌더링하려면 실제 라우터 플러그인이 주입돼 있어야 <a href>로 해석된다.
function createTestRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/tools/:moduleId', component: {template: '<div/>'}},
        ],
    })
}

function mountTool() {
    return mount(DocumentViewerTool, {global: {plugins: [createTestRouter()]}})
}

async function dropFile(wrapper: ReturnType<typeof mountTool>, file: File) {
    await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
    await flushPromises()
}

async function selectFile(wrapper: ReturnType<typeof mountTool>, file: File) {
    const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', {value: [file], configurable: true})
    await wrapper.find('[data-testid="upload-dropzone-input"]').trigger('change')
    await flushPromises()
}

describe('DocumentViewerTool — DOCX/XLSX 뷰잉', () => {
    it('145: 드래그앤드롭으로 XLSX 파일을 올리면 시트 데이터를 렌더링한다(기존엔 클릭 선택만 가능했던 경로)', async () => {
        const wrapper = mountTool()
        const file = buildWorkbookFile({'Sheet1': [['이름', '점수'], ['철수', 90]]})

        await dropFile(wrapper, file)

        expect(wrapper.text()).toContain('sheet.xlsx')
        expect(wrapper.text()).toContain('철수')
        expect(wrapper.text()).toContain('90')
        expect(wrapper.find('a[href="/tools/office-document-convert"]').exists()).toBe(false)
    })

    it('지원하지 않는 확장자를 드롭하면 에러 메시지를 보여주고 시트를 렌더링하지 않는다', async () => {
        const wrapper = mountTool()
        const file = new File(['data'], 'photo.png', {type: 'image/png'})

        await dropFile(wrapper, file)

        expect(wrapper.text()).toContain('지원하지 않는 파일 형식입니다')
        expect(wrapper.text()).not.toContain('photo.png')
    })

    it('확장자가 없는 파일도 동일하게 범용 에러 메시지를 보여준다', async () => {
        const wrapper = mountTool()
        await selectFile(wrapper, new File(['x'], 'noextension'))

        expect(wrapper.text()).toContain('지원하지 않는 파일 형식입니다')
    })

    it('클릭(파일 선택) 경로는 마이그레이션 이후에도 그대로 동작한다(회귀 없음)', async () => {
        const wrapper = mountTool()
        const file = buildWorkbookFile({'Sheet1': [['a', 'b']]}, 'clicked.xlsx')

        await selectFile(wrapper, file)

        expect(wrapper.text()).toContain('clicked.xlsx')
    })

    it('파일을 로드한 뒤 "다른 파일" 버튼을 누르면 업로드 상자를 다시 열 수 있다(재선택 어포던스 유지)', async () => {
        const wrapper = mountTool()
        const file = buildWorkbookFile({'Sheet1': [['x']]})
        await dropFile(wrapper, file)

        // 로드 후에는 안내 박스가 숨겨지지만, input 자체는 계속 마운트되어 있어야 재선택이 가능하다.
        expect(wrapper.find('[data-testid="upload-dropzone"]').exists()).toBe(false)
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')

        const reselectButton = wrapper.findAll('button').find(b => b.text() === '다른 파일')
        expect(reselectButton).toBeTruthy()
        await reselectButton!.trigger('click')

        expect(clickSpy).toHaveBeenCalled()
    })

    it('DOCX 파일을 선택하면 실제 문서 내용이 화면에 렌더링되고 안내/에러가 뜨지 않는다', async () => {
        const wrapper = mountTool()
        const file = await buildDocxFile('실제_렌더된_본문_마커')

        await selectFile(wrapper, file)

        // docx-preview의 renderAsync는 내부적으로 매크로태스크를 거쳐 완료되므로(마이크로태스크만
        // 비우는 flushPromises로는 부족하다) mock 호출 여부가 아니라, 실제로 파싱한 본문 텍스트가
        // DOM에 나타날 때까지 폴링해서 확인한다.
        await vi.waitFor(() => expect(wrapper.text()).toContain('실제_렌더된_본문_마커'))
        expect(wrapper.find('a[href="/tools/office-document-convert"]').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('지원하지 않는 파일 형식입니다')
    })
})

describe('DocumentViewerTool — 오피스 변환기 안내 (HWP 등)', () => {
    // accept가 docx/xlsx로만 좁혀져 있으면 OS 파일 선택창이 HWP 등을 필터링해 숨겨버려
    // 아래 안내 분기 자체에 사용자가 도달할 수 없다(테스트는 files를 직접 주입해 accept를
    // 우회하므로 이 점을 놓친다) — 그래서 accept 속성 자체를 별도로 검증한다.
    it('파일 입력의 accept 속성이 오피스 변환기 지원 확장자를 포함해 선택창에서 숨겨지지 않는다', () => {
        const wrapper = mountTool()
        const accept = wrapper.find('[data-testid="upload-dropzone-input"]').attributes('accept') ?? ''
        const accepted = accept.split(',')
        for (const ext of ['.docx', '.xlsx', '.hwp', '.hwpx', '.pptx', '.ppt', '.doc', '.xls']) {
            expect(accepted).toContain(ext)
        }
    })

    it('HWP 파일을 선택하면 오피스 변환기 안내 문구와 이동 링크가 표시된다', async () => {
        const wrapper = mountTool()
        await selectFile(wrapper, new File(['x'], 'report.hwp'))

        expect(wrapper.text()).toContain('오피스 문서 변환기')
        const link = wrapper.find('a[href="/tools/office-document-convert"]')
        expect(link.exists()).toBe(true)
        // 범용 메시지가 아닌, 이 확장자 전용 안내여야 한다.
        expect(wrapper.text()).not.toContain('지원하지 않는 파일 형식입니다')
    })

    it('HWPX 파일을 선택해도 동일하게 오피스 변환기 안내가 표시된다', async () => {
        const wrapper = mountTool()
        await selectFile(wrapper, new File(['x'], 'report.hwpx'))

        const link = wrapper.find('a[href="/tools/office-document-convert"]')
        expect(link.exists()).toBe(true)
    })

    it('레거시 PPT/DOC/XLS 등 오피스 변환기 지원 확장자도 안내가 표시된다', async () => {
        const wrapper = mountTool()
        await selectFile(wrapper, new File(['x'], 'legacy.ppt'))

        const link = wrapper.find('a[href="/tools/office-document-convert"]')
        expect(link.exists()).toBe(true)
    })

    it('완전히 지원 범위 밖 확장자(.png)는 기존 범용 메시지를 그대로 보여주고 안내 링크는 없다', async () => {
        const wrapper = mountTool()
        await selectFile(wrapper, new File(['x'], 'photo.png'))

        expect(wrapper.text()).toContain('지원하지 않는 파일 형식입니다 (DOCX, XLSX만 지원)')
        const link = wrapper.find('a[href="/tools/office-document-convert"]')
        expect(link.exists()).toBe(false)
    })
})
