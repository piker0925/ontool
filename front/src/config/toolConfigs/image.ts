import type {ModuleConfig} from './types'

// 불리언 옵션은 markdown-to-pdf의 toc처럼 select ['true','false']로 표현하거나,
// checkbox 타입(예: image-resize의 preventUpscale)으로도 표현할 수 있다.
export const IMAGE_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'image-resize': {
        params: [
            // unit/width/height/keepAspectRatio는 ToolPage.vue의 image-resize 전용 블록이
            // 직접 렌더링한다(락 아이콘·프리셋·실시간 미리보기) — 여기서는 기본값 시딩·제출용으로만 남긴다.
            {
                key: 'unit',
                label: '크기 단위 (%는 원본 크기 기준 비율)',
                type: 'select',
                options: ['px', '%'],
                default: 'px',
            },
            {
                key: 'width',
                label: '너비 (px 또는 %, 단위 선택에 따름)',
                type: 'text',
                placeholder: '800',
                default: '800',
            },
            {
                key: 'height',
                label: '높이 (px 또는 %, 단위 선택에 따름)',
                type: 'text',
                placeholder: '600',
                default: '600',
            },
            {
                key: 'keepAspectRatio',
                label: '종횡비 유지 (true=원본 비율대로 지정 크기 안에 맞춤, false=강제 변형)',
                type: 'select',
                options: ['true', 'false'],
                default: 'true',
            },
            {
                key: 'preventUpscale',
                label: '원본보다 크게 확대 금지',
                type: 'checkbox',
                default: 'true',
            },
            {
                key: 'quality',
                label: 'JPEG 품질 1~100 (JPEG 출력에만 적용, 낮을수록 파일 작음)',
                type: 'text',
                placeholder: '85',
                default: '85',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif',
        // 다중 파일 → 파일당 별도 Job(배치) → ZIP. 배치 진행률 UI로 소비한다.
        // preventUpscale=false로 확대를 허용하면 백엔드가 결과에 경고 advisory를 함께 반환한다.
        // WebP는 TwelveMonkeys가 읽기만 지원해 결과는 원본 확장자 대신 png로 나온다(백엔드에서 자동 처리).
    },
    'image-format': {
        params: [
            {
                key: 'targetFormat',
                label: '출력 포맷',
                type: 'select',
                options: ['png', 'jpg', 'tiff'],
                default: 'png',
            },
            {
                key: 'quality',
                label: 'JPEG 품질 1~100 (jpg 출력에만 적용)',
                type: 'text',
                placeholder: '85',
                default: '85',
            },
            {
                key: 'progressive',
                label: '프로그레시브 JPEG (웹에서 점진 로딩, jpg 출력에만 적용)',
                type: 'select',
                options: ['false', 'true'],
                default: 'false',
            },
            {
                key: 'keepMetadata',
                label: '메타데이터 유지 (동일 포맷 재인코딩 png→png/jpg→jpg일 때만 EXIF 등 유지)',
                type: 'select',
                options: ['false', 'true'],
                default: 'false',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif',
    },
    'gif-create': {
        params: [
            {
                // ToolPage.test.ts가 라벨 '프레임 간격 (ms)'를 정확 일치로 조회하므로 라벨 변경 금지.
                // FPS 환산 안내는 help에 선언 — Heavy 렌더러가 help를 지원하게 되면 자동 노출된다.
                key: 'delay',
                label: '프레임 간격 (ms)',
                type: 'text',
                placeholder: '500',
                default: '500',
                help: 'FPS로 생각한다면 ms = 1000÷FPS (10 FPS→100, 24 FPS→42, 30 FPS→33)',
            },
            {
                key: 'loopCount',
                label: '반복 횟수 (0=무한 반복, N=N회 재생 후 정지)',
                type: 'text',
                placeholder: '0',
                default: '0',
            },
            {
                key: 'frameWidth',
                label: '출력 프레임 너비 px (비우면 전체 이미지 중 최대 크기 기준, 지정 시 비율 유지한 채 안에 맞추고 남는 여백은 흰색 — 잘리지 않음)',
                type: 'text',
                placeholder: '최대 크기 자동',
            },
            {
                key: 'frameHeight',
                label: '출력 프레임 높이 px (비우면 전체 이미지 중 최대 크기 기준)',
                type: 'text',
                placeholder: '최대 크기 자동',
            },
            {
                key: 'captionText',
                label: '자막 텍스트 (비우면 자막 없이 기존과 동일하게 생성)',
                type: 'text',
                placeholder: '예: 우리 강아지 최고',
            },
            {
                key: 'captionPosition',
                label: '자막 위치',
                type: 'select',
                options: ['BOTTOM', 'TOP'],
                default: 'BOTTOM',
            },
            {
                key: 'captionColor',
                label: '자막 글자 색상',
                type: 'color',
                default: '#FFFFFF',
            },
            {
                key: 'captionBackground',
                label: '자막 배경 색상 (가독성용 박스)',
                type: 'color',
                default: '#000000',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.bmp,.webp,.tiff,.tif',
        fileMultiple: true,
        reorderable: true,
    },
    'exif-remove': {
        params: [],
        fileAccept: '.jpg,.jpeg',
        fileMultiple: true,
    },
    'image-collage': {
        params: [
            {
                key: 'columns',
                label: '열 수',
                type: 'text',
                placeholder: '2',
                default: '2',
                help: '1~50',
            },
            {
                key: 'spacing',
                label: '이미지 간 여백 (px)',
                type: 'text',
                placeholder: '0',
                default: '0',
                help: '0~500',
            },
            {
                key: 'backgroundColor',
                label: '배경 색상',
                type: 'color',
                default: '#FFFFFF',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif',
        fileMultiple: true,
        reorderable: true,
    },
}
