// Cron 표현식 설명 + 다음 실행 시각 — 브라우저 로컬.
// cronstrue(사람이 읽는 설명, 한국어) + cron-parser(다음 실행 계산).
import cronstrue from 'cronstrue/i18n'
import {CronExpressionParser} from 'cron-parser'
import {formatInTimezone} from './frontendTools'

/** 표현식을 사람이 읽는 문장으로. 잘못되면 예외. */
export function describeCron(expression: string, locale = 'ko'): string {
    return cronstrue.toString(expression.trim(), {locale, throwExceptionOnParseError: true})
}

/**
 * 다음 `count`개 실행 시각을 `tz` 기준 'YYYY-MM-DD HH:mm:ss' 문자열로.
 * `from`을 주면 그 시각 기준(테스트용 결정성), 없으면 현재 시각.
 */
export function nextCronRuns(expression: string, count: number, tz = 'Asia/Seoul', from?: Date): string[] {
    const interval = CronExpressionParser.parse(expression.trim(), {
        currentDate: from ?? new Date(),
        tz,
    })
    return interval.take(count).map(d => formatInTimezone(d.toDate().getTime(), tz))
}
