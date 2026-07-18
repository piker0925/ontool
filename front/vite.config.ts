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
        },
        server: {
            host: true
        },
    }
})
