export interface PixelBuffer {
    width: number
    height: number
    data: Uint8ClampedArray
}

export const DEFAULT_CHARSET = ' .:-=+*#%@'

export interface AsciiCharsetPreset {
    id: string
    label: string
    charset: string
}

export const ASCII_CHARSET_PRESETS: AsciiCharsetPreset[] = [
    {id: 'standard', label: '표준', charset: DEFAULT_CHARSET},
    {id: 'blocks', label: '블록', charset: ' ░▒▓█'},
    {id: 'binary', label: '이진', charset: ' #'},
]

const CHAR_ASPECT_RATIO = 0.55 // 문자 셀이 픽셀보다 세로로 길어서 보정

/** 이미지를 그레이스케일로 변환한 뒤 밝기별 문자로 매핑해 아스키 아트 문자열을 만든다. */
export function imageToAscii(source: PixelBuffer, columns: number, charset: string = DEFAULT_CHARSET): string {
    const rows = Math.max(1, Math.round(columns * (source.height / source.width) * CHAR_ASPECT_RATIO))
    const lines: string[] = []

    for (let row = 0; row < rows; row++) {
        let line = ''
        for (let col = 0; col < columns; col++) {
            const x = Math.min(source.width - 1, Math.floor((col / columns) * source.width))
            const y = Math.min(source.height - 1, Math.floor((row / rows) * source.height))
            const o = (y * source.width + x) * 4
            const gray = (source.data[o] + source.data[o + 1] + source.data[o + 2]) / 3
            const idx = Math.floor((1 - gray / 255) * (charset.length - 1))
            line += charset[idx]
        }
        lines.push(line)
    }

    return lines.join('\n')
}
