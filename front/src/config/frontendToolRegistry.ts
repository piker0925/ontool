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
    'unit-converter': {load: () => import('../components/tools/UnitConverterTool.vue'), layout: 'narrow'},
    'parcel-volume-weight': {load: () => import('../components/tools/ParcelVolumeWeightTool.vue'), layout: 'narrow'},
    'pet-age-converter': {load: () => import('../components/tools/PetAgeConverterTool.vue'), layout: 'narrow'},
    'timezone-converter': {load: () => import('../components/tools/TimezoneConverterTool.vue'), layout: 'narrow'},
    'net-pay-calculator': {load: () => import('../components/tools/NetPayCalculatorTool.vue'), layout: 'narrow'},
    'wage-converter': {load: () => import('../components/tools/WageConverterTool.vue'), layout: 'narrow'},
    'severance-calculator': {load: () => import('../components/tools/SeveranceCalculatorTool.vue'), layout: 'narrow'},
    'overtime-pay-calculator': {load: () => import('../components/tools/OvertimePayCalculatorTool.vue'), layout: 'narrow'},
    'loan-calculator': {load: () => import('../components/tools/LoanCalculatorTool.vue'), layout: 'narrow'},
    'deposit-calculator': {load: () => import('../components/tools/DepositCalculatorTool.vue'), layout: 'narrow'},
    'jeonse-calculator': {load: () => import('../components/tools/JeonseCalculatorTool.vue'), layout: 'narrow'},
    'vat-calculator': {load: () => import('../components/tools/VatCalculatorTool.vue'), layout: 'narrow'},
    'bmi': {load: () => import('../components/tools/BmiTool.vue'), layout: 'narrow'},
    'bmr-calculator': {load: () => import('../components/tools/BmrCalculatorTool.vue'), layout: 'narrow'},
    'd-day-calculator': {load: () => import('../components/tools/DdayCalculatorTool.vue'), layout: 'narrow'},
    'age-calculator': {load: () => import('../components/tools/AgeCalculatorTool.vue'), layout: 'narrow'},
    'baby-age-calculator': {load: () => import('../components/tools/BabyAgeCalculatorTool.vue'), layout: 'narrow'},
    'due-date-calculator': {load: () => import('../components/tools/DueDateCalculatorTool.vue'), layout: 'narrow'},

    'data-convert': {load: () => import('../components/UnifiedConvertPage.vue'), layout: 'wide'},
    'encoder': {load: () => import('../components/UnifiedEncoderPage.vue'), layout: 'wide'},
    'text-utils': {load: () => import('../components/UnifiedTextUtilsPage.vue'), layout: 'wide'},
    'code-gen': {load: () => import('../components/UnifiedCodeGenPage.vue'), layout: 'wide'},
    'pdf-watermark': {load: () => import('../components/PdfWatermarkPage.vue'), layout: 'wide'},
    'pdf-password': {load: () => import('../components/PdfPasswordPage.vue'), layout: 'wide'},
    'pdf-header-footer': {load: () => import('../components/PdfHeaderFooterPage.vue'), layout: 'wide'},
    'document-generator': {load: () => import('../components/DocumentGeneratorPage.vue'), layout: 'wide'},
}
