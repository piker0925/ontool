/// <reference types="vitest/config" />
import {defineConfig, loadEnv, type Plugin} from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import {buildRobotsTxt, buildSitemapXml} from './src/build/sitemap.js'

// 도메인 미구매(ADR-0023) — 실제 도메인 확정 시 VITE_SITE_URL로 교체
const DEFAULT_SITE_URL = 'https://ontool.example'

function sitemapPlugin(siteUrl: string): Plugin {
    let outDir = 'dist'
    return {
        name: 'ontool-sitemap',
        apply: 'build',
        configResolved(config) {
            outDir = config.build.outDir
        },
        closeBundle() {
            const dir = path.isAbsolute(outDir) ? outDir : path.resolve(__dirname, outDir)
            fs.mkdirSync(dir, {recursive: true})
            fs.writeFileSync(path.join(dir, 'sitemap.xml'), buildSitemapXml(siteUrl))
            fs.writeFileSync(path.join(dir, 'robots.txt'), buildRobotsTxt(siteUrl))
        },
    }
}

export default defineConfig(({mode}) => {
    // vite.config.ts는 Node 컨텍스트라 .env 파일이 process.env로 자동 반영되지 않는다 —
    // loadEnv로 직접 읽고, 실제 셸/CI 환경변수(process.env)가 있으면 그쪽을 우선한다.
    const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
    const siteUrl = process.env.VITE_SITE_URL || fileEnv.VITE_SITE_URL || DEFAULT_SITE_URL
    const apiBaseUrl = process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || 'http://localhost:8080'

    return {
        plugins: [vue(), tailwindcss(), sitemapPlugin(siteUrl)],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            // Node 22+의 네이티브 --experimental-webstorage가 기본 켜져 있으면 --localstorage-file 없이는
            // globalThis.localStorage.getItem이 undefined라 jsdom의 localStorage와 충돌한다. 워커 프로세스에서
            // 꺼서 jsdom이 제공하는 localStorage만 쓰도록 한다.
            execArgv: ['--no-experimental-webstorage'],
            // v8 커버리지 계측이 켜지면 전체 스위트가 무거워져 mount 등 렌더링 비중이 큰 테스트가
            // 5000ms 기본값을 넘기는 경우가 실행마다 다른 테스트에서 산발적으로 발생한다 — 개별
            // 테스트를 하나씩 늘리는 대신 전역 기본값을 올려 근본 원인(계측 오버헤드)에 맞춘다.
            testTimeout: 10000,
            // 임계값(게이트) 없이 리포트만 생성 — 프론트는 아직 커버리지 실측치가 없어서 강제 기준을
            // 먼저 정하기보다 숫자를 몇 차례 지켜본 뒤 도입 여부를 재검토한다.
            coverage: {
                provider: 'v8',
                reporter: ['text', 'html'],
            },
        },
        server: {
            host: true,
            // storage.base-url이 local 프로파일에서 일부러 빈 문자열이라(LAN 기기 접속 대비),
            // Job 결과 URL(/api/v1/files/...)이 상대경로로 내려온다. axios 호출은 apiClient의
            // baseURL로 절대주소가 되지만, <img src>·다운로드 <a href>는 그 URL을 그대로 써서
            // 프론트 자신의 오리진(Vite 서버)으로 요청이 가버린다 — 매칭되는 라우트가 없어
            // Vite가 index.html을 돌려주므로 "결과가 HTML로 나온다"는 증상이 된다.
            // 이 프록시가 그 간극을 메워 프론트 오리진의 /api/* 요청을 백엔드로 넘겨준다.
            proxy: {
                '/api': {target: apiBaseUrl, changeOrigin: true},
            },
        },
    }
})
