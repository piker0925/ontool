interface CollectedInterface {
    name: string
    body: string
}

function capitalize(name: string): string {
    if (!name) return 'Root'
    return name.charAt(0).toUpperCase() + name.slice(1)
}

function inferType(value: unknown, name: string, out: CollectedInterface[]): string {
    if (value === null) return 'null'
    if (Array.isArray(value)) {
        if (value.length === 0) return 'unknown[]'
        const itemName = `${capitalize(name)}Item`
        const elementTypes = Array.from(new Set(value.map(item => inferType(item, itemName, out))))
        const union = elementTypes.join(' | ')
        return elementTypes.length > 1 ? `(${union})[]` : `${union}[]`
    }
    if (typeof value === 'object') {
        const interfaceName = capitalize(name)
        if (out.some(iface => iface.name === interfaceName)) {
            return interfaceName
        }
        const entry: CollectedInterface = {name: interfaceName, body: ''}
        out.push(entry)
        const lines = Object.entries(value as Record<string, unknown>)
            .map(([key, fieldValue]) => `  ${key}: ${inferType(fieldValue, key, out)}`)
        entry.body = lines.join('\n')
        return interfaceName
    }
    return typeof value
}

export function jsonToTs(value: unknown, rootName = 'Root'): string {
    const out: CollectedInterface[] = []
    const rootType = inferType(value, rootName, out)

    if (out.length > 0 && out[0].name === capitalize(rootName)) {
        return out.map(iface => `interface ${iface.name} {\n${iface.body}\n}`).join('\n\n')
    }

    const nested = out.map(iface => `interface ${iface.name} {\n${iface.body}\n}`).join('\n\n')
    const rootDecl = `type ${capitalize(rootName)} = ${rootType}`
    return nested ? `${nested}\n\n${rootDecl}` : rootDecl
}
