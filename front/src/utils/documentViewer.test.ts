import {describe, expect, it} from 'vitest'
import {detectDocumentType} from './documentViewer'

describe('detectDocumentType', () => {
    it('.docx 확장자는 docx로 인식한다', () => {
        expect(detectDocumentType('report.docx')).toBe('docx')
    })

    it('.xlsx 확장자는 xlsx로 인식한다', () => {
        expect(detectDocumentType('sheet.xlsx')).toBe('xlsx')
    })

    it('대문자 확장자도 인식한다', () => {
        expect(detectDocumentType('REPORT.DOCX')).toBe('docx')
    })

    it('지원하지 않는 확장자는 null을 반환한다', () => {
        expect(detectDocumentType('image.png')).toBeNull()
        expect(detectDocumentType('noextension')).toBeNull()
    })
})
