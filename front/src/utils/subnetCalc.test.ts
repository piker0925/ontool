import {describe, expect, it} from 'vitest'
import {calculateSubnet} from './subnetCalc'

// 기준값은 손으로 계산하거나 표준 서브넷 계산기로 독립 확인한 값.
describe('calculateSubnet — 정상 케이스', () => {
    it('192.168.1.10/24 (클래스 C · 사설)', () => {
        expect(calculateSubnet('192.168.1.10/24')).toEqual({
            network: '192.168.1.0',
            broadcast: '192.168.1.255',
            mask: '255.255.255.0',
            hostRange: '192.168.1.1 ~ 192.168.1.254',
            usableHosts: 254,
            classification: '클래스 C · Private (RFC 1918)',
        })
    })

    it('10.0.0.5/8 (클래스 A · 사설, 대형 범위)', () => {
        expect(calculateSubnet('10.0.0.5/8')).toEqual({
            network: '10.0.0.0',
            broadcast: '10.255.255.255',
            mask: '255.0.0.0',
            hostRange: '10.0.0.1 ~ 10.255.255.254',
            usableHosts: 16777214,
            classification: '클래스 A · Private (RFC 1918)',
        })
    })

    it('172.16.5.4/20 (클래스 B · 사설, 비바이트 경계 마스크)', () => {
        expect(calculateSubnet('172.16.5.4/20')).toEqual({
            network: '172.16.0.0',
            broadcast: '172.16.15.255',
            mask: '255.255.240.0',
            hostRange: '172.16.0.1 ~ 172.16.15.254',
            usableHosts: 4094,
            classification: '클래스 B · Private (RFC 1918)',
        })
    })
})

describe('calculateSubnet — /31·/32 경계', () => {
    it('8.8.8.8/32 (단일 호스트, 사용 가능 0)', () => {
        expect(calculateSubnet('8.8.8.8/32')).toEqual({
            network: '8.8.8.8',
            broadcast: '8.8.8.8',
            mask: '255.255.255.255',
            hostRange: '(없음)',
            usableHosts: 0,
            classification: '클래스 A · Public',
        })
    })

    it('192.168.1.0/31 (사용 가능 0, 호스트 범위 없음)', () => {
        const r = calculateSubnet('192.168.1.0/31')
        expect(r.mask).toBe('255.255.255.254')
        expect(r.hostRange).toBe('(없음)')
        expect(r.usableHosts).toBe(0)
        expect(r.broadcast).toBe('192.168.1.1')
    })
})

describe('calculateSubnet — 분류', () => {
    it('127.0.0.1/8 → 루프백', () => {
        expect(calculateSubnet('127.0.0.1/8').classification).toBe('클래스 A · Loopback (127.0.0.0/8)')
    })
    it('169.254.1.1/16 → 링크로컬', () => {
        expect(calculateSubnet('169.254.1.1/16').classification).toBe('클래스 B · Link-local (RFC 3927)')
    })
    it('224.0.0.1/4 → 멀티캐스트', () => {
        expect(calculateSubnet('224.0.0.1/4').classification).toBe('클래스 D · Multicast')
    })
    it('1.1.1.1/24 → 공인', () => {
        expect(calculateSubnet('1.1.1.1/24').classification).toBe('클래스 A · Public')
    })
})

describe('calculateSubnet — 검증 에러', () => {
    it('슬래시 없음', () => {
        expect(() => calculateSubnet('192.168.1.0')).toThrow()
    })
    it('옥텟 > 255', () => {
        expect(() => calculateSubnet('192.168.1.256/24')).toThrow()
    })
    it('prefix > 32', () => {
        expect(() => calculateSubnet('192.168.1.0/33')).toThrow()
    })
    it('옥텟 개수 부족', () => {
        expect(() => calculateSubnet('1.2.3/24')).toThrow()
    })
})
