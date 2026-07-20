const VOLUMETRIC_DIVISOR = 6000

export function calcVolumetricWeight(widthCm: number, depthCm: number, heightCm: number): number {
    return widthCm * depthCm * heightCm / VOLUMETRIC_DIVISOR
}

export function billingWeight(actualWeightKg: number, volumetricWeightKg: number): number {
    return Math.max(actualWeightKg, volumetricWeightKg)
}
