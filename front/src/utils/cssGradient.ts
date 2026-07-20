export interface GradientLayer {
    angleDeg: number
    colors: string[]
}

export function buildGradientCss(layers: GradientLayer[]): string {
    return layers
        .map(layer => `linear-gradient(${layer.angleDeg}deg, ${layer.colors.join(', ')})`)
        .join(', ')
}

export interface ShadowLayer {
    x: number
    y: number
    blur: number
    spread: number
    color: string
    inset?: boolean
}

export function buildBoxShadowCss(layers: ShadowLayer[]): string {
    return layers
        .map(l => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`)
        .join(', ')
}
