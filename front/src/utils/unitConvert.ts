export type UnitCategory = 'length' | 'weight' | 'volume'

// 각 카테고리의 기준 단위(1 base unit = 1) 대비 환산 계수
const LENGTH_TO_METER: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    mi: 1609.344,
}

const WEIGHT_TO_KG: Record<string, number> = {
    mg: 0.000001,
    g: 0.001,
    kg: 1,
    t: 1000,
    lb: 0.45359237,
    oz: 0.028349523125,
}

const VOLUME_TO_LITER: Record<string, number> = {
    mL: 0.001,
    L: 1,
    m3: 1000,
    gal: 3.785411784,
    qt: 0.946352946,
}

const TABLES: Record<UnitCategory, Record<string, number>> = {
    length: LENGTH_TO_METER,
    weight: WEIGHT_TO_KG,
    volume: VOLUME_TO_LITER,
}

export const UNIT_OPTIONS: Record<UnitCategory, string[]> = {
    length: Object.keys(LENGTH_TO_METER),
    weight: Object.keys(WEIGHT_TO_KG),
    volume: Object.keys(VOLUME_TO_LITER),
}

export function convertUnit(category: UnitCategory, value: number, fromUnit: string, toUnit: string): number {
    const table = TABLES[category]
    return value * table[fromUnit] / table[toUnit]
}
