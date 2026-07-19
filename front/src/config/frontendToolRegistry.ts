import type {Component} from 'vue'

/**
 * narrow: max-w-5xl 중앙정렬 wrapper 적용 (기존 FrontendToolPage.vue의 단일 컴포넌트 도구)
 * wide: wrapper에 추가 class 없음, 부모 max-w-[1440px] 그대로 (기존 Unified*Page 도구)
 */
export type FrontendToolLayout = 'narrow' | 'wide'

export interface FrontendToolEntry {
    load: () => Promise<{ default: Component }>
    layout: FrontendToolLayout
}

export const FRONTEND_TOOL_COMPONENTS: Record<string, FrontendToolEntry> = {
    'uuid': {load: () => import('../components/tools/UuidTool.vue'), layout: 'narrow'},
    'timestamp': {load: () => import('../components/tools/TimestampTool.vue'), layout: 'narrow'},
    'color-code': {load: () => import('../components/tools/ColorCodeTool.vue'), layout: 'narrow'},
    'json-formatter': {load: () => import('../components/tools/JsonFormatterTool.vue'), layout: 'narrow'},
    'jwt-decoder': {load: () => import('../components/tools/JwtDecoderTool.vue'), layout: 'narrow'},
    'text-diff': {load: () => import('../components/tools/TextDiffTool.vue'), layout: 'narrow'},
    'regex-tester': {load: () => import('../components/tools/RegexTesterTool.vue'), layout: 'narrow'},
    'totp': {load: () => import('../components/tools/TotpTool.vue'), layout: 'narrow'},
    'subnet-calc': {load: () => import('../components/tools/SubnetCalcTool.vue'), layout: 'narrow'},
    'url-parser': {load: () => import('../components/tools/UrlParserTool.vue'), layout: 'narrow'},
    'cron': {load: () => import('../components/tools/CronTool.vue'), layout: 'narrow'},
    'hmac': {load: () => import('../components/tools/HmacTool.vue'), layout: 'narrow'},
    'aes': {load: () => import('../components/tools/AesTool.vue'), layout: 'narrow'},
    'salary-calculator': {load: () => import('../components/SalaryCalculatorPage.vue'), layout: 'narrow'},
    'finance-calculator': {load: () => import('../components/FinanceCalculatorPage.vue'), layout: 'narrow'},
    'lotto-number': {load: () => import('../components/tools/LottoNumberTool.vue'), layout: 'narrow'},
    'random-team-ladder': {load: () => import('../components/tools/RandomTeamLadderTool.vue'), layout: 'narrow'},
    'random-nickname': {load: () => import('../components/tools/RandomNicknameTool.vue'), layout: 'narrow'},
    'random-palette': {load: () => import('../components/tools/RandomPaletteTool.vue'), layout: 'narrow'},

    'data-convert': {load: () => import('../components/UnifiedConvertPage.vue'), layout: 'wide'},
    'encoder': {load: () => import('../components/UnifiedEncoderPage.vue'), layout: 'wide'},
    'text-utils': {load: () => import('../components/UnifiedTextUtilsPage.vue'), layout: 'wide'},
    'code-gen': {load: () => import('../components/UnifiedCodeGenPage.vue'), layout: 'wide'},
    'pdf-editor': {load: () => import('../components/PdfEditorPage.vue'), layout: 'wide'},
    'document-generator': {load: () => import('../components/DocumentGeneratorPage.vue'), layout: 'wide'},
}
