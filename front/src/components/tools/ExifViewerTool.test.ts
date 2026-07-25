import {describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import ExifViewerTool from './ExifViewerTool.vue'

// jsdom은 실제 이미지를 디코딩하지 못하므로(imageDimensions.test.ts와 동일한 이유) exifr의 파싱 자체를
// 모킹한다 — 여기서 검증할 것은 EXIF 파싱 결과가 아니라 "드래그앤드롭/클릭 두 경로 모두 파일을 정상적으로
// 도구에 전달하는지"다.
vi.mock('exifr', () => ({
    parse: vi.fn().mockResolvedValue({Make: 'TestCam'}),
}))

describe('ExifViewerTool', () => {
    it('145: 이미지 파일을 드래그앤드롭하면 파일명을 표시하고 메타데이터 파싱을 시작한다(기존엔 클릭 선택만 가능했던 경로)', async () => {
        const wrapper = mount(ExifViewerTool)
        const file = new File(['data'], 'photo.jpg', {type: 'image/jpeg'})

        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        expect(wrapper.text()).toContain('photo.jpg')
        expect(wrapper.text()).not.toContain('이미지 파일이 아닙니다')
    })

    it('이미지가 아닌 파일을 드롭하면 드롭 시점에 거부하고 에러 메시지를 보여준다', async () => {
        const wrapper = mount(ExifViewerTool)
        const file = new File(['data'], 'doc.pdf', {type: 'application/pdf'})

        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        expect(wrapper.text()).toContain('이미지 파일이 아닙니다')
    })

    it('클릭(파일 선택) 경로는 마이그레이션 이후에도 그대로 동작한다(회귀 없음)', async () => {
        const wrapper = mount(ExifViewerTool)
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const file = new File(['data'], 'clicked.jpg', {type: 'image/jpeg'})
        Object.defineProperty(input, 'files', {value: [file], configurable: true})

        await wrapper.find('[data-testid="upload-dropzone-input"]').trigger('change')
        await flushPromises()

        expect(wrapper.text()).toContain('clicked.jpg')
    })

    it('파일을 로드한 뒤 "다시 선택" 버튼을 누르면 업로드 상자를 다시 열 수 있다(재선택 어포던스 유지)', async () => {
        const wrapper = mount(ExifViewerTool)
        const file = new File(['data'], 'photo.jpg', {type: 'image/jpeg'})
        await wrapper.find('[data-testid="upload-dropzone"]').trigger('drop', {dataTransfer: {files: [file]}})
        await flushPromises()

        expect(wrapper.find('[data-testid="upload-dropzone"]').exists()).toBe(false)
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')

        const reselectButton = wrapper.findAll('button').find(b => b.text() === '다시 선택')
        expect(reselectButton).toBeTruthy()
        await reselectButton!.trigger('click')

        expect(clickSpy).toHaveBeenCalled()
    })
})
