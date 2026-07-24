import {describe, expect, it} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {defineComponent} from 'vue'
import {Dialog, DialogScrollContent, DialogTitle} from './index'

const Harness = defineComponent({
    components: {Dialog, DialogScrollContent, DialogTitle},
    template: `
      <Dialog :open="true">
        <DialogScrollContent>
          <DialogTitle>제목</DialogTitle>
        </DialogScrollContent>
      </Dialog>
    `,
})

describe('DialogScrollContent — overscroll 격리', () => {
    it('스크롤 가능한 오버레이 영역에 overscroll-contain이 적용되어 배경 스크롤로 전파되지 않는다', async () => {
        const wrapper = mount(Harness, {attachTo: document.body})
        await flushPromises()

        const scrollableOverlay = document.body.querySelector('.overflow-y-auto')
        expect(scrollableOverlay).not.toBeNull()
        expect(scrollableOverlay!.className).toContain('overscroll-contain')

        wrapper.unmount()
    })
})
