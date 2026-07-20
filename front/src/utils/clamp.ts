export function clamp(value: number, min: number, max: number): number {
    return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), min), max) : min
}
