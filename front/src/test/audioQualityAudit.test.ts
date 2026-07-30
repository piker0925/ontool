import {describe, expect, it} from 'vitest'
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {encodeMp3, encodeWav} from '../utils/audioEncode'
import {decodeWavForTest, extractFirstChannel} from './audioTestHelpers'
import {findBestLag, alignedSnrDb} from './audioDiffHelpers'

/**
 * 이슈 110 — 오디오 트림/변환(프론트, Web Audio API)의 실제 화질 손실을 실제 음악 샘플로
 * 정량 측정한다. 순음(sine) 합성 신호 대신 실제 CC BY 3.0 음악(Wikimedia Commons,
 * Raspberrymusic - "Epic Trailer Dramatic", 44.1kHz/16bit 오케스트라 트랙 10초 발췌)을 쓴다 —
 * 순음은 MP3의 심리음향 모델이 다루기 가장 쉬운 신호라 실제 손실을 과소평가한다.
 *
 * Node에는 실용적인 mp3 디코더가 없다(audioEncode.test.ts 주석 참조)는 한계를, 여기서는
 * 로컬에 있는 ffmpeg를 "독립적인 참조 디코더"로만 사용해 우회한다 — encodeMp3 자체는 그대로
 * 프로덕션 코드(lamejs)를 쓰고, 그 출력 바이트를 ffmpeg로 디코드해 원본과 비교할 뿐이다.
 * ffmpeg가 없는 CI(frontend-ci.yml)에서는 스킵된다 — pnpm test 자체가 ffmpeg 설치를 요구하지
 * 않게 하기 위함이며, 이 감사의 실측 결과는 docs/benchmarks/110-media-quality-audit/README.md에
 * 고정 기록되어 있어 스킵되어도 근거가 사라지지 않는다.
 */

function ffmpegAvailable(): boolean {
    try {
        const result = spawnSync('ffmpeg', ['-version'])
        return result.status === 0
    } catch {
        return false
    }
}

const FFMPEG_OK = ffmpegAvailable()

function decodeMp3ViaFfmpeg(mp3Bytes: Uint8Array, sampleRate: number, channels: number): Float32Array {
    const dir = mkdtempSync(path.join(tmpdir(), 'quality-audit-'))
    const mp3Path = path.join(dir, 'in.mp3')
    const wavPath = path.join(dir, 'out.wav')
    writeFileSync(mp3Path, mp3Bytes)

    const result = spawnSync('ffmpeg', [
        '-y', '-v', 'error', '-i', mp3Path,
        '-ar', String(sampleRate), '-ac', String(channels), '-f', 'wav', wavPath,
    ])
    if (result.status !== 0) {
        throw new Error(`ffmpeg mp3 디코딩 실패: ${result.stderr?.toString()}`)
    }
    const decoded = decodeWavForTest(new Uint8Array(readFileSync(wavPath)))
    return decoded.interleaved
}

describe.skipIf(!FFMPEG_OK)('오디오 변환 화질 실측 (이슈 110, 실제 음악 샘플)', () => {
    const wavBytes = new Uint8Array(readFileSync(path.join(__dirname, 'fixtures/audio-master.wav')))
    const master = decodeWavForTest(wavBytes)

    it.each([128, 192, 320])('MP3 %ikbps 인코딩의 원음 대비 SNR을 측정한다', (kbps) => {
        const encodeStart = performance.now()
        const mp3 = encodeMp3(master, kbps)
        const encodeMs = performance.now() - encodeStart
        const decodedInterleaved = decodeMp3ViaFfmpeg(mp3, master.sampleRate, master.channels)

        const refMono = extractFirstChannel(master.interleaved, master.channels)
        const candMono = extractFirstChannel(decodedInterleaved, master.channels)

        // LAME 계열 인코더 지연(보통 1105~1152샘플) + 인코딩 왜곡을 감안해 넉넉히 ±3000샘플 탐색.
        const lag = findBestLag(refMono, candMono, 3000)
        const snrDb = alignedSnrDb(refMono, candMono, lag)

        const originalBitrateKbps = (master.sampleRate * 16 * master.channels) / 1000
        console.log(
                `[quality-audit][audio-mp3 ${kbps}kbps] SNR=${snrDb.toFixed(2)}dB lag=${lag}samples `
                + `bitrate=${kbps}kbps(원본 무손실 등가 ${originalBitrateKbps}kbps) `
                + `size=${mp3.length}B(원본 ${wavBytes.length}B) encodeTime=${encodeMs.toFixed(1)}ms(순수 lamejs, 10초 트랙 기준)`)

        // 128kbps는 "FM 라디오보다 낫다" 수준으로 알려진 최저 실용 비트레이트 — SNR 하한을
        // 낮게 잡아 최소한 정렬·측정 파이프라인이 유의미한 신호를 보고 있는지만 확인한다.
        // (SNR 자체의 절대적 해석은 README의 표·분석 참고)
        expect(snrDb).toBeGreaterThan(10)
        expect(snrDb).toBeLessThan(90) // 손실 코덱이므로 무손실 수준(90dB+)이 나오면 정렬 로직이 잘못된 것
    }, 60_000) // lamejs CPU 인코딩은 부하 환경에서 10초를 넘을 수 있으므로 60초 허용

    it('WAV(무손실 재인코딩)는 16비트 양자화 오차 외 손실이 없다 — mp3 대비 SNR이 훨씬 높다', () => {
        const wav = encodeWav(master)
        const decoded = decodeWavForTest(wav)

        const refMono = extractFirstChannel(master.interleaved, master.channels)
        const candMono = extractFirstChannel(decoded.interleaved, master.channels)
        // encodeWav는 지연을 추가하지 않으므로(순수 포맷 재인코딩) lag=0이어야 한다.
        const snrDb = alignedSnrDb(refMono, candMono, 0)

        console.log(`[quality-audit][audio-wav 16bit round-trip] SNR=${snrDb.toFixed(2)}dB`)

        // 16비트 양자화 이론치: 6.02*16+1.76 ≈ 98dB. 원본 자체가 이미 16비트 소스라 추가
        // 양자화가 거의 없어 이보다도 높게(사실상 무손실) 나와야 한다.
        expect(snrDb).toBeGreaterThan(90)
    })
})
