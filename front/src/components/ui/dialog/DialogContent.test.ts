import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {defineComponent} from 'vue'
import {flushPromises} from '@vue/test-utils'
import {Dialog, DialogContent, DialogTitle} from './index'

const Harness = defineComponent({
    components: {Dialog, DialogContent, DialogTitle},
    template: `
      <Dialog :open="true">
        <DialogContent>
          <DialogTitle>제목</DialogTitle>
        </DialogContent>
      </Dialog>
    `,
})

describe('DialogContent — overscroll 격리', () => {
    it('overscroll-contain 클래스를 포함해 배경 스크롤 전파(overscroll chaining)를 막는다', async () => {
        const wrapper = mount(Harness, {attachTo: document.body})
        await flushPromises()

        const content = document.body.querySelector('[data-slot="dialog-content"]')
        expect(content).not.toBeNull()
        expect(content!.className).toContain('overscroll-contain')

        wrapper.unmount()
    })
})
