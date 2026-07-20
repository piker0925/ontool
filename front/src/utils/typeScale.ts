export interface TypeScaleStep {
    step: number
    sizePx: number
}

// 반올림 규칙: 소수점 둘째 자리까지 남기고 셋째 자리에서 반올림한다.
function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100
}

export function computeTypeScale(baseSizePx: number, ratio: number, stepsDown: number, stepsUp: number): TypeScaleStep[] {
    const steps: TypeScaleStep[] = []
    for (let n = -stepsDown; n <= stepsUp; n++)
        steps.push({step: n, sizePx: roundToTwoDecimals(baseSizePx * Math.pow(ratio, n))})
    return steps
}

export function buildTypeScaleCss(steps: TypeScaleStep[]): string {
    return steps.map(s => `--font-size-${s.step}: ${s.sizePx}px;`).join('\n')
}
