import {ref} from 'vue'

// 게임 간·새로고침 후에도 음소거 여부가 유지되도록 useTheme.ts와 동일한
// "모듈 스코프 싱글턴 + localStorage" 패턴을 따른다.
const STORAGE_KEY = 'devtoolbox-game-sound-muted'

function load(): boolean {
    return localStorage.getItem(STORAGE_KEY) === '1'
}

const muted = ref<boolean>(load())

type AudioContextCtor = typeof AudioContext

function resolveAudioContextCtor(): AudioContextCtor | undefined {
    if (typeof window === 'undefined') return undefined
    return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
}

// 브라우저 자동재생 정책상 사용자 제스처 이후에만 AudioContext를 생성/재개할 수 있어
// 최초 사운드 재생 시점까지 생성을 미룬다. jsdom 등 AudioContext가 없는 환경(테스트)에서는
// undefined를 반환해 재생 호출부가 조용히 no-op 하도록 한다.
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
    const Ctor = resolveAudioContextCtor()
    if (!Ctor) return null
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
}

interface ToneStep {
    freq: number
    durationMs: number
}

// 오실레이터로 짧은 톤을 순서대로 재생한다. 클릭성 잡음을 막기 위해 각 톤마다
// 게인을 지수적으로 살짝 올렸다 내리는 짧은 엔벨로프를 건다.
function playTones(steps: ToneStep[]) {
    if (muted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    let startTime = ctx.currentTime
    for (const step of steps) {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = step.freq

        const durationSec = step.durationMs / 1000
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec)

        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start(startTime)
        oscillator.stop(startTime + durationSec)
        startTime += durationSec
    }
}

export function useGameSound() {
    return {
        muted,
        toggleMuted() {
            muted.value = !muted.value
            localStorage.setItem(STORAGE_KEY, muted.value ? '1' : '0')
        },
        // 짧은 클릭/이동/입력 피드백 (예: 타일 이동, 카드 뒤집기, 버튼 누름).
        // freq를 지정하면 호출부별로 다른 음을 낼 수 있다 — 기본값 440은 음 구분이
        // 필요 없는 호출부를 그대로 유지한다.
        playClick(freq = 440) {
            playTones([{freq, durationMs: 60}])
        },
        // 성공/합쳐짐/승리 피드백 (상승하는 2음)
        playSuccess() {
            playTones([{freq: 523.25, durationMs: 90}, {freq: 783.99, durationMs: 130}])
        },
        // 실패/게임오버 피드백 (하강하는 2음)
        playFail() {
            playTones([{freq: 220, durationMs: 180}, {freq: 164.81, durationMs: 240}])
        },
    }
}
