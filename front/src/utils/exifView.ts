/**
 * exifr.parse(file, true)가 반환하는 결과(느슨한 태그 맵)를 화면 표시용 구조로 변환하는 순수 함수 모음.
 * exifr 호출 자체(비동기 파싱)는 컴포넌트에서 수행하고, 이 파일은 "이미 파싱된 값 → 표시 구조" 매핑만 담당한다.
 */

/** exifr 출력은 태그마다 타입이 달라 unknown에 가까운 맵으로 취급한다. */
export type RawExifTags = Record<string, unknown>

export interface ExifCameraInfo {
    make?: string
    model?: string
    serialNumber?: string
}

export interface ExifCaptureSettings {
    exposureTime?: string
    fNumber?: string
    iso?: number
    focalLength?: string
}

export interface ExifGpsInfo {
    latitude: number
    longitude: number
    /** 좌표를 사람이 읽을 수 있는 텍스트로 (지도 임베드는 하지 않는다) */
    text: string
}

export interface ExifDimensions {
    width: number
    height: number
}

export type ExifSensitiveKey = 'gps' | 'serialNumber'

export interface ExifSensitiveField {
    key: ExifSensitiveKey
    label: string
}

export interface ExifDisplayData {
    /** false면 EXIF 자체가 없는 이미지 — "메타데이터 없음" 빈 상태로 표시 */
    hasData: boolean
    camera?: ExifCameraInfo
    /** "YYYY-MM-DD HH:mm:ss" 형태로 이미 포맷된 문자열 */
    captureDate?: string
    gps?: ExifGpsInfo
    settings?: ExifCaptureSettings
    dimensions?: ExifDimensions
    orientation?: string
    sensitiveFields: ExifSensitiveField[]
}

function toStringOrUndefined(v: unknown): string | undefined {
    if (v === null || v === undefined) return undefined
    if (typeof v === 'string') return v.trim() === '' ? undefined : v
    if (typeof v === 'number') return String(v)
    return undefined
}

function toNumberOrUndefined(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    return undefined
}

/** 도/분/초(DMS) 배열 + 기준(N/S/E/W)을 십진 좌표로 변환한다. */
export function dmsToDecimal(dms: [number, number, number], ref: string): number {
    const [deg, min, sec] = dms
    const decimal = deg + min / 60 + sec / 3600
    const isNegative = ref === 'S' || ref === 'W' || ref === 's' || ref === 'w'
    return isNegative ? -decimal : decimal
}

function extractGps(raw: RawExifTags): ExifGpsInfo | undefined {
    const lat = toNumberOrUndefined(raw.latitude)
    const lon = toNumberOrUndefined(raw.longitude)
    if (lat !== undefined && lon !== undefined) {
        return {latitude: lat, longitude: lon, text: formatGpsText(lat, lon)}
    }

    const latDms = raw.GPSLatitude
    const lonDms = raw.GPSLongitude
    if (
        Array.isArray(latDms) && latDms.length === 3 &&
        Array.isArray(lonDms) && lonDms.length === 3
    ) {
        const latRef = toStringOrUndefined(raw.GPSLatitudeRef) ?? 'N'
        const lonRef = toStringOrUndefined(raw.GPSLongitudeRef) ?? 'E'
        const latitude = dmsToDecimal(latDms as [number, number, number], latRef)
        const longitude = dmsToDecimal(lonDms as [number, number, number], lonRef)
        return {latitude, longitude, text: formatGpsText(latitude, longitude)}
    }

    return undefined
}

function formatGpsText(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

function formatExposureTime(seconds: number): string {
    if (seconds >= 1) {
        return `${trimTrailingZeros(seconds)}s`
    }
    const denominator = Math.round(1 / seconds)
    return `1/${denominator}s`
}

function trimTrailingZeros(n: number): string {
    return Number(n.toFixed(3)).toString()
}

function formatFNumber(n: number): string {
    return `f/${trimTrailingZeros(n)}`
}

function formatFocalLength(n: number): string {
    return `${trimTrailingZeros(n)}mm`
}

function formatCaptureDate(v: unknown): string | undefined {
    const date = v instanceof Date ? v : (typeof v === 'string' ? new Date(v) : undefined)
    if (!date || isNaN(date.getTime())) return undefined

    const pad = (n: number) => String(n).padStart(2, '0')
    // exifr은 EXIF 원문 시각을 "로컬 시각"으로 해석해 Date를 만든다.
    // 같은 런타임에서 로컬 getter로 다시 꺼내면 원본 표기(연-월-일 시:분:초)가 그대로 복원된다.
    const y = date.getFullYear()
    const mo = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const mi = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`
}

function extractDimensions(raw: RawExifTags): ExifDimensions | undefined {
    const width = toNumberOrUndefined(raw.ExifImageWidth) ?? toNumberOrUndefined(raw.ImageWidth) ?? toNumberOrUndefined(raw.PixelXDimension)
    const height = toNumberOrUndefined(raw.ExifImageHeight) ?? toNumberOrUndefined(raw.ImageHeight) ?? toNumberOrUndefined(raw.PixelYDimension)
    if (width === undefined || height === undefined) return undefined
    return {width, height}
}

/**
 * 카메라 제조사/모델을 표시용 한 줄로 합친다.
 * 많은 카메라(Canon 등)는 Model 태그에 제조사명을 이미 포함하므로("Canon EOS R5") 그대로 이어붙이면
 * "Canon Canon EOS R5"처럼 중복된다 — model이 make로 시작하면 model만 쓴다.
 */
export function formatCameraLabel(make?: string, model?: string): string {
    if (make && model) {
        return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`
    }
    return make || model || '알 수 없음'
}

/** exifr 파싱 결과를 화면 표시 구조로 매핑한다. raw가 없거나 빈 객체면 hasData=false. */
export function mapExifToDisplay(raw: RawExifTags | null | undefined): ExifDisplayData {
    if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
        return {hasData: false, sensitiveFields: []}
    }

    const make = toStringOrUndefined(raw.Make)
    const model = toStringOrUndefined(raw.Model)
    const serialNumber = toStringOrUndefined(raw.SerialNumber) ?? toStringOrUndefined(raw.LensSerialNumber)
    const camera = (make || model || serialNumber) ? {make, model, serialNumber} : undefined

    const captureDate = formatCaptureDate(raw.DateTimeOriginal ?? raw.CreateDate ?? raw.ModifyDate)

    const gps = extractGps(raw)

    const exposureTimeRaw = toNumberOrUndefined(raw.ExposureTime)
    const fNumberRaw = toNumberOrUndefined(raw.FNumber)
    const isoRaw = toNumberOrUndefined(raw.ISO)
    const focalLengthRaw = toNumberOrUndefined(raw.FocalLength)
    const hasSettings = exposureTimeRaw !== undefined || fNumberRaw !== undefined || isoRaw !== undefined || focalLengthRaw !== undefined
    const settings: ExifCaptureSettings | undefined = hasSettings ? {
        exposureTime: exposureTimeRaw !== undefined ? formatExposureTime(exposureTimeRaw) : undefined,
        fNumber: fNumberRaw !== undefined ? formatFNumber(fNumberRaw) : undefined,
        iso: isoRaw,
        focalLength: focalLengthRaw !== undefined ? formatFocalLength(focalLengthRaw) : undefined,
    } : undefined

    const dimensions = extractDimensions(raw)
    const orientation = toStringOrUndefined(raw.Orientation)

    const sensitiveFields: ExifSensitiveField[] = []
    if (gps) sensitiveFields.push({key: 'gps', label: 'GPS 위치'})
    if (serialNumber) sensitiveFields.push({key: 'serialNumber', label: '기기 일련번호'})

    const hasData = !!(camera || captureDate || gps || settings || dimensions || orientation)

    return {hasData, camera, captureDate, gps, settings, dimensions, orientation, sensitiveFields}
}
