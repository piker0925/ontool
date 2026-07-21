import {describe, expect, it} from 'vitest'
import {isOversizedFile, oversizedFileMessage} from './fileSizeLimit'

const LIMIT = 50 * 1024 * 1024

function fileOfSize(name: string, size: number): File {
    const f = new File(['x'], name)
    Object.defineProperty(f, 'size', {value: size})
    return f
}

describe('fileSizeLimit', () => {
    it('한도 이하 파일은 초과로 판정하지 않는다', () => {
        expect(isOversizedFile(fileOfSize('small.mp4', LIMIT), LIMIT)).toBe(false)
    })

    it('한도를 초과한 파일은 초과로 판정한다', () => {
        expect(isOversizedFile(fileOfSize('big.mp4', LIMIT + 1), LIMIT)).toBe(true)
    })

    it('한도가 0 이하(모듈 정보 로딩 전 등)면 크기와 무관하게 초과로 판정하지 않는다', () => {
        expect(isOversizedFile(fileOfSize('huge.mp4', 999 * 1024 * 1024), 0)).toBe(false)
    })

    it('초과 메시지에 파일명과 실제 크기(MB), 한도(MB)를 포함한다', () => {
        const msg = oversizedFileMessage(fileOfSize('movie.mp4', 78.3 * 1024 * 1024), LIMIT)
        expect(msg).toContain('movie.mp4')
        expect(msg).toContain('78.3MB')
        expect(msg).toContain('50.0MB')
    })
})
