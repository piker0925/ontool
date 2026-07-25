// 특수문자·이모지 모음 — 카테고리별 정적 데이터. 백엔드·외부 API 불필요, 클릭 복사 전용.

export interface SpecialCharCategory {
    id: string
    label: string
    chars: string[]
}

export const SPECIAL_CHAR_CATEGORIES: SpecialCharCategory[] = [
    {
        id: 'heart',
        label: '하트',
        chars: ['♥', '❤', '♡', '💕', '💖', '💗', '💓', '💘', '💝', '❣'],
    },
    {
        id: 'arrow',
        label: '화살표',
        chars: ['→', '←', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇑', '⇓', '➜', '➤'],
    },
    {
        id: 'shape',
        label: '도형',
        chars: ['●', '○', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '★', '☆'],
    },
    {
        id: 'kaomoji',
        label: '카오모지',
        chars: ['(^_^)', '(T_T)', '(-_-)', '(>_<)', '(^o^)', 'ㅠㅠ', 'ㅎㅎ', '(◕‿◕)', '(￣▽￣)', 'orz'],
    },
    {
        id: 'sns',
        label: 'SNS 기호',
        chars: ['@', '#', '※', '☞', '☜', '♪', '♬', '✔', '✓', '✗'],
    },
    {
        id: 'star',
        label: '별',
        chars: ['★', '☆', '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮'],
    },
    {
        id: 'bullet',
        label: '체크·불릿',
        chars: ['•', '◦', '‣', '⁃', '✔', '✅', '☑', '☒', '✘', '➊'],
    },
    {
        id: 'bracket',
        label: '괄호·따옴표',
        chars: ['「」', '『』', '【】', '〈〉', '《》', '“”', '‘’', '〔〕', '［］', '≪≫'],
    },
    {
        id: 'currency',
        label: '통화 기호',
        chars: ['₩', '$', '€', '¥', '£', '¢', '₹', '₽', '₺', '₫'],
    },
    {
        id: 'math',
        label: '수학 기호',
        chars: ['±', '×', '÷', '≠', '≒', '≤', '≥', '∞', '√', '∑', '∏', '∆'],
    },
]
