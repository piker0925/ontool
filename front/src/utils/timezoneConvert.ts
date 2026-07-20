function getUtcOffsetMinutes(timeZone: string, atUtcMs: number): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(atUtcMs))
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
    const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    return (asIfUtc - atUtcMs) / 60_000
}

function parseLocalDateTime(dateTimeStr: string): number {
    const [datePart, timePart] = dateTimeStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    return Date.UTC(year, month - 1, day, hour, minute, 0)
}

function formatLocalDateTime(utcMs: number): string {
    const d = new Date(utcMs)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

// dateTimeStr: 'YYYY-MM-DDTHH:mm' 형태의 로컬 벽시계 시각을 fromTz 기준으로 해석해 toTz 기준 벽시계 시각으로 변환
export function convertTimezone(dateTimeStr: string, fromTz: string, toTz: string): string {
    const naiveUtcMs = parseLocalDateTime(dateTimeStr)
    const fromOffsetMin = getUtcOffsetMinutes(fromTz, naiveUtcMs)
    const actualUtcMs = naiveUtcMs - fromOffsetMin * 60_000
    const toOffsetMin = getUtcOffsetMinutes(toTz, actualUtcMs)
    return formatLocalDateTime(actualUtcMs + toOffsetMin * 60_000)
}
