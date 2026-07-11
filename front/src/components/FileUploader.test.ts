import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import FileUploader from './FileUploader.vue'
import {apiClient} from '../api/client'

vi.mock('../api/client', () => ({
    apiClient: {post: vi.fn()},
}))

const mockPost = apiClient.post as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('FileUploader', () => {
    it('파일 1개 업로드 시 uploaded 이벤트로 jobId를 emit한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-to-pdf'},
        })

        const file = new File(['data'], 'test.jpg', {type: 'image/jpeg'})
        const input = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(input, 'files', {value: [file], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await flushPromises()

        expect(wrapper.emitted('uploaded')).toBeTruthy()
        expect(wrapper.emitted('uploaded')![0]).toEqual([{jobId: 'job-abc'}])
    })

    it('accept prop을 파일 input에 그대로 전달한다', () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split', accept: '.pdf'},
        })
        expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('.pdf')
    })

    it('multiple=false면 파일 input에 multiple 속성이 없다', () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split', multiple: false},
        })
        expect(wrapper.find('input[type="file"]').attributes('multiple')).toBeUndefined()
    })

    it('multiple=false면 안내 문구에 다중 업로드 가능 표시를 하지 않는다', () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split', multiple: false},
        })
        expect(wrapper.text()).not.toContain('여러 파일 동시 업로드 가능')
    })

    it('multiple=true(기본값)면 안내 문구에 다중 업로드 가능 표시를 한다', () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge'},
        })
        expect(wrapper.text()).toContain('여러 파일 동시 업로드 가능')
    })

    it('multiple=false에서 여러 파일을 선택해도 첫 번째 파일만 업로드한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split', multiple: false},
        })

        const file1 = new File(['a'], 'a.pdf')
        const file2 = new File(['b'], 'b.pdf')
        const input = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(input, 'files', {value: [file1, file2], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await flushPromises()

        const form = mockPost.mock.calls[0][1] as FormData
        expect(form.getAll('files')).toHaveLength(1)
        expect((form.getAll('files')[0] as File).name).toBe('a.pdf')
    })

    it('reorderable=true면 파일 선택 시 즉시 업로드하지 않고 목록에 쌓는다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge', reorderable: true},
        })

        const file = new File(['a'], 'a.pdf')
        const input = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(input, 'files', {value: [file], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await flushPromises()

        expect(mockPost).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('a.pdf')
    })

    it('reorderable=true에서 순서 변경 후 업로드 버튼을 누르면 변경된 순서로 전송한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge', reorderable: true},
        })

        const file1 = new File(['a'], 'a.pdf')
        const file2 = new File(['b'], 'b.pdf')
        const input = wrapper.find('input[type="file"]').element as HTMLInputElement
        Object.defineProperty(input, 'files', {value: [file1, file2], configurable: true})
        await wrapper.find('input[type="file"]').trigger('change')
        await flushPromises()

        await wrapper.find('[data-testid="move-down-0"]').trigger('click')
        await wrapper.find('[data-testid="confirm-upload"]').trigger('click')
        await flushPromises()

        const form = mockPost.mock.calls[0][1] as FormData
        const names = form.getAll('files').map(f => (f as File).name)
        expect(names).toEqual(['b.pdf', 'a.pdf'])
        expect(wrapper.emitted('uploaded')![0]).toEqual([{jobId: 'job-abc'}])
    })
})
