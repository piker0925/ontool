import type {PcmAudio} from './audioTypes'

/**
 * 트리밍으로 생긴 시작/끝 경계의 급격한 진폭 불연속(재생 시 "딸깍" 클릭음)을 없애기 위해
 * 시작 구간엔 0→1, 끝 구간엔 1→0 선형 게인 램프를 적용한다. 각 페이드 길이는 전체 길이의
 * 절반을 넘지 않도록 클램프한다 — 그렇지 않으면 아주 짧은 클립에서 fade-in과 fade-out이
 * 서로를 침범해 겹치는 구간의 게인이 이상해질 수 있다.
 */
export function applyFadeInOut(audio: PcmAudio, fadeInSeconds: number, fadeOutSeconds: number): PcmAudio {
    const {interleaved, sampleRate, channels} = audio
    const totalFrames = interleaved.length / channels
    const out = new Float32Array(interleaved)
    if (totalFrames === 0) return {interleaved: out, sampleRate, channels}

    const halfDurationSeconds = totalFrames / sampleRate / 2
    const clampedFadeIn = Math.max(0, Math.min(fadeInSeconds, halfDurationSeconds))
    const clampedFadeOut = Math.max(0, Math.min(fadeOutSeconds, halfDurationSeconds))

    const fadeInFrames = Math.round(clampedFadeIn * sampleRate)
    // fadeIn/fadeOut을 초 단위로는 절반씩 클램프했어도, 각각 독립적으로 반올림하면(예: 홀수
    // totalFrames) 합이 totalFrames를 1프레임 넘겨 경계 프레임이 두 램프에 이중으로 감쇠될 수
    // 있다 — fadeOut 쪽에서 남은 프레임 수로 다시 한번 클램프해 절대 겹치지 않게 한다.
    const fadeOutFrames = Math.min(Math.round(clampedFadeOut * sampleRate), totalFrames - fadeInFrames)

    for (let frame = 0; frame < fadeInFrames; frame++) {
        const gain = frame / fadeInFrames
        for (let c = 0; c < channels; c++) {
            out[frame * channels + c] *= gain
        }
    }

    for (let frame = 0; frame < fadeOutFrames; frame++) {
        const gain = frame / fadeOutFrames
        const targetFrame = totalFrames - 1 - frame
        for (let c = 0; c < channels; c++) {
            out[targetFrame * channels + c] *= gain
        }
    }

    return {interleaved: out, sampleRate, channels}
}
