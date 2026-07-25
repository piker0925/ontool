import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import OfficeDocumentConvertPage from './OfficeDocumentConvertPage.vue'
import FileUploader from './FileUploader.vue'
import {Badge} from './ui/badge'

function mountPage() {
    return mount(OfficeDocumentConvertPage, {global: {stubs: {FileUploader: true}}})
}

// 114 재확인 리뷰: FileUploader는 업로드 성공 후에도 staged를 유지하지만, 파일이 실제로 제거되거나
// (개별 제거·부모 clear()) 스테이징이 진짜로 비워지면 여전히 빈 배열로 emit한다. 이 페이지의
// onStaged는 그 신호로 감지된 포맷 배지를 꺼야 한다 — 이전엔 주석만 그렇게 바뀌고 코드(early
// return)는 그대로 남아 있어 배지가 계속 낡은 값으로 표시되는 회귀가 있었다.
describe('OfficeDocumentConvertPage 포맷 배지 (114 재확인)', () => {
    // "베타" Badge는 항상 떠 있으므로 개수(1개→2개)로 포맷 배지 유무를 구분한다.
    it('스테이징된 파일의 확장자로 포맷 배지가 표시된다', async () => {
        const wrapper = mountPage()
        expect(wrapper.findAllComponents(Badge)).toHaveLength(1)

        await wrapper.findComponent(FileUploader).vm.$emit('staged', [new File(['x'], 'report.hwp')])

        const badges = wrapper.findAllComponents(Badge)
        expect(badges).toHaveLength(2)
        expect(badges[0]!.text()).toBe('HWP')
    })

    it('스테이징이 실제로 비워지면(제거/clear) 포맷 배지도 함께 꺼진다', async () => {
        const wrapper = mountPage()
        await wrapper.findComponent(FileUploader).vm.$emit('staged', [new File(['x'], 'report.hwp')])
        expect(wrapper.findAllComponents(Badge)).toHaveLength(2)

        await wrapper.findComponent(FileUploader).vm.$emit('staged', [])

        const badges = wrapper.findAllComponents(Badge)
        expect(badges).toHaveLength(1)
        expect(badges[0]!.text()).toBe('베타')
    })
})
