import type {Component} from 'vue'
import {AlignLeft, FileText, Globe, Image, ShieldCheck, Terminal, Type, Wrench, Zap,} from 'lucide-vue-next'

export interface CategoryConfig {
    icon: Component
    bg: string
    color: string
    thumbBg: string
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    'PDF': {icon: FileText as Component, bg: 'bg-indigo-50', color: 'text-indigo-600', thumbBg: 'bg-indigo-600'},
    '이미지': {icon: Image as Component, bg: 'bg-violet-50', color: 'text-violet-600', thumbBg: 'bg-violet-600'},
    '생성기': {icon: Zap as Component, bg: 'bg-amber-50', color: 'text-amber-600', thumbBg: 'bg-amber-500'},
    '보안·암호화': {icon: ShieldCheck as Component, bg: 'bg-red-50', color: 'text-red-600', thumbBg: 'bg-rose-600'},
    '포맷터': {icon: AlignLeft as Component, bg: 'bg-blue-50', color: 'text-blue-600', thumbBg: 'bg-blue-600'},
    '텍스트': {icon: Type as Component, bg: 'bg-emerald-50', color: 'text-emerald-600', thumbBg: 'bg-emerald-600'},
    '네트워크': {icon: Globe as Component, bg: 'bg-sky-50', color: 'text-sky-600', thumbBg: 'bg-sky-600'},
    'DevOps': {icon: Terminal as Component, bg: 'bg-orange-50', color: 'text-orange-600', thumbBg: 'bg-orange-600'},
}

export const CATEGORY_ORDER = [
    'PDF', '이미지', '생성기', '보안·암호화', '포맷터', '텍스트', '네트워크', 'DevOps',
]

// 매핑되지 않은 카테고리용 기본 설정
const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
    icon: Wrench as Component, bg: 'bg-slate-100', color: 'text-slate-500', thumbBg: 'bg-slate-500',
}

export function getCategoryConfig(category: string): CategoryConfig {
    return CATEGORY_CONFIG[category] ?? DEFAULT_CATEGORY_CONFIG
}
