import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {createMemoryHistory, createRouter} from 'vue-router'
import FinanceCalculatorPage from './FinanceCalculatorPage.vue'

async function mountWithQuery(query: string) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/tools/finance-calculator', component: FinanceCalculatorPage}],
    })
    router.push('/tools/finance-calculator' + query)
    await router.isReady()
    return mount(FinanceCalculatorPage, {global: {plugins: [router]}})
}

describe('FinanceCalculatorPage', () => {
    it('쿼리 없이 진입하면 기본 탭(대출 원리금)이 열림', async () => {
        const wrapper = await mountWithQuery('')
        expect(wrapper.find('[data-testid="tab-panel-loan"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tab-panel-vat"]').exists()).toBe(false)
    })

    it('?tab=vat 쿼리로 진입하면 부가세 탭이 바로 열림(딥링크)', async () => {
        const wrapper = await mountWithQuery('?tab=vat')
        expect(wrapper.find('[data-testid="tab-panel-vat"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tab-panel-loan"]').exists()).toBe(false)
    })

    it('탭과 무관하게 면책 문구와 기준연도가 항상 보임', async () => {
        const wrapper = await mountWithQuery('?tab=deposit')
        expect(wrapper.text()).toContain('참고용 계산이며 법적 효력이 없습니다')
        expect(wrapper.text()).toContain('2026년 기준')
    })

    it('대출 원리금 탭: 원리금균등과 원금균등을 전환하면 총 이자가 서로 다르게 나옴(같은 로직으로 착각하지 않도록)', async () => {
        const wrapper = await mountWithQuery('?tab=loan')
        const panel = wrapper.find('[data-testid="tab-panel-loan"]')
        const equalPaymentText = wrapper.text()
        await panel.find('select').setValue('equal-principal')
        const equalPrincipalText = wrapper.text()
        expect(equalPaymentText).not.toBe(equalPrincipalText)
    })

    it('대출 원리금 상환표는 마지막 회차에 잔액 0으로 표시됨', async () => {
        const wrapper = await mountWithQuery('?tab=loan')
        const rows = wrapper.findAll('tbody tr')
        const lastRowCells = rows[rows.length - 1].findAll('td')
        expect(lastRowCells[lastRowCells.length - 1].text()).toBe('0')
    })

    it('전월세 전환 탭: 보증금 차액 12,000만원(=12,000,000원 아님, 1.2억)을 전환율 5%로 월세 전환 후 역방향으로 바꾸면 같은 크기의 원값으로 돌아옴(라운드트립)', async () => {
        const wrapper = await mountWithQuery('?tab=jeonse')
        const panel = wrapper.find('[data-testid="tab-panel-jeonse"]')
        const inputs = panel.findAll('input')
        await inputs[0].setValue('12000') // 보증금 차액 12,000만원 = 1.2억원
        await inputs[1].setValue('5') // 전환율 5%
        expect(wrapper.text()).toContain('500,000원') // 월세

        await panel.find('select').setValue('rent-to-deposit')
        const inputsAfter = panel.findAll('input')
        await inputsAfter[0].setValue('50') // 월세 50만원
        await inputsAfter[1].setValue('5')
        expect(wrapper.text()).toContain('120,000,000원') // 원래 보증금 차액으로 정확히 복원
    })

    it('전월세 전환 탭: "보증금 차액 + 월세 → 전환율 계산" 모드에서 1.2억/50만원을 입력하면 전환율 5.00%가 역산됨', async () => {
        const wrapper = await mountWithQuery('?tab=jeonse')
        const panel = wrapper.find('[data-testid="tab-panel-jeonse"]')
        await panel.find('select').setValue('rate-from-both')
        const inputs = panel.findAll('input')
        await inputs[0].setValue('12000') // 보증금 차액 12,000만원
        await inputs[1].setValue('50') // 월세 50만원
        expect(wrapper.text()).toContain('5.00%')
    })

    it('전월세 전환 탭: 적용 전환율이 법정 상한(기준금리+2.0%p)을 넘으면 경고가 뜨고, 상한 이내면 안 뜸', async () => {
        const wrapper = await mountWithQuery('?tab=jeonse')
        const panel = wrapper.find('[data-testid="tab-panel-jeonse"]')
        const inputs = panel.findAll('input')
        await inputs[1].setValue('10') // 전환율 10% — 기본 기준금리 2.75% + 2.0%p = 상한 4.75%를 초과
        expect(wrapper.text()).toContain('를 초과합니다')

        await inputs[1].setValue('3') // 3%는 상한 4.75% 이내
        expect(wrapper.text()).not.toContain('를 초과합니다')
    })

    it('부가세 탭: 공급가액 100만원 입력 시 부가세 10만원, 합계 110만원이 함께 보임', async () => {
        const wrapper = await mountWithQuery('?tab=vat')
        const panel = wrapper.find('[data-testid="tab-panel-vat"]')
        await panel.findAll('input')[0].setValue('100')
        expect(wrapper.text()).toContain('100,000원') // 부가세
        expect(wrapper.text()).toContain('1,000,000원') // 공급가액
        expect(wrapper.text()).toContain('1,100,000원') // 합계
    })

    it('부가세 탭: 방향을 "부가세 포함가 → 공급가액"으로 바꾸면 110만원 입력 시 공급가액이 100만원으로 정확히 역산됨', async () => {
        const wrapper = await mountWithQuery('?tab=vat')
        const panel = wrapper.find('[data-testid="tab-panel-vat"]')
        await panel.find('select').setValue('total-to-supply')
        await panel.findAll('input')[0].setValue('110')
        expect(wrapper.text()).toContain('1,000,000원') // 공급가액
    })

    it('큰 금액 입력칸에 콤마가 포함된 값을 넣어도 정상 파싱됨', async () => {
        const wrapper = await mountWithQuery('?tab=loan')
        const panel = wrapper.find('[data-testid="tab-panel-loan"]')
        await panel.findAll('input')[0].setValue('1,000')
        expect(wrapper.find('[data-testid="tab-panel-loan"] input').element.value).toBe('1,000')
    })
})
