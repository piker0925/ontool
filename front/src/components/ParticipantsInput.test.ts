import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import ParticipantsInput from './ParticipantsInput.vue'

function findNameInput(wrapper: ReturnType<typeof mount>) {
    return wrapper.find('input[placeholder="이름 입력 후 Enter (쉼표로 여러 명 붙여넣기 가능)"]')
}

describe('ParticipantsInput', () => {
    it('이름을 입력하고 Enter를 누르면 칩으로 추가되고 입력창이 비워진다', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: []}})
        const input = findNameInput(wrapper)

        await input.setValue('철수')
        await input.trigger('keydown', {key: 'Enter'})

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted![0][0]).toEqual(['철수'])
        expect((findNameInput(wrapper).element as HTMLInputElement).value).toBe('')
    })

    it('쉼표로 구분해 여러 명을 붙여넣으면 각각 별도 칩으로 추가된다 (빈 조각은 버림)', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: []}})
        const input = findNameInput(wrapper)

        const dataTransfer = {getData: () => '영희, 민수,, 지훈'}
        await input.trigger('paste', {clipboardData: dataTransfer})

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted![emitted!.length - 1][0]).toEqual(['영희', '민수', '지훈'])
    })

    it('입력창이 비어 있을 때 Backspace를 누르면 마지막 참가자가 삭제된다 (입력창에 글자가 있으면 삭제 안 함)', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: ['철수', '영희']}})
        const input = findNameInput(wrapper)

        // 입력창에 글자가 남아있는 상태에서는 참가자를 지우지 않는다
        await input.setValue('민')
        await input.trigger('keydown', {key: 'Backspace'})
        expect(wrapper.emitted('update:modelValue')).toBeFalsy()

        // 입력창을 비운 뒤 Backspace를 누르면 마지막 참가자만 지운다
        await input.setValue('')
        await input.trigger('keydown', {key: 'Backspace'})
        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted![emitted!.length - 1][0]).toEqual(['철수'])
    })

    it('IME 조합 중(isComposing) Enter는 커밋으로 처리하지 않는다', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: []}})
        const input = findNameInput(wrapper)

        await input.setValue('한')
        await input.trigger('keydown', {key: 'Enter', isComposing: true})

        // 조합 중 Enter는 무시되어 아직 커밋되지 않았어야 한다
        expect(wrapper.emitted('update:modelValue')).toBeFalsy()
        expect((findNameInput(wrapper).element as HTMLInputElement).value).toBe('한')
    })

    it('참가자가 있을 때 "전체 삭제"를 누르면 목록이 비워진다', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: ['철수', '영희']}})

        const clearButton = wrapper.findAll('button').find(b => b.text() === '전체 삭제')
        expect(clearButton).toBeTruthy()
        await clearButton!.trigger('click')

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted![emitted!.length - 1][0]).toEqual([])
    })

    it('개별 참가자 칩의 삭제 버튼을 누르면 그 참가자만 제거된다 (다른 참가자는 유지)', async () => {
        const wrapper = mount(ParticipantsInput, {props: {modelValue: ['철수', '영희', '민수']}})

        const removeButton = wrapper.find('[title="영희 삭제"]')
        expect(removeButton.exists()).toBe(true)
        await removeButton.trigger('click')

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted![emitted!.length - 1][0]).toEqual(['철수', '민수'])
    })

    it('참가자가 없을 때만 "예시로 채워보기" 버튼이 보이고, 누르면 예시 이름들로 채워진다', async () => {
        const empty = mount(ParticipantsInput, {props: {modelValue: []}})
        const sampleButton = empty.findAll('button').find(b => b.text().includes('예시로 채워보기'))
        expect(sampleButton).toBeTruthy()

        await sampleButton!.trigger('click')
        const emitted = empty.emitted('update:modelValue')
        const sample = emitted![emitted!.length - 1][0] as string[]
        expect(sample.length).toBeGreaterThan(1)
        expect(new Set(sample).size).toBe(sample.length)

        const nonEmpty = mount(ParticipantsInput, {props: {modelValue: ['철수']}})
        expect(nonEmpty.findAll('button').some(b => b.text().includes('예시로 채워보기'))).toBe(false)
    })
})
