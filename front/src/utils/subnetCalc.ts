// IPv4 서브넷 계산 — 브라우저 로컬. 32비트 부호 문제를 피하려고 비트연산 대신 순수 산술을 쓴다.

export interface SubnetResult {
    network: string
    broadcast: string
    mask: string
    /** "a ~ b" 또는 사용 가능 호스트가 없으면 "(없음)" */
    hostRange: string
    usableHosts: number
    /** 예: "클래스 C · Private (RFC 1918)" (가운뎃점 U+00B7) */
    classification: string
}

function parseOctets(ip: string): number[] {
    const parts = ip.split('.')
    if (parts.length !== 4) throw new Error(`IP는 4개의 옥텟이어야 합니다: ${ip}`)
    return parts.map(p => {
        if (!/^\d+$/.test(p)) throw new Error(`옥텟은 숫자여야 합니다: ${p}`)
        const n = Number(p)
        if (n > 255) throw new Error(`옥텟은 0~255 범위여야 합니다: ${p}`)
        return n
    })
}

/** 32비트 정수(0..2^32-1)를 점표기 문자열로. */
function toDotted(n: number): string {
    return [
        Math.floor(n / 16777216) % 256,
        Math.floor(n / 65536) % 256,
        Math.floor(n / 256) % 256,
        n % 256,
    ].join('.')
}

function classify(networkFirst: number, networkSecond: number): string {
    const letter =
        networkFirst <= 127 ? 'A' :
            networkFirst <= 191 ? 'B' :
                networkFirst <= 223 ? 'C' :
                    networkFirst <= 239 ? 'D' : 'E'

    let special: string
    if (networkFirst === 0) special = '예약됨 (0.0.0.0/8)'
    else if (networkFirst === 127) special = 'Loopback (127.0.0.0/8)'
    else if (networkFirst === 10) special = 'Private (RFC 1918)'
    else if (networkFirst === 172 && (networkSecond & 0xf0) === 16) special = 'Private (RFC 1918)'
    else if (networkFirst === 192 && networkSecond === 168) special = 'Private (RFC 1918)'
    else if (networkFirst === 169 && networkSecond === 254) special = 'Link-local (RFC 3927)'
    else if (networkFirst >= 224 && networkFirst <= 239) special = 'Multicast'
    else if (networkFirst >= 240) special = '예약됨 (240.0.0.0/4)'
    else special = 'Public'

    return `클래스 ${letter} · ${special}`
}

export function calculateSubnet(cidr: string): SubnetResult {
    const parts = cidr.trim().split('/')
    if (parts.length !== 2) throw new Error(`CIDR 형식이어야 합니다 (예: 192.168.1.0/24): ${cidr}`)

    const octets = parseOctets(parts[0].trim())
    if (!/^\d+$/.test(parts[1].trim())) throw new Error(`prefix는 숫자여야 합니다: ${parts[1]}`)
    const prefix = Number(parts[1].trim())
    if (prefix > 32) throw new Error(`prefix는 0~32 범위여야 합니다: ${prefix}`)

    const ip = octets.reduce((acc, o) => acc * 256 + o, 0)
    const blockSize = 2 ** (32 - prefix)
    const mask = prefix === 0 ? 0 : 2 ** 32 - blockSize
    const network = ip - (ip % blockSize)
    const broadcast = network + blockSize - 1

    const usableHosts = prefix >= 31 ? 0 : blockSize - 2
    const hostRange = prefix >= 31
        ? '(없음)'
        : `${toDotted(network + 1)} ~ ${toDotted(broadcast - 1)}`

    return {
        network: toDotted(network),
        broadcast: toDotted(broadcast),
        mask: toDotted(mask),
        hostRange,
        usableHosts,
        classification: classify(Math.floor(network / 16777216) % 256, Math.floor(network / 65536) % 256),
    }
}
