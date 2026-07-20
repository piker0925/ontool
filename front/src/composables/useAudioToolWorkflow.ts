import {ref} from 'vue'
import type {PcmAudio} from '../utils/audioTypes'
import {buildResultFileNameBase} from '../utils/audioFileName'

/**
 * 오디오 도구 5종(피치·배속·트리밍·변환·볼륨)이 공유하는 "업로드 → 처리 → 결과" 뼈대.
 * 원래 통합 페이지(AudioToolsPage.vue, 074/075)에서 5개 탭이 반복하던 로직을 리뷰에서
 * 지적받아 runTool 하나로 묶었던 것과 같은 이유로, 카테고리 관행에 맞춰 도구별 모듈
 * 5개(audio-pitch/speed/trim/convert/volume)로 쪼갠 지금도 이 부분만은 composable로
 * 유지해 중복을 피한다.
 */
export function useAudioToolWorkflow() {
    const original = ref<PcmAudio | null>(null)
    const fileName = ref('')
    const uploadError = ref('')
    const result = ref<PcmAudio | null>(null)
    const processing = ref(false)
    const resultFileNameBase = ref('result')

    function onLoaded(payload: {pcm: PcmAudio, file: File}) {
        original.value = payload.pcm
        fileName.value = payload.file.name
        uploadError.value = ''
        result.value = null
    }

    function reset() {
        original.value = null
        result.value = null
        fileName.value = ''
    }

    // "원본 없으면 무시 → 처리 중 표시 → 순수 함수 실행 → 결과·파일명 반영 → 처리 중 해제"
    // fileNameSuffix는 도구별 처리 내용만 나타내는 짧은 조각(예: 'pitch+3')이고, 다운로드
    // 파일명은 여기서 업로드한 원본 파일명과 조합해 만든다 — 그래야 사용자가 여러 파일을
    // 내려받아도 어떤 원본에서 나온 결과인지 파일명만 보고 구분할 수 있다.
    function runTool(process: (audio: PcmAudio) => PcmAudio, fileNameSuffix: string) {
        if (!original.value) return
        processing.value = true
        try {
            result.value = process(original.value)
            resultFileNameBase.value = buildResultFileNameBase(fileName.value, fileNameSuffix)
        } finally {
            processing.value = false
        }
    }

    return {original, fileName, uploadError, result, processing, resultFileNameBase, onLoaded, reset, runTool}
}
