import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import RandomTeamTool from './RandomTeamTool.vue'

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
    return wrapper.findAll('button').find(b => b.text().trim() === text)
}

async function fillSample(wrapper: ReturnType<typeof mount>) {
    await findButtonByText(wrapper, '예시로 채워보기')!.trigger('click')
}

describe('RandomTeamTool', () => {
    it('참가자가 없으면 "팀 나누기" 버튼이 비활성화되어 있다', () => {
        const wrapper = mount(RandomTeamTool)
        const button = findButtonByText(wrapper, '팀 나누기')
        expect(button?.attributes('disabled')).toBeDefined()
    })

    it('2팀으로 나누면 팀 그룹이 정확히 2개 렌더링되고, 참가자 전원이 정확히 한 팀에만 포함된다', async () => {
        const wrapper = mount(RandomTeamTool)
        await fillSample(wrapper)
        // 팀 수 선택 버튼(2,3,4,5,6) 중 "2" 클릭
        await wrapper.findAll('button').find(b => b.text().trim() === '2')!.trigger('click')
        await findButtonByText(wrapper, '팀 나누기')!.trigger('click')

        const groups = wrapper.findAll('[data-testid="team-group"]')
        expect(groups).toHaveLength(2)

        const allMembers = wrapper.findAll('[data-testid="team-member"]').map(el => el.text())
        expect(allMembers.sort()).toEqual(['민수', '수아', '영희', '예린', '지훈', '철수'].sort())
        expect(new Set(allMembers).size).toBe(allMembers.length)
    })

    it('4팀으로 나누면 팀 그룹이 2팀일 때와 다르게 정확히 4개 렌더링된다 (팀 수 반영 확인)', async () => {
        const wrapper = mount(RandomTeamTool)
        await fillSample(wrapper)
        await wrapper.findAll('button').find(b => b.text().trim() === '4')!.trigger('click')
        await findButtonByText(wrapper, '팀 나누기')!.trigger('click')

        const groups = wrapper.findAll('[data-testid="team-group"]')
        expect(groups).toHaveLength(4)

        const sizes = groups.map(g => g.findAll('[data-testid="team-member"]').length)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(6)
    })

    it('모드 전환 UI(팀 나누기·사다리타기 토글)는 더 이상 존재하지 않는다 (도구 분리 확인)', () => {
        const wrapper = mount(RandomTeamTool)
        expect(findButtonByText(wrapper, '사다리타기')).toBeUndefined()
        expect(wrapper.text()).not.toContain('사다리')
    })
})
