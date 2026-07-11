export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction
    if (target < 0 || target >= items.length) return items
    const result = [...items]
    ;[result[index], result[target]] = [result[target], result[index]]
    return result
}
