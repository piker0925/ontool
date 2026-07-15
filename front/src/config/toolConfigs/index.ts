import type {ModuleConfig} from './types'
import {GENERATOR_CONFIGS, GENERATOR_HEAVY_CONFIGS} from './generator'
import {SECURITY_CONFIGS, SECURITY_HEAVY_CONFIGS} from './security'
import {CRYPTO_CONFIGS} from './crypto'
import {FORMATTER_CONFIGS} from './formatter'
import {CONVERTER_CONFIGS} from './converter'
import {NETWORK_CONFIGS} from './network'
import {DEVOPS_CONFIGS} from './devops'
import {IMAGE_HEAVY_CONFIGS} from './image'
import {PDF_HEAVY_CONFIGS} from './pdf'

export type {ModuleConfig, ParamDef} from './types'

/** Light 모듈 파라미터 폼 설정 */
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
    ...GENERATOR_CONFIGS,
    ...SECURITY_CONFIGS,
    ...CRYPTO_CONFIGS,
    ...FORMATTER_CONFIGS,
    ...CONVERTER_CONFIGS,
    ...NETWORK_CONFIGS,
    ...DEVOPS_CONFIGS,
}

/** Heavy(파일 처리) 모듈 설정 */
export const HEAVY_CONFIGS: Record<string, ModuleConfig> = {
    ...IMAGE_HEAVY_CONFIGS,
    ...PDF_HEAVY_CONFIGS,
    ...GENERATOR_HEAVY_CONFIGS,
    ...SECURITY_HEAVY_CONFIGS,
}
