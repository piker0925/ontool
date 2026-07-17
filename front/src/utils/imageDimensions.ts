export interface PixelSize {
    width: number
    height: number
}

/** 브라우저에서 이미지 파일의 실제 픽셀 크기를 읽는다. 이미지가 아니거나 디코딩 실패 시 null. */
export function readImageDimensions(file: File): Promise<PixelSize | null> {
    if (!file.type.startsWith('image/')) return Promise.resolve(null)
    return new Promise(resolve => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve({width: img.naturalWidth, height: img.naturalHeight})
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve(null)
        }
        img.src = url
    })
}
