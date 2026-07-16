import type {ModuleConfig} from './types'

export const PDF_HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    'image-to-pdf': {
        params: [
            {
                key: 'paperSize',
                label: '용지 크기',
                type: 'select',
                options: ['A4', 'Letter', '원본'],
                default: '원본',
                help: '원본은 이미지 크기 그대로 페이지를 만듭니다',
            },
            {
                key: 'orientation',
                label: '방향',
                type: 'select',
                options: ['portrait', 'landscape'],
                default: 'portrait',
                help: 'portrait=세로, landscape=가로 (원본 크기에서는 무시)',
            },
            {
                key: 'margin',
                label: '여백 (mm)',
                type: 'text',
                placeholder: '0',
                default: '0',
                help: '0~100mm',
            },
        ],
        fileAccept: '.jpg,.jpeg,.png',
    },
    'pdf-merge': {
        params: [],
        fileAccept: '.pdf',
        reorderable: true,
    },
    'pdf-split': {
        params: [
            {
                key: 'pageRange',
                label: '페이지 범위',
                type: 'text',
                placeholder: '예: 1-3,5 (비우면 전체)',
                help: '쉼표로 구분, 열린 범위(예: 7-)는 마지막 페이지까지',
            },
            {
                key: 'groupMode',
                label: '분할 방식',
                type: 'select',
                options: ['page', 'range'],
                default: 'page',
                help: 'page=페이지별 1파일, range=입력한 범위별 1파일',
            },
        ],
        fileAccept: '.pdf',
    },
    'markdown-to-pdf': {
        params: [
            {
                key: 'paperSize',
                label: '용지 크기',
                type: 'select',
                options: ['A4', 'Letter', 'A5'],
                default: 'A4',
            },
            {
                key: 'margin',
                label: '여백 (mm)',
                type: 'text',
                placeholder: '20',
                default: '20',
                help: '0~50mm',
            },
            {
                key: 'toc',
                label: '목차 생성',
                type: 'select',
                options: ['false', 'true'],
                default: 'false',
                help: 'true면 헤딩 기반 목차를 첫 페이지에 삽입',
            },
        ],
        textInput: {
            label: 'Markdown 직접 입력',
            placeholder: '# 제목\n\n마크다운 내용을 입력하세요...\n\n- 목록 항목\n- **굵게**, *기울임*',
            filename: 'document.md',
            help: '이미지는 외부 URL만 지원됩니다 (로컬 상대경로 이미지는 표시되지 않습니다)',
        },
        fileAccept: '.md',
    },
}
