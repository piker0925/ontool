import {describe, expect, it} from 'vitest'
import {detectOfficeFormat, officeFormatLabel} from './officeDocumentFormat'

describe('detectOfficeFormat', () => {
    it('지원하는 6개 확장자를 각각 인식한다', () => {
        expect(detectOfficeFormat('a.hwp')).toBe('hwp')
        expect(detectOfficeFormat('a.hwpx')).toBe('hwpx')
        expect(detectOfficeFormat('a.pptx')).toBe('pptx')
        expect(detectOfficeFormat('a.ppt')).toBe('ppt')
        expect(detectOfficeFormat('a.doc')).toBe('doc')
        expect(detectOfficeFormat('a.xls')).toBe('xls')
    })

    it('대문자 확장자도 인식한다', () => {
        expect(detectOfficeFormat('REPORT.HWP')).toBe('hwp')
    })

    it('지원하지 않는 확장자는 null을 반환한다', () => {
        expect(detectOfficeFormat('image.png')).toBeNull()
        expect(detectOfficeFormat('report.docx')).toBeNull()
        expect(detectOfficeFormat('noextension')).toBeNull()
    })
})

describe('officeFormatLabel', () => {
    it('각 포맷의 표시 라벨을 반환한다', () => {
        expect(officeFormatLabel('hwp')).toBe('HWP')
        expect(officeFormatLabel('hwpx')).toBe('HWPX')
        expect(officeFormatLabel('pptx')).toBe('PPTX')
    })
})
