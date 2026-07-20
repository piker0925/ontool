import {describe, expect, it} from 'vitest'
import {buildBoxShadowCss, buildGradientCss} from './cssGradient'

describe('buildGradientCss', () => {
    it('레이어 1개: 색상 2개 + 각도로 linear-gradient 문자열을 생성한다', () => {
        const css = buildGradientCss([{angleDeg: 90, colors: ['#ff0000', '#0000ff']}])
        expect(css).toBe('linear-gradient(90deg, #ff0000, #0000ff)')
    })

    it('레이어 2개 이상: 각 레이어의 색상·각도가 모두 콤마로 이어진 CSS에 포함된다', () => {
        const css = buildGradientCss([
            {angleDeg: 90, colors: ['#ff0000', '#0000ff']},
            {angleDeg: 45, colors: ['#00ff00', '#ffff00']},
        ])
        expect(css).toBe('linear-gradient(90deg, #ff0000, #0000ff), linear-gradient(45deg, #00ff00, #ffff00)')
    })
})

describe('buildBoxShadowCss', () => {
    it('레이어 1개: offset·blur·spread·색상을 포함한 box-shadow 값을 생성한다', () => {
        const css = buildBoxShadowCss([{x: 2, y: 2, blur: 4, spread: 0, color: '#000000'}])
        expect(css).toBe('2px 2px 4px 0px #000000')
    })

    it('레이어 2개 이상 + inset: 콤마로 이어지고 inset 레이어는 접두어가 붙는다', () => {
        const css = buildBoxShadowCss([
            {x: 0, y: 0, blur: 10, spread: 0, color: '#ffffff', inset: true},
            {x: 2, y: 2, blur: 4, spread: 0, color: '#000000'},
        ])
        expect(css).toBe('inset 0px 0px 10px 0px #ffffff, 2px 2px 4px 0px #000000')
    })
})
