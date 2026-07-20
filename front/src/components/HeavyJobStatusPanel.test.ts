import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import HeavyJobStatusPanel from './HeavyJobStatusPanel.vue'
import type {HeavyJobProgress, HeavyJobResult} from '../composables/useHeavyJob'

interface PanelProps {
    jobId: string | null
    progress: HeavyJobProgress | null
    reconnecting: boolean
    sseFailed: boolean
    result: HeavyJobResult | null
    uploadError: string | null
    idlePrompt: string
}

const BASE_PROPS: Omit<PanelProps, 'idlePrompt'> = {
    jobId: null,
    progress: null,
    reconnecting: false,
    sseFailed: false,
    result: null,
    uploadError: null,
}

function mountPanel(props: Partial<PanelProps> = {}) {
    return mount(HeavyJobStatusPanel, {
        props: {...BASE_PROPS, ...props},
        global: {stubs: {FileResultPanel: true}},
    })
}

describe('HeavyJobStatusPanel', () => {
    it('jobId가 없으면 idle 안내 문구를 보여준다', () => {
        const wrapper = mountPanel({idlePrompt: '파일을 업로드하면 처리가 시작됩니다'})
        expect(wrapper.text()).toContain('파일을 업로드하면 처리가 시작됩니다')
    })

    it('uploadError가 있으면 다른 상태보다 우선해서 업로드 에러를 보여준다', () => {
        const wrapper = mountPanel({jobId: 'job-1', uploadError: '파일이 너무 큽니다'})
        expect(wrapper.text()).toContain('파일이 너무 큽니다')
    })

    it('진행 중이고 progress>0이면 진행률과 ETA를 보여준다', () => {
        const wrapper = mountPanel({
            jobId: 'job-1',
            progress: {queuePosition: 0, progress: 42, etaSeconds: 130},
        })
        expect(wrapper.text()).toContain('42%')
        expect(wrapper.text()).toContain('2분 10초')
    })

    it('대기열에 있으면(progress=0, queuePosition>0) 진행률 대신 대기 순번을 보여준다', () => {
        const wrapper = mountPanel({
            jobId: 'job-1',
            progress: {queuePosition: 3, progress: 0, etaSeconds: null},
        })
        expect(wrapper.text()).toContain('앞에 3개')
    })

    it('sseFailed면 새로고침 안내를 보여준다(무한 스피너 방치 방지)', () => {
        const wrapper = mountPanel({jobId: 'job-1', sseFailed: true})
        expect(wrapper.text()).toContain('새로고침')
    })

    it('reconnecting이면 재연결 중 문구를 보여준다', () => {
        const wrapper = mountPanel({
            jobId: 'job-1',
            reconnecting: true,
            progress: {queuePosition: 0, progress: 10, etaSeconds: null},
        })
        expect(wrapper.text()).toContain('재연결 중')
    })

    it('result.url이 없고 result.text만 있으면(처리 실패) 실패 메시지를 보여준다', () => {
        const wrapper = mountPanel({
            jobId: 'job-1',
            result: {url: null, text: '처리에 실패했습니다.'},
        })
        expect(wrapper.text()).toContain('처리에 실패했습니다.')
    })

    it('result.url이 있으면 FileResultPanel을 렌더한다', () => {
        const wrapper = mountPanel({
            jobId: 'job-1',
            result: {url: '/api/v1/files/job-1/result.pdf', text: null},
        })
        expect(wrapper.findComponent({name: 'FileResultPanel'}).exists()).toBe(true)
    })
})
