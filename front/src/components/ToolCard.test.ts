import {describe, expect, it} from 'vitest'
import {flushPromises, mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import ToolCard from './ToolCard.vue'
import type {Module} from '../types'

function createTestRouter() {
    return createRouter({history: createMemoryHistory(), routes: [{path: '/tools/:moduleId', component: {template: '<div/>'}}]})
}

const router = createTestRouter()

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

describe('ToolCard — 네비게이션 시맨틱', () => {
    it('카드 루트가 올바른 href를 가진 실제 링크(a)로 렌더링된다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({id: 'json-formatter'})}, global: {plugins: [createTestRouter()]}})
        const link = wrapper.find('a')
        expect(link.exists()).toBe(true)
        expect(link.attributes('href')).toBe('/tools/json-formatter')
    })

    it('링크에는 tabindex=-1이 없어 Tab 키로 포커스가 가능하다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({id: 'json-formatter'})}, global: {plugins: [createTestRouter()]}})
        const link = wrapper.find('a')
        expect(link.attributes('tabindex')).not.toBe('-1')
    })

    it('링크를 클릭하면(Enter 키가 네이티브로 발생시키는 것과 동일한 이벤트) 라우터가 해당 도구 경로로 이동한다', async () => {
        const testRouter = createTestRouter()
        await testRouter.push('/')
        const wrapper = mount(ToolCard, {props: {mod: baseModule({id: 'json-formatter'})}, global: {plugins: [testRouter]}})
        await wrapper.find('a').trigger('click')
        await flushPromises()
        expect(testRouter.currentRoute.value.fullPath).toBe('/tools/json-formatter')
    })

    it('즐겨찾기 버튼 클릭은 이벤트 전파를 막아 카드 네비게이션을 트리거하지 않는다', async () => {
        const testRouter = createTestRouter()
        await testRouter.push('/')
        const wrapper = mount(ToolCard, {props: {mod: baseModule({id: 'json-formatter'})}, global: {plugins: [testRouter]}})
        await wrapper.find('button').trigger('click')
        await flushPromises()
        expect(testRouter.currentRoute.value.fullPath).toBe('/')
    })

    it('title 속성이 유지된다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({id: 'json-formatter', description: '설명입니다'})}, global: {plugins: [createTestRouter()]}})
        expect(wrapper.find('a').attributes('title')).toBe('설명입니다')
    })
})

describe('ToolCard — 모드별 회귀 없음', () => {
    it('grid 모드에서 gap-3.5/px-4/py-4 클래스가 적용된다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({}), mode: 'grid'}, global: {plugins: [createTestRouter()]}})
        const link = wrapper.find('a')
        expect(link.classes()).toEqual(expect.arrayContaining(['gap-3.5', 'px-4', 'py-4']))
    })

    it('list 모드에서 gap-3/px-3/py-2.5 클래스가 적용된다', () => {
        const wrapper = mount(ToolCard, {props: {mod: baseModule({}), mode: 'list'}, global: {plugins: [createTestRouter()]}})
        const link = wrapper.find('a')
        expect(link.classes()).toEqual(expect.arrayContaining(['gap-3', 'px-3', 'py-2.5']))
    })
})
