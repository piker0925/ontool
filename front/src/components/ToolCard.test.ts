import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import ToolCard from './ToolCard.vue'
import type {Module} from '../types'

const router = createRouter({history: createMemoryHistory(), routes: [{path: '/tools/:moduleId', component: {template: '<div/>'}}]})

function baseModule(overrides: Partial<Module>): Module {
    return {id: 'm', name: '모듈', category: '포맷터', isHeavy: false, zones: ['dev'], ...overrides}
}

describe('ToolCard — kind 뱃지', () => {
    it('kind가 game인 모듈은 "게임" 뱃지를 보여준다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({kind: 'game'})}, global: {plugins: [router]}})
        expect(wrapper.text()).toContain('게임')
    })

    it('kind가 game이 아닌 모듈은 "게임" 뱃지를 보여주지 않는다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({kind: 'tool'})}, global: {plugins: [router]}})
        expect(wrapper.text()).not.toContain('게임')
    })
})
