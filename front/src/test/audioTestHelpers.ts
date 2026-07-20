// 테스트 전용 헬퍼. 프로덕션 코드(utils/audioPitch.ts 등)와 독립적으로 구현해야
// "결과를 결과로 검증"하는 동어반복 테스트가 되지 않는다 — 여기 함수들은 절대
// utils/audio*.ts를 import하지 않는다.

/**
 * mono Float32Array에서 자기상관(autocorrelation)으로 기본 주파수(Hz)를 추정한다.
 * FFT보다 구현이 단순하고, 순음(sine)류 테스트 신호에 대해 충분히 정확하다.
 */
export function detectFundamentalFrequency(mono: Float32Array, sampleRate: number): number {
    const minFreq = 50
    const maxFreq = 2000
    const maxLag = Math.floor(sampleRate / minFreq)
    const minLag = Math.floor(sampleRate / maxFreq)

    // 고정 윈도우(모든 lag에 대해 같은 표본 수)로 정규화된 자기상관을 계산한다 — 윈도우가
    // lag마다 줄어들면(0..N-lag) 경계 효과로 배음(옥타브) 쪽 lag가 잘못 더 크게 나올 수 있다.
    const windowSize = mono.length - maxLag
    if (windowSize <= 0) return 0

    const correlations = new Float32Array(maxLag + 1)
    for (let lag = 0; lag <= maxLag; lag++) {
        let sum = 0
        for (let i = 0; i < windowSize; i++) {
            sum += mono[i] * mono[i + lag]
        }
        correlations[lag] = sum
    }

    // 옥타브 오류(주기의 배수를 기본 주파수로 착각)를 피하기 위해, minLag 이후 나타나는
    // "첫 번째 국소 최댓값"을 기본 주기로 삼는다(순음의 자기상관은 배수 lag마다 비슷한
    // 크기의 피크가 반복되므로 전역 최댓값을 찾으면 배음을 고를 위험이 크다).
    let bestLag = -1
    for (let lag = minLag + 1; lag < maxLag; lag++) {
        if (correlations[lag] > correlations[lag - 1] && correlations[lag] >= correlations[lag + 1] && correlations[lag] > 0) {
            bestLag = lag
            break
        }
    }

    if (bestLag <= 0) return 0
    return sampleRate / bestLag
}

/** interleaved 스테레오/모노 PCM에서 왼쪽(첫) 채널만 뽑아 mono Float32Array로 만든다. */
export function extractFirstChannel(interleaved: Float32Array, channels: number): Float32Array {
    const frames = interleaved.length / channels
    const mono = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
        mono[i] = interleaved[i * channels]
    }
    return mono
}

/** 순음(sine) 테스트 신호를 생성한다. */
export function generateSineWave(
    frequency: number, durationSeconds: number, sampleRate: number, amplitude = 0.5, channels = 2,
): Float32Array {
    const frameTotal = Math.round(durationSeconds * sampleRate)
    const interleaved = new Float32Array(frameTotal * channels)
    for (let i = 0; i < frameTotal; i++) {
        const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude
        for (let c = 0; c < channels; c++) {
            interleaved[i * channels + c] = sample
        }
    }
    return interleaved
}

/** interleaved PCM 전체에서 피크(최대 절대값) 레벨을 구한다. */
export function peakAmplitude(interleaved: Float32Array): number {
    let peak = 0
    for (const v of interleaved) {
        const abs = Math.abs(v)
        if (abs > peak) peak = abs
    }
    return peak
}

/** 선형 진폭을 dBFS로 변환한다 (0dBFS = 풀스케일 1.0). */
export function amplitudeToDbfs(amplitude: number): number {
    if (amplitude <= 0) return -Infinity
    return 20 * Math.log10(amplitude)
}

/**
 * RIFF/WAVE PCM 파일을 직접 파싱한다(utils/audioEncode.ts의 encodeWav와 완전히 독립적인
 * 구현) — encodeWav가 스스로를 검증하는 동어반복을 피하기 위한 테스트 전용 디코더.
 * 16비트 PCM만 지원(이 프로젝트가 인코딩하는 포맷과 동일).
 */
export function decodeWavForTest(bytes: Uint8Array): {interleaved: Float32Array, sampleRate: number, channels: number} {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
    if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('WAV 파일이 아닙니다')

    let offset = 12
    let channels = 0
    let sampleRate = 0
    let bitsPerSample = 0
    let dataOffset = -1
    let dataSize = 0

    while (offset < bytes.length) {
        const chunkId = String.fromCharCode(
            view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
        const chunkSize = view.getUint32(offset + 4, true)
        if (chunkId === 'fmt ') {
            channels = view.getUint16(offset + 10, true)
            sampleRate = view.getUint32(offset + 12, true)
            bitsPerSample = view.getUint16(offset + 22, true)
        } else if (chunkId === 'data') {
            dataOffset = offset + 8
            dataSize = chunkSize
        }
        offset += 8 + chunkSize + (chunkSize % 2)
    }

    if (dataOffset < 0) throw new Error('data 청크를 찾지 못했습니다')
    if (bitsPerSample !== 16) throw new Error('16비트 PCM만 지원합니다')

    const sampleCount = dataSize / 2
    const interleaved = new Float32Array(sampleCount)
    for (let i = 0; i < sampleCount; i++) {
        const int16 = view.getInt16(dataOffset + i * 2, true)
        interleaved[i] = int16 / 32768
    }

    return {interleaved, sampleRate, channels}
}
