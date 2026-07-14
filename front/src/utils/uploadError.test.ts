import {describe, expect, it} from 'vitest'
import {uploadErrorMessage} from './uploadError'

describe('uploadErrorMessage', () => {
    it('413에 서버 메시지가 있으면 그 메시지를 그대로 쓴다(폴백이 아니라)', () => {
        // 폴백 문구에도 "크기"가 들어가므로, 폴백과 구분되는 서버 고유 문구를 정확히 반환하는지 확인한다.
        const serverMessage = '업로드 가능한 최대 크기는 50MB입니다.'
        const msg = uploadErrorMessage({response: {status: 413, data: {code: 'FILE_TOO_LARGE', message: serverMessage}}})
        expect(msg).toBe(serverMessage)
    })

    it('413인데 바디가 비어 있어도(nginx 등) status만으로 크기 메시지를 반환한다', () => {
        // 실제 버그: 프록시가 자른 413은 JSON 바디가 없다. status만으로 구분해야 한다.
        const msg = uploadErrorMessage({response: {status: 413, data: ''}})
        expect(msg).toContain('크기')
    })

    it('429(쿼터)는 크기 메시지가 아닌 쿼터 관련 메시지를 반환한다', () => {
        const msg = uploadErrorMessage({response: {status: 429, data: {code: 'QUOTA_EXCEEDED', message: '동시에 처리 중인 작업이 너무 많습니다. 잠시 후 다시 시도해 주세요.'}}})
        expect(msg).not.toContain('크기')
        expect(msg).toContain('작업')
    })

    it('그 외 응답은 서버 메시지를 우선 표시한다', () => {
        const msg = uploadErrorMessage({response: {status: 400, data: {message: '지원하지 않는 파일 형식입니다.'}}})
        expect(msg).toBe('지원하지 않는 파일 형식입니다.')
    })

    it('네트워크 오류 등 응답이 없으면 일반 실패 메시지를 반환한다', () => {
        const msg = uploadErrorMessage(new Error('Network Error'))
        expect(msg).toBeTruthy()
        expect(msg).not.toContain('크기')
    })
})
