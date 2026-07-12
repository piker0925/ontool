import type {ModuleConfig} from './types'

/** 백엔드 CronModule이 ZoneId.of()로 해석하는 주요 타임존 10개 */
const CRON_TIMEZONES = [
    'Asia/Seoul',
    'UTC',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney',
]

export const DEVOPS_CONFIGS: Record<string, ModuleConfig> = {
    'cron': {
        params: [
            {
                key: 'expression', label: 'Cron 표현식', type: 'text', placeholder: '0 0 * * *',
                help: '분 시 일 월 요일 — 5개 필드 (UNIX cron)',
            },
            {
                key: 'timezone', label: '타임존', type: 'select',
                options: CRON_TIMEZONES, default: 'Asia/Seoul',
                help: '다음 실행 시각을 계산할 기준 시간대 (결과에 타임존 약자 표기)',
            },
            {key: 'count', label: '다음 실행 횟수', type: 'number', default: '5', unit: '회'},
        ],
        sample: {expression: '*/15 9-18 * * 1-5'},
    },
    'docker-compose': {
        params: [
            {
                key: 'command', label: 'docker run 명령어', type: 'textarea',
                placeholder: 'docker run -p 8080:80 -e ENV=prod --name web nginx',
                help: '지원 옵션: -p, -e, -v, --name, --network, --restart — 미지원 옵션은 결과 상단에 경고 주석으로 표시됩니다',
            },
        ],
        sample: {command: 'docker run -d -p 8080:80 -e TZ=Asia/Seoul --name web nginx:alpine'},
    },
}
