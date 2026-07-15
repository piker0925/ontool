import type {ModuleConfig} from './types'

export const DEVOPS_CONFIGS: Record<string, ModuleConfig> = {
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
