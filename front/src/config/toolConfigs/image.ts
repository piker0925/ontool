import type {ModuleConfig} from './types'

// 주의: ToolPage의 Heavy 파라미터 렌더러는 현재 text/select 타입만 지원한다 (number/checkbox/help 미지원).
// 불리언 옵션은 markdown-to-pdf의 toc처럼 select ['true','false']로 표현한다.
export const IMAGE_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'image-resize': {
        params: [
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
                key: 'quality',
                label: 'JPEG 품질 1~100 (JPEG 출력에만 적용, 낮을수록 파일 작음)',
                type: 'text',
                placeholder: '85',
                default: '85',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.gif,.bmp',
        // 다중 파일 → 파일당 별도 Job(배치) → ZIP. 배치 진행률 UI로 소비한다.
        // 원본보다 크게 확대하면 백엔드가 결과에 경고 advisory를 함께 반환한다.
    },
    'image-format': {
        params: [
            {
                key: 'targetFormat',
                label: '출력 포맷',
                type: 'select',
                options: ['png', 'jpg'],
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
        fileAccept: '.jpg,.jpeg,.png,.gif,.bmp',
    },
    'gif-create': {
        params: [
            {
                // ToolPage.test.ts가 라벨 '프레임 간격 (ms)'를 정확 일치로 조회하므로 라벨 변경 금지.
                // FPS 환산 안내는 help에 선언 — Heavy 렌더러가 help를 지원하게 되면 자동 노출된다.
                key: 'delay',
                label: '프레임 간격 (ms)',
                type: 'text',
                placeholder: '100',
                default: '100',
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
                key: 'disposal',
                label: '프레임 처리 (background=매번 지움·일반 애니메이션, keep=겹침·오버레이, previous=이전 복원)',
                type: 'select',
                options: ['background', 'keep', 'previous'],
                default: 'background',
            },
            {
                key: 'frameWidth',
                label: '출력 프레임 너비 px (비우면 원본 크기, 지정 시 종횡비 유지)',
                type: 'text',
                placeholder: '원본 크기',
            },
            {
                key: 'frameHeight',
                label: '출력 프레임 높이 px (비우면 원본 크기)',
                type: 'text',
                placeholder: '원본 크기',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png,.bmp',
        fileMultiple: true,
        reorderable: true,
    },
}
