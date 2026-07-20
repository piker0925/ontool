import {describe, expect, it} from 'vitest'
import {buildResultFileNameBase, formatSigned, stripExtension} from './audioFileName'

describe('stripExtension', () => {
    it('마지막 점 뒤의 확장자를 제거한다', () => {
        expect(stripExtension('myvoice.wav')).toBe('myvoice')
    })

    it('점이 여러 개면 마지막 점만 확장자 경계로 본다', () => {
        expect(stripExtension('my.voice.file.mp3')).toBe('my.voice.file')
    })

    it('확장자가 없으면 그대로 반환한다', () => {
        expect(stripExtension('myvoice')).toBe('myvoice')
    })

    it('점으로만 시작하는 파일명은 그대로 반환한다(잘라내면 빈 문자열이 되어 더 이상함)', () => {
        expect(stripExtension('.wav')).toBe('.wav')
    })
})

describe('buildResultFileNameBase', () => {
    it('원본 파일명에서 확장자를 뗀 뒤 접미사를 붙인다', () => {
        expect(buildResultFileNameBase('myvoice.wav', 'pitch+3')).toBe('myvoice_pitch+3')
    })

    it('원본 파일명이 비어 있으면 result로 대체한다', () => {
        expect(buildResultFileNameBase('', 'converted')).toBe('result_converted')
    })
})

describe('formatSigned', () => {
    it('양수에는 +를 붙인다', () => {
        expect(formatSigned(3)).toBe('+3')
    })

    it('음수는 이미 -를 갖고 있으므로 그대로 둔다(이중 부호 방지)', () => {
        expect(formatSigned(-3)).toBe('-3')
    })

    it('0은 양수와 동일하게 +를 붙인다', () => {
        expect(formatSigned(0)).toBe('+0')
    })
})
