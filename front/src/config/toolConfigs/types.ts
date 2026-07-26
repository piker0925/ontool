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
    /** 누적 스테이징 가능한 총 파일 개수 상한 — FileUploader의 maxFiles로 그대로 전달된다. */
    maxFiles?: number
    /**
     * 지정하면 대상 파일이 1개 스테이징된 뒤 전용 "추가" 버튼을 노출한다(177 — PdfWatermarkPage의
     * second-slot 패턴을 범용 Heavy 워크벤치에서도 쓸 수 있게 함). maxFiles와 함께 써야 의미가 있다.
     */
    secondSlotLabel?: string
    /** 두 번째 슬롯 전용 accept — FileUploader의 secondSlotAccept로 전달된다. */
    secondSlotAccept?: string
    /** 두 번째 슬롯 이후 스테이징 항목에 붙는 역할 배지 문구 — FileUploader의 secondSlotItemLabel로 전달된다. */
    secondSlotItemLabel?: string
}
