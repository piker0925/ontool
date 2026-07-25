/**
 * WAV(RIFF/WAVE) 파일의 헤더만 읽어 원본 샘플레이트를 알아낸다(데이터는 건드리지 않음).
 *
 * 왜 필요한가(이슈 110): AudioDropzone이 파일을 디코딩할 때 `new AudioContext()`를
 * 옵션 없이 생성하면, 브라우저는 `decodeAudioData` 결과를 하드웨어/OS 기본 출력
 * 샘플레이트(보통 44100 또는 48000Hz)로 강제 리샘플링한다 — 업로드한 WAV가 그 값과
 * 다른 샘플레이트(예: 48kHz 기기에서 44.1kHz WAV 업로드)면 필요 없는 리샘플링이
 * 한 번 더 끼어든다. 실측(docs/benchmarks/110-media-quality-audit)에서 이 손실
 * 자체는 작지만(고품질 리샘플러 기준 SNR ≈ 82dB), "아예 안 거치면 0"이라는 확실한
 * 이득이 있고 비용은 헤더 44바이트를 읽는 것뿐이라 하지 않을 이유가 없다.
 *
 * WAV가 아니거나 파싱할 수 없으면 null을 반환한다 — 호출부는 이 경우 기본 AudioContext로
 * 폴백한다(비-WAV 입력, 예: mp3는 디코드 전에 네이티브 샘플레이트를 알 방법이 없다).
 */
export function sniffWavSampleRate(bytes: ArrayBuffer): number | null {
    if (bytes.byteLength < 44) return null
    const view = new DataView(bytes)

    const riff = readAscii(view, 0, 4)
    const wave = readAscii(view, 8, 4)
    if (riff !== 'RIFF' || wave !== 'WAVE') return null

    let offset = 12
    while (offset + 8 <= view.byteLength) {
        const chunkId = readAscii(view, offset, 4)
        const chunkSize = view.getUint32(offset + 4, true)
        if (chunkId === 'fmt ' && offset + 16 <= view.byteLength) {
            const sampleRate = view.getUint32(offset + 12, true)
            return sampleRate > 0 ? sampleRate : null
        }
        offset += 8 + chunkSize + (chunkSize % 2)
    }
    return null
}

function readAscii(view: DataView, offset: number, length: number): string {
    let s = ''
    for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i))
    return s
}
