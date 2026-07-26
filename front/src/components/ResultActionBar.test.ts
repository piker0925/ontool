import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultActionBar from './ResultActionBar.vue'

describe('ResultActionBar.vue', () => {
  it('renders copy button and handles click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    })

    const wrapper = mount(ResultActionBar, {
      props: { text: 'Hello World' }
    })

    const copyBtn = wrapper.find('button[title="클립보드로 복사"]')
    expect(copyBtn.exists()).toBe(true)

    await copyBtn.trigger('click')
    expect(writeTextMock).toHaveBeenCalledWith('Hello World')
  })

  it('renders download button when filename is provided', async () => {
    const wrapper = mount(ResultActionBar, {
      props: { text: 'test content', filename: 'result.txt' }
    })

    const downloadBtn = wrapper.find('button[title="파일로 다운로드"]')
    expect(downloadBtn.exists()).toBe(true)
  })
})
