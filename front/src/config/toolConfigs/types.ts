export interface ParamDef {
    key: string
    label: string
    type: 'textarea' | 'text' | 'select' | 'checkbox' | 'number' | 'color'
    placeholder?: string
    options?: string[]
    default?: string
    /** 파라미터 설명 (라벨 옆 보조 텍스트) */
    help?: string
    /** number 타입 단위 표기 (px, %, ms 등) */
    unit?: string
}

export interface ModuleConfig {
    params: ParamDef[]
    resultType?: 'image'
    sample?: Record<string, string>
    textInput?: { label: string; placeholder: string; filename: string; help?: string }
    fileAccept?: string
    fileMultiple?: boolean
    reorderable?: boolean
}
