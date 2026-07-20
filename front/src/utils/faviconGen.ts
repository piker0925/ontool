export interface FaviconImage {
    size: number
    pngData: Uint8Array
}

const ICONDIR_SIZE = 6
const ICONDIRENTRY_SIZE = 16

/** PNG로 인코딩된 여러 사이즈 이미지를 하나의 .ico 컨테이너로 묶는다 (Vista 이후 PNG 임베드 방식). */
export function encodeIco(images: FaviconImage[]): Uint8Array {
    const headerSize = ICONDIR_SIZE + images.length * ICONDIRENTRY_SIZE
    const totalSize = headerSize + images.reduce((sum, img) => sum + img.pngData.length, 0)
    const buffer = new Uint8Array(totalSize)
    const view = new DataView(buffer.buffer)

    view.setUint16(0, 0, true) // reserved
    view.setUint16(2, 1, true) // type: icon
    view.setUint16(4, images.length, true)

    let dataOffset = headerSize
    images.forEach((img, i) => {
        const entryOffset = ICONDIR_SIZE + i * ICONDIRENTRY_SIZE
        const dim = img.size >= 256 ? 0 : img.size // 256은 1바이트에 못 담아 0으로 표기
        view.setUint8(entryOffset, dim) // width
        view.setUint8(entryOffset + 1, dim) // height
        view.setUint8(entryOffset + 2, 0) // color count
        view.setUint8(entryOffset + 3, 0) // reserved
        view.setUint16(entryOffset + 4, 1, true) // planes
        view.setUint16(entryOffset + 6, 32, true) // bit count
        view.setUint32(entryOffset + 8, img.pngData.length, true) // bytes in resource
        view.setUint32(entryOffset + 12, dataOffset, true) // image offset

        buffer.set(img.pngData, dataOffset)
        dataOffset += img.pngData.length
    })

    return buffer
}

/** .ico 컨테이너의 ICONDIR 엔트리를 읽어 실제로 포함된 이미지 사이즈 목록을 반환한다. */
export function decodeIcoSizes(ico: Uint8Array): number[] {
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength)
    const count = view.getUint16(4, true)
    const sizes: number[] = []

    for (let i = 0; i < count; i++) {
        const entryOffset = ICONDIR_SIZE + i * ICONDIRENTRY_SIZE
        const width = view.getUint8(entryOffset)
        sizes.push(width === 0 ? 256 : width)
    }

    return sizes
}
