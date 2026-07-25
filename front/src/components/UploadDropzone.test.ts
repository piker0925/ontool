import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import UploadDropzone from './UploadDropzone.vue'

describe('UploadDropzone', () => {
    it('상자를 클릭하면 숨겨진 파일 input의 클릭을 트리거한다', async () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요'}})
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')

        await wrapper.find('[data-testid="upload-dropzone"]').trigger('click')

        expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it('파일 input의 change로 파일을 고르면 select 이벤트로 File[]을 emit한다', async () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요'}})
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const file = new File(['data'], 'photo.png', {type: 'image/png'})
        Object.defineProperty(input, 'files', {value: [file], configurable: true})

        await wrapper.find('[data-testid="upload-dropzone-input"]').trigger('change')

        expect(wrapper.emitted('select')![0]).toEqual([[file]])
    })

    it('드래그오버하면 dragging 전용(hover: 프리픽스 없는) 액센트 클래스가 붙고, dragleave하면 사라진다', async () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요', zone: 'files'}})
        const box = wrapper.find('[data-testid="upload-dropzone"]')

        // 드래그 전에는 아직 dragging 전용 클래스(hover: 프리픽스 없음)가 없어야 한다.
        expect(box.classes()).not.toContain('text-zone-accent-files')

        await box.trigger('dragover')
        expect(box.classes()).toContain('text-zone-accent-files')
        expect(box.classes()).toContain('border-zone-accent-files/50')

        await box.trigger('dragleave')
        expect(box.classes()).not.toContain('text-zone-accent-files')
    })

    it('상자에 파일을 드롭하면 select 이벤트로 드롭된 File[]을 emit하고 dragging 상태를 해제한다', async () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요'}})
        const box = wrapper.find('[data-testid="upload-dropzone"]')
        const file = new File(['data'], 'dropped.jpg', {type: 'image/jpeg'})

        await box.trigger('dragover')
        expect(box.classes()).toContain('text-zone-accent-files')

        await box.trigger('drop', {dataTransfer: {files: [file]}})

        expect(wrapper.emitted('select')![0]).toEqual([[file]])
        expect(box.classes()).not.toContain('text-zone-accent-files')
    })

    it('active=false면 안내 박스는 렌더되지 않지만 파일 input은 계속 마운트되어 있다(재선택 버튼이 open()으로 열 수 있어야 함)', () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요', active: false}})

        expect(wrapper.find('[data-testid="upload-dropzone"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="upload-dropzone-input"]').exists()).toBe(true)
    })

    it('defineExpose된 open()을 호출하면 파일 input의 클릭을 트리거한다(다른 파일/다시 선택 버튼용)', async () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요', active: false}})
        const input = wrapper.find('[data-testid="upload-dropzone-input"]').element as HTMLInputElement
        const clickSpy = vi.spyOn(input, 'click')

        ;(wrapper.vm as unknown as {open: () => void}).open()

        expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it('accept·multiple prop을 파일 input에 그대로 전달한다', () => {
        const wrapper = mount(UploadDropzone, {props: {label: '이미지를 선택하세요', accept: '.docx,.xlsx', multiple: true}})
        const input = wrapper.find('[data-testid="upload-dropzone-input"]')

        expect(input.attributes('accept')).toBe('.docx,.xlsx')
        expect(input.attributes('multiple')).toBeDefined()
    })
})
