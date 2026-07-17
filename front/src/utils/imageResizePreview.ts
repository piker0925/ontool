export interface Size {
    width: number
    height: number
}

export interface ResizeParams {
    unit: 'px' | '%'
    width: number
    height: number
    keepAspectRatio: boolean
    preventUpscale: boolean
}

/**
 * 백엔드 ImageResizeModule과 동일한 알고리즘(퍼센트→px 환산, 확대 방지 클램프, 종횡비
 * 유지 시 박스에 맞춰 축소·확대)을 그대로 미러링해 실행 전에 결과 크기를 미리 보여준다.
 */
export function predictResizeOutput(source: Size, params: ResizeParams): Size {
    let targetWidth: number
    let targetHeight: number

    if (params.unit === '%') {
        targetWidth = Math.max(1, Math.round(source.width * params.width / 100))
        targetHeight = Math.max(1, Math.round(source.height * params.height / 100))
    } else {
        targetWidth = Math.max(1, Math.round(params.width))
        targetHeight = Math.max(1, Math.round(params.height))
    }

    if (params.preventUpscale) {
        targetWidth = Math.min(targetWidth, source.width)
        targetHeight = Math.min(targetHeight, source.height)
    }

    if (!params.keepAspectRatio) {
        return {width: targetWidth, height: targetHeight}
    }

    // Thumbnailator의 "박스 안에 비율 유지" 방식: 두 축 배율 중 작은 쪽을 채택한다.
    const scale = Math.min(targetWidth / source.width, targetHeight / source.height)
    return {
        width: Math.max(1, Math.round(source.width * scale)),
        height: Math.max(1, Math.round(source.height * scale)),
    }
}
