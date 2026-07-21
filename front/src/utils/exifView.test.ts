import {describe, expect, it} from 'vitest'
import {dmsToDecimal, formatCameraLabel, mapExifToDisplay} from './exifView'

// 실제 exifr.parse(file, true) 결과를 그대로 흉내낸 픽스처.
// (front/exif-test 스크래치패드에서 exiftool로 태그를 심은 JPEG를 exifr로 파싱해 확인한 실제 출력 형태)
const REAL_EXIFR_OUTPUT_FIXTURE = {
    JFIFVersion: 257,
    ResolutionUnit: 'inches',
    XResolution: 72,
    YResolution: 72,
    Make: 'Canon',
    Model: 'Canon EOS R5',
    Orientation: 'Horizontal (normal)',
    ExposureTime: 0.008,
    FNumber: 2.8,
    ISO: 400,
    DateTimeOriginal: new Date(2024, 4, 17, 14, 32, 10),
    CreateDate: new Date(2024, 4, 17, 14, 32, 10),
    FocalLength: 50,
    ColorSpace: 1,
    ExifImageWidth: 600,
    ExifImageHeight: 400,
    SerialNumber: '112233445566',
    GPSVersionID: '2.3.0.0',
    GPSLatitudeRef: 'N',
    GPSLatitude: [37, 33, 59.4],
    GPSLongitudeRef: 'E',
    GPSLongitude: [126, 58, 40.8],
    latitude: 37.5665,
    longitude: 126.978,
}

describe('mapExifToDisplay', () => {
    it('실제 카메라 EXIF 픽스처를 넣으면 각 필드가 정확한 값으로 매핑된다', () => {
        const result = mapExifToDisplay(REAL_EXIFR_OUTPUT_FIXTURE)

        expect(result.hasData).toBe(true)
        expect(result.camera).toEqual({make: 'Canon', model: 'Canon EOS R5', serialNumber: '112233445566'})
        expect(result.captureDate).toBe('2024-05-17 14:32:10')
        expect(result.orientation).toBe('Horizontal (normal)')
        expect(result.dimensions).toEqual({width: 600, height: 400})
        expect(result.settings).toEqual({
            exposureTime: '1/125s',
            fNumber: 'f/2.8',
            iso: 400,
            focalLength: '50mm',
        })
    })

    it('GPS 좌표는 exiftool 기준값(37.566500 N, 126.978000 E)과 소수점 4자리까지 일치한다', () => {
        const result = mapExifToDisplay(REAL_EXIFR_OUTPUT_FIXTURE)

        expect(result.gps).toBeDefined()
        expect(result.gps!.latitude).toBeCloseTo(37.5665, 4)
        expect(result.gps!.longitude).toBeCloseTo(126.978, 4)
        expect(result.gps!.text).toContain('37.5665')
        expect(result.gps!.text).toContain('126.978')
    })

    it('GPS와 기기 일련번호가 있으면 민감 항목으로 표시된다', () => {
        const result = mapExifToDisplay(REAL_EXIFR_OUTPUT_FIXTURE)

        const keys = result.sensitiveFields.map(f => f.key)
        expect(keys).toContain('gps')
        expect(keys).toContain('serialNumber')
    })

    it('GPS도 일련번호도 없는 EXIF는 민감 항목이 비어있다 (좁게 맞는 것과 넓게 잘못된 것 구분)', () => {
        const noSensitive = mapExifToDisplay({
            Make: 'Apple', Model: 'iPhone 15', ExifImageWidth: 4032, ExifImageHeight: 3024,
        })

        expect(noSensitive.hasData).toBe(true)
        expect(noSensitive.sensitiveFields).toEqual([])
        expect(noSensitive.gps).toBeUndefined()
        expect(noSensitive.camera).toEqual({make: 'Apple', model: 'iPhone 15', serialNumber: undefined})
    })

    it('EXIF가 없는 이미지(undefined)는 에러 없이 hasData=false로 매핑된다', () => {
        const result = mapExifToDisplay(undefined)

        expect(result.hasData).toBe(false)
        expect(result.camera).toBeUndefined()
        expect(result.gps).toBeUndefined()
        expect(result.settings).toBeUndefined()
        expect(result.sensitiveFields).toEqual([])
    })

    it('EXIF가 빈 객체({})인 경우에도 hasData=false로 매핑된다', () => {
        const result = mapExifToDisplay({})

        expect(result.hasData).toBe(false)
    })

    it('GPSLatitude/Longitude만 있고 exifr이 latitude/longitude를 미리 계산해주지 않은 경우 DMS를 직접 변환한다', () => {
        const result = mapExifToDisplay({
            Make: 'Sony',
            GPSLatitudeRef: 'S',
            GPSLatitude: [33, 51, 54.0],
            GPSLongitudeRef: 'W',
            GPSLongitude: [151, 12, 36.0],
        })

        expect(result.gps).toBeDefined()
        // 남/서 반구는 음수여야 한다
        expect(result.gps!.latitude).toBeCloseTo(-33.865, 3)
        expect(result.gps!.longitude).toBeCloseTo(-151.21, 2)
    })

    it('노출시간이 1초 이상이면 분수가 아니라 초 단위로 표시한다', () => {
        const result = mapExifToDisplay({Make: 'X', ExposureTime: 2.5})
        expect(result.settings?.exposureTime).toBe('2.5s')
    })
})

describe('formatCameraLabel', () => {
    it('model이 make로 시작하면(Canon EOS R5) 중복 없이 model만 반환한다', () => {
        expect(formatCameraLabel('Canon', 'Canon EOS R5')).toBe('Canon EOS R5')
    })

    it('model이 make를 포함하지 않으면 make와 model을 이어붙인다', () => {
        expect(formatCameraLabel('Apple', 'iPhone 15')).toBe('Apple iPhone 15')
    })

    it('make만 있으면 make만 반환한다', () => {
        expect(formatCameraLabel('Sony', undefined)).toBe('Sony')
    })

    it('둘 다 없으면 "알 수 없음"을 반환한다', () => {
        expect(formatCameraLabel(undefined, undefined)).toBe('알 수 없음')
    })
})

describe('dmsToDecimal', () => {
    it('도/분/초 배열을 십진 좌표로 정확히 변환한다', () => {
        expect(dmsToDecimal([37, 33, 59.4], 'N')).toBeCloseTo(37.5665, 4)
    })

    it('S/W 기준(ref)이면 음수 부호를 붙인다', () => {
        expect(dmsToDecimal([37, 33, 59.4], 'S')).toBeCloseTo(-37.5665, 4)
        expect(dmsToDecimal([126, 58, 40.8], 'W')).toBeCloseTo(-126.978, 3)
    })
})
