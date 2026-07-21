import {beforeEach, describe, expect, it, vi} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import FileUploader from './FileUploader.vue'
import {apiClient} from '../api/client'
import {readImageDimensions} from '../utils/imageDimensions'

vi.mock('../api/client', () => ({
    apiClient: {post: vi.fn()},
}))

// jsdom은 실제 이미지를 디코딩하지 못해 Image.onload가 안 뜨므로, 크기를 읽는
// 유틸 자체를 모킹한다 — FileUploader가 그 결과를 올바르게 emit하는지만 검증한다.
vi.mock('../utils/imageDimensions', () => ({
    readImageDimensions: vi.fn(),
}))

const mockPost = apiClient.post as ReturnType<typeof vi.fn>
const mockReadImageDimensions = readImageDimensions as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

// 파일 선택(input change) 구동 — 브라우저에서 파일을 드롭/선택한 것과 같다.
// 034 이후 선택은 스테이징만 하고, 실행은 confirm-upload 버튼 클릭으로 일어난다.
async function selectFiles(wrapper: ReturnType<typeof mount>, files: File[]) {
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', {value: files, configurable: true})
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()
}

async function clickRun(wrapper: ReturnType<typeof mount>) {
    await wrapper.find('[data-testid="confirm-upload"]').trigger('click')
    await flushPromises()
}

describe('FileUploader', () => {
    it('스테이징한 파일을 실행하면 uploaded 이벤트로 jobId를 emit한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-to-pdf'},
        })

        await selectFiles(wrapper, [new File(['data'], 'test.jpg', {type: 'image/jpeg'})])

        // 선택만으로는 업로드되지 않는다 — 실행 버튼을 눌러야 한다.
        expect(mockPost).not.toHaveBeenCalled()

        await clickRun(wrapper)

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

    it('multiple=false면 여러 파일을 선택해도 첫 번째 파일만 스테이징·전송한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split', multiple: false},
        })

        await selectFiles(wrapper, [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')])
        await clickRun(wrapper)

        const form = mockPost.mock.calls[0][1] as FormData
        expect(form.getAll('files')).toHaveLength(1)
        expect((form.getAll('files')[0] as File).name).toBe('a.pdf')
    })

    it('reorderable=true면 파일 선택 시 즉시 업로드하지 않고 목록에 쌓고 순서 조정 버튼을 보여준다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge', reorderable: true},
        })

        await selectFiles(wrapper, [new File(['a'], 'a.pdf')])

        expect(mockPost).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('a.pdf')
        // reorderable이면 순서 조정 버튼이 있다 (아래 비-reorderable 케이스와 대비되는 행위자).
        expect(wrapper.find('[data-testid="move-up-0"]').exists()).toBe(true)
    })

    it('reorderable이 아닌 모듈은 스테이징·실행 버튼은 있지만 순서 조정 버튼은 없다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [new File(['data'], 'photo.jpg', {type: 'image/jpeg'})])

        expect(mockPost).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('photo.jpg')
        expect(wrapper.find('[data-testid="confirm-upload"]').exists()).toBe(true)
        // reorderable이 아니므로 순서 조정 버튼은 렌더되지 않는다 (v-if="reorderable").
        expect(wrapper.find('[data-testid="move-up-0"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="move-down-0"]').exists()).toBe(false)
    })

    it('파라미터 없는 도구(vuln-scan)도 파일 선택 시 즉시 업로드하지 않고 스테이징한다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'vuln-scan'},
        })

        await selectFiles(wrapper, [new File(['jar'], 'app.jar')])

        // 조정할 파라미터가 없어도 스테이징한다 — 잘못 올린 파일을 실행 전에 뺄 수 있어야 한다.
        expect(mockPost).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('app.jar')
        expect(wrapper.find('[data-testid="confirm-upload"]').exists()).toBe(true)
    })

    it('스테이징한 파일을 ✕로 제거하면 그 파일만 목록에서 사라지고 나머지는 남는다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [new File(['a'], 'alpha.png'), new File(['b'], 'bravo.png')])
        expect(wrapper.text()).toContain('alpha.png')
        expect(wrapper.text()).toContain('bravo.png')

        await wrapper.find('[data-testid="remove-0"]').trigger('click')
        await flushPromises()

        // 제거한 파일만 사라지고 나머지는 유지된다 — 두 행위자(제거 대상/유지 대상)로 구분.
        expect(wrapper.text()).not.toContain('alpha.png')
        expect(wrapper.text()).toContain('bravo.png')
        expect(mockPost).not.toHaveBeenCalled()
    })

    it('파일 선택 후 파라미터를 바꾸면 실행 시점(버튼 클릭)의 파라미터 값으로 전송한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-x'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize', params: {width: '100'}},
        })

        await selectFiles(wrapper, [new File(['d'], 'p.png', {type: 'image/png'})])

        // 파일 선택 후 파라미터 변경 → 실행 시점 값이 반영돼야 한다.
        await wrapper.setProps({params: {width: '200'}})
        await clickRun(wrapper)

        const form = mockPost.mock.calls[0][1] as FormData
        expect(form.get('width')).toBe('200') // 선택 시점 '100'이 아니라 실행 시점 '200'
    })

    it('실행 버튼 문구는 단일이면 "실행", 배치(2개 이상)면 파일 개수를 포함한다', async () => {
        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [new File(['a'], 'a.png')])
        expect(wrapper.find('[data-testid="confirm-upload"]').text()).toBe('실행')

        await selectFiles(wrapper, [new File(['b'], 'b.png')])
        expect(wrapper.find('[data-testid="confirm-upload"]').text()).toContain('2개')
    })

    it('스테이징 후 실행이 413으로 실패하면 uploaded 대신 error 이벤트에 크기 메시지를 emit한다', async () => {
        mockPost.mockRejectedValueOnce({response: {status: 413, data: ''}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-to-pdf'},
        })

        await selectFiles(wrapper, [new File(['data'], 'big.jpg', {type: 'image/jpeg'})])
        await clickRun(wrapper)

        expect(wrapper.emitted('uploaded')).toBeFalsy()
        expect(wrapper.emitted('error')).toBeTruthy()
        expect((wrapper.emitted('error')![0][0] as string)).toContain('크기')
    })

    it('업로드가 실패하면 스테이징한 파일 목록을 유지해 재시도할 수 있다', async () => {
        mockPost.mockRejectedValueOnce({response: {status: 429, data: {message: '쿼터 초과'}}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge', reorderable: true},
        })

        await selectFiles(wrapper, [new File(['a'], 'a.pdf')])
        await clickRun(wrapper)

        expect(wrapper.emitted('error')).toBeTruthy()
        // 실패 후에도 파일이 목록에 남아 있어야 한다.
        expect(wrapper.text()).toContain('a.pdf')
        expect(wrapper.find('[data-testid="confirm-upload"]').exists()).toBe(true)
    })

    it('reorderable=true에서 순서 변경 후 업로드 버튼을 누르면 변경된 순서로 전송한다', async () => {
        mockPost.mockResolvedValueOnce({data: {jobId: 'job-abc'}})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-merge', reorderable: true},
        })

        await selectFiles(wrapper, [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')])

        await wrapper.find('[data-testid="move-down-0"]').trigger('click')
        await clickRun(wrapper)

        const form = mockPost.mock.calls[0][1] as FormData
        const names = form.getAll('files').map(f => (f as File).name)
        expect(names).toEqual(['b.pdf', 'a.pdf'])
        expect(wrapper.emitted('uploaded')![0]).toEqual([{jobId: 'job-abc'}])
    })

    it('이미지 1장만 스테이징하면 실제 픽셀 크기를 dimensions 이벤트로 emit한다', async () => {
        mockReadImageDimensions.mockResolvedValueOnce({width: 800, height: 600})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [new File(['a'], 'photo.png', {type: 'image/png'})])

        const emitted = wrapper.emitted('dimensions')!
        expect(emitted[emitted.length - 1]).toEqual([{width: 800, height: 600}])
    })

    it('이미지가 2장 이상이면 어느 파일 기준인지 애매하므로 dimensions로 null을 emit한다', async () => {
        mockReadImageDimensions.mockResolvedValue({width: 800, height: 600})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [
            new File(['a'], 'a.png', {type: 'image/png'}),
            new File(['b'], 'b.png', {type: 'image/png'}),
        ])

        const emitted = wrapper.emitted('dimensions')!
        expect(emitted[emitted.length - 1]).toEqual([null])
    })

    it('1장이던 파일을 제거해 0장이 되면 dimensions로 null을 emit한다', async () => {
        mockReadImageDimensions.mockResolvedValueOnce({width: 800, height: 600})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'image-resize'},
        })

        await selectFiles(wrapper, [new File(['a'], 'photo.png', {type: 'image/png'})])
        expect(wrapper.emitted('dimensions')!.at(-1)).toEqual([{width: 800, height: 600}])

        await wrapper.find('[data-testid="remove-0"]').trigger('click')
        await flushPromises()

        expect(wrapper.emitted('dimensions')!.at(-1)).toEqual([null])
    })

    it('서버가 내려준 한도를 초과하는 파일은 스테이징하지 않고 선택 즉시 error를 emit한다', async () => {
        const big = new File(['x'], 'huge.mp4')
        Object.defineProperty(big, 'size', {value: 50 * 1024 * 1024 + 1})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'video-metadata', maxFileSizeBytes: 50 * 1024 * 1024},
        })

        await selectFiles(wrapper, [big])

        // 왕복 없이 즉시 걸러야 하므로 서버 호출 자체가 없어야 한다.
        expect(mockPost).not.toHaveBeenCalled()
        expect(wrapper.text()).not.toContain('huge.mp4')
        expect(wrapper.emitted('error')).toBeTruthy()
        expect((wrapper.emitted('error')![0][0] as string)).toContain('huge.mp4')
    })

    it('maxFileSizeBytes를 안 주면(모듈 정보 로딩 전 등) 클라이언트 사전검증을 건너뛰고 정상 스테이징한다', async () => {
        const big = new File(['x'], 'huge.mp4')
        Object.defineProperty(big, 'size', {value: 999 * 1024 * 1024})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'video-metadata'},
        })

        await selectFiles(wrapper, [big])

        expect(wrapper.text()).toContain('huge.mp4')
        expect(wrapper.emitted('error')).toBeFalsy()
    })

    it('여러 파일 중 한도 초과분만 걸러내고 나머지는 정상 스테이징한다', async () => {
        const ok = new File(['a'], 'ok.mp4')
        const big = new File(['x'], 'huge.mp4')
        Object.defineProperty(big, 'size', {value: 50 * 1024 * 1024 + 1})

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'video-merge', multiple: true, maxFileSizeBytes: 50 * 1024 * 1024},
        })

        await selectFiles(wrapper, [ok, big])

        expect(wrapper.text()).toContain('ok.mp4')
        expect(wrapper.text()).not.toContain('huge.mp4')
        expect(wrapper.emitted('error')).toBeTruthy()
    })

    it('업로드 중에는 실행 버튼이 비활성화되고 문구가 바뀐다', async () => {
        let resolvePost: (v: unknown) => void
        mockPost.mockReturnValueOnce(new Promise(resolve => {
            resolvePost = resolve
        }))

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'video-metadata'},
        })

        await selectFiles(wrapper, [new File(['data'], 'clip.mp4')])
        await wrapper.find('[data-testid="confirm-upload"]').trigger('click')
        await flushPromises()

        const button = wrapper.find('[data-testid="confirm-upload"]')
        expect(button.attributes('disabled')).toBeDefined()
        expect(button.text()).toContain('업로드 중')

        resolvePost!({data: {jobId: 'job-1'}})
        await flushPromises()

        expect(wrapper.emitted('uploaded')![0]).toEqual([{jobId: 'job-1'}])
    })

    it('업로드 진행 중에는 실제 전송률(%)을 버튼에 표시한다', async () => {
        let capturedOnProgress: ((e: {loaded: number; total?: number}) => void) | undefined
        mockPost.mockImplementationOnce((_url, _form, config) => {
            capturedOnProgress = config?.onUploadProgress
            return new Promise(() => {
            }) // 이 테스트는 진행 중 상태만 관찰하므로 끝까지 resolve하지 않는다.
        })

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'video-metadata'},
        })

        await selectFiles(wrapper, [new File(['data'], 'clip.mp4')])
        await wrapper.find('[data-testid="confirm-upload"]').trigger('click')
        await flushPromises()

        expect(capturedOnProgress).toBeTypeOf('function')
        capturedOnProgress!({loaded: 42, total: 100})
        await flushPromises()

        expect(wrapper.find('[data-testid="confirm-upload"]').text()).toContain('42%')
    })

    it('이미지가 아닌 파일(PDF)은 크기를 읽지 못해도 dimensions는 null로 유지된다', async () => {
        mockReadImageDimensions.mockResolvedValueOnce(null)

        const wrapper = mount(FileUploader, {
            props: {moduleId: 'pdf-split'},
        })

        await selectFiles(wrapper, [new File(['a'], 'doc.pdf', {type: 'application/pdf'})])

        expect(wrapper.emitted('dimensions')?.at(-1)).toEqual([null])
    })
})
