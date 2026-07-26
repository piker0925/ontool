import type {ModuleConfig} from './types'

export const VIDEO_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'video-trim-convert': {
        params: [
            {
                key: 'startTime',
                label: '시작 시각(초, 비우면 처음부터)',
                type: 'text',
                placeholder: '0',
                help: '트리밍만 하고 포맷/해상도/비트레이트를 지정하지 않으면 재인코딩 없이 빠르게 자릅니다(키프레임 단위 오차 있을 수 있음).',
            },
            {
                key: 'endTime',
                label: '종료 시각(초, 비우면 끝까지)',
                type: 'text',
                placeholder: '10',
            },
            {
                key: 'targetFormat',
                label: '출력 포맷(비우면 원본 컨테이너 유지)',
                type: 'select',
                options: ['', 'mp4', 'webm', 'mov'],
                default: '',
            },
            {
                key: 'resolution',
                label: '해상도(가로x세로, 비우면 원본 유지)',
                type: 'text',
                placeholder: '1280x720',
            },
            {
                key: 'bitrate',
                label: '비디오 비트레이트(kbps, 비우면 원본 유지)',
                type: 'text',
                placeholder: '2000',
            },
        ],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
    },
    'video-to-gif': {
        params: [
            {
                key: 'startTime',
                label: '시작 시각(초, 비우면 처음부터)',
                type: 'text',
                placeholder: '0',
                help: '팔레트 생성(1차) + 인코딩(2차) 2단계로 처리되어 트리밍/변환보다 시간이 더 걸릴 수 있습니다.',
            },
            {
                key: 'endTime',
                label: '종료 시각(초, 비우면 끝까지)',
                type: 'text',
                placeholder: '5',
            },
            {
                key: 'fps',
                label: '초당 프레임(FPS)',
                type: 'text',
                placeholder: '10',
                default: '10',
                help: '1~30',
            },
            {
                key: 'width',
                label: '너비(px, 비우면 원본 너비 — 세로는 비율 유지 자동 계산)',
                type: 'text',
                placeholder: '480',
            },
        ],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
    },
    'video-frame-extract': {
        params: [
            {
                key: 'intervalSeconds',
                label: '추출 간격(초) — totalFrames와 동시 지정 불가',
                type: 'text',
                placeholder: '5',
                help: '비우고 totalFrames도 비우면 5초 간격이 기본값입니다.',
            },
            {
                key: 'totalFrames',
                label: '총 추출 장수 — intervalSeconds와 동시 지정 불가',
                type: 'text',
                placeholder: '10',
                help: '영상 전체 길이에 걸쳐 균등하게 뽑습니다. 최대 100장.',
            },
            {
                key: 'format',
                label: '출력 포맷',
                type: 'select',
                options: ['png', 'jpg'],
                default: 'png',
            },
            {
                key: 'width',
                label: '너비(px, 비우면 원본 너비 — 세로는 비율 유지 자동 계산)',
                type: 'text',
                placeholder: '640',
            },
        ],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
    },
    'video-metadata': {
        params: [],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
    },
    'video-to-audio': {
        params: [
            {
                key: 'format',
                label: '출력 포맷',
                type: 'select',
                options: ['mp3', 'wav'],
                default: 'mp3',
            },
        ],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
    },
    'video-merge': {
        params: [],
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: true,
        reorderable: true,
    },
    'video-watermark': {
        params: [
            {
                key: 'text',
                label: '텍스트 워터마크(선택 — 이미지 워터마크와 동시 사용 가능)',
                type: 'text',
                placeholder: '© 2026 내 채널',
                help: '텍스트 위치는 우하단 고정입니다(115) — 이 도구는 미리보기가 없어 이미지처럼 드래그로 잡을 수 없습니다. ' +
                    '이미지 워터마크는 대상 영상을 올린 뒤 아래 "이미지 워터마크 추가" 버튼으로 더할 수 있습니다.',
            },
            {
                key: 'imageXPercent',
                label: '이미지 워터마크 가로 위치(%, 0~100, 비우면 우하단)',
                type: 'text',
                placeholder: '80',
                help: '영상 좌상단을 0, 우측 끝을 100으로 하는 퍼센트 좌표입니다(129). 비우면 기존처럼 우하단 고정.',
            },
            {
                key: 'imageYPercent',
                label: '이미지 워터마크 세로 위치(%, 0~100, 비우면 우하단)',
                type: 'text',
                placeholder: '80',
                help: '영상 좌상단을 0, 하단 끝을 100으로 하는 퍼센트 좌표입니다(129). 비우면 기존처럼 우하단 고정.',
            },
            {
                key: 'opacity',
                label: '불투명도(%)',
                type: 'text',
                placeholder: '30',
                default: '30',
                help: '0~100',
            },
        ],
        // 177: 대상 영상은 1개만 받고(multiple: false), 이미지 워터마크는 전용 두 번째 슬롯으로
        // 받는다(PdfWatermarkPage와 동일한 패턴) — 순서 기반 암묵 규칙 대신 명시적인 업로드 버튼.
        fileAccept: '.mp4,.webm,.mov,.mkv,.avi',
        fileMultiple: false,
        maxFiles: 2,
        secondSlotLabel: '+ 이미지 워터마크 추가(선택)',
        secondSlotAccept: '.jpg,.jpeg,.png',
        secondSlotItemLabel: '워터마크 이미지',
    },
}
