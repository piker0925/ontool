import {describe, expect, it} from 'vitest'
import {GITIGNORE_TEMPLATES, mergeGitignoreTemplates} from './gitignoreTemplates'

const EXISTING_TEMPLATE_IDS = ['node', 'java', 'python', 'intellij', 'vscode', 'macos', 'windows', 'linux']
const NEW_TEMPLATE_IDS = ['gradle', 'vite', 'react', 'go', 'rust']

/**
 * 아래 배열들은 각 생태계의 공식 출처에서 그대로 가져온 값(하드코딩된 기준값)이다.
 * GITIGNORE_TEMPLATES 자기 자신에서 파생된 값이 아니므로, 템플릿 내용이 실제
 * 공식 소스와 정확히 일치하는지 독립적으로 검증할 수 있다 (동어반복 회피).
 *
 * 출처:
 * - Gradle: https://github.com/github/gitignore/blob/main/Gradle.gitignore
 * - Go:     https://github.com/github/gitignore/blob/main/Go.gitignore
 * - Rust:   https://github.com/github/gitignore/blob/main/Rust.gitignore
 * - Vue/Vite: https://github.com/vitejs/vite/blob/main/packages/create-vite/template-vue/_gitignore
 * - React/Next.js: https://github.com/vercel/next.js/blob/canary/packages/create-next-app/templates/app-tw/ts/gitignore
 *   (각 파일의 주석/빈 줄을 제외한 패턴 라인만 순서대로 나열)
 */
const OFFICIAL_GRADLE_GITIGNORE = [
    '.gradle',
    '**/build/',
    '!**/src/**/build/',
    'gradle-app.setting',
    '!gradle-wrapper.jar',
    '!gradle-wrapper.properties',
    '.gradletasknamecache',
    '.project',
    '.classpath',
]

const OFFICIAL_GO_GITIGNORE = [
    '*.exe',
    '*.exe~',
    '*.dll',
    '*.so',
    '*.dylib',
    '*.test',
    '*.out',
    'coverage.*',
    '*.coverprofile',
    'profile.cov',
    'go.work',
    'go.work.sum',
    '.env',
]

const OFFICIAL_RUST_GITIGNORE = [
    'debug',
    'target',
    '**/*.rs.bk',
    '*.pdb',
    '**/mutants.out*/',
    'rustc-ice-*.txt',
]

const OFFICIAL_VITE_VUE_GITIGNORE = [
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*',
    'lerna-debug.log*',
    'node_modules',
    'dist',
    'dist-ssr',
    '*.local',
    '.vscode/*',
    '!.vscode/extensions.json',
    '.idea',
    '.DS_Store',
    '*.suo',
    '*.ntvs*',
    '*.njsproj',
    '*.sln',
    '*.sw?',
]

const OFFICIAL_REACT_NEXTJS_GITIGNORE = [
    '/node_modules',
    '/.pnp',
    '.pnp.*',
    '.yarn/*',
    '!.yarn/patches',
    '!.yarn/plugins',
    '!.yarn/releases',
    '!.yarn/versions',
    '/coverage',
    '/.next/',
    '/out/',
    '/build',
    '.DS_Store',
    '*.pem',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '.pnpm-debug.log*',
    '.env*',
    '.vercel',
    '*.tsbuildinfo',
    'next-env.d.ts',
]

describe('GITIGNORE_TEMPLATES', () => {
    it('기존 8종 템플릿이 회귀 없이 그대로 존재한다', () => {
        for (const id of EXISTING_TEMPLATE_IDS) {
            const template = GITIGNORE_TEMPLATES.find(t => t.id === id)
            expect(template, `${id} 템플릿이 존재해야 한다`).toBeDefined()
            expect(template!.entries.length).toBeGreaterThan(0)
        }
    })

    it('신규 템플릿(Gradle, Vue/Vite, React, Go, Rust)이 최소 5종 추가되어 있다', () => {
        for (const id of NEW_TEMPLATE_IDS) {
            const template = GITIGNORE_TEMPLATES.find(t => t.id === id)
            expect(template, `${id} 템플릿이 존재해야 한다`).toBeDefined()
        }
        expect(NEW_TEMPLATE_IDS.length).toBeGreaterThanOrEqual(5)
    })

    it('모든 템플릿은 id·label이 비어있지 않고 entries가 최소 1개 이상이다', () => {
        for (const template of GITIGNORE_TEMPLATES) {
            expect(template.id.length).toBeGreaterThan(0)
            expect(template.label.length).toBeGreaterThan(0)
            expect(template.entries.length).toBeGreaterThan(0)
            for (const entry of template.entries) {
                expect(entry.length).toBeGreaterThan(0)
            }
        }
    })

    it('템플릿 id는 서로 중복되지 않는다', () => {
        const ids = GITIGNORE_TEMPLATES.map(t => t.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('Gradle 템플릿은 github/gitignore의 Gradle.gitignore와 정확히 일치한다', () => {
        const gradle = GITIGNORE_TEMPLATES.find(t => t.id === 'gradle')!
        expect(gradle.entries).toEqual(OFFICIAL_GRADLE_GITIGNORE)
    })

    it('Vue/Vite 템플릿은 vitejs/vite의 create-vite template-vue _gitignore와 정확히 일치한다', () => {
        const vite = GITIGNORE_TEMPLATES.find(t => t.id === 'vite')!
        expect(vite.entries).toEqual(OFFICIAL_VITE_VUE_GITIGNORE)
    })

    it('React / Next.js 템플릿은 vercel/next.js의 create-next-app 템플릿 gitignore와 정확히 일치한다', () => {
        const react = GITIGNORE_TEMPLATES.find(t => t.id === 'react')!
        expect(react.entries).toEqual(OFFICIAL_REACT_NEXTJS_GITIGNORE)
    })

    it('Go 템플릿은 github/gitignore의 Go.gitignore와 정확히 일치한다', () => {
        const go = GITIGNORE_TEMPLATES.find(t => t.id === 'go')!
        expect(go.entries).toEqual(OFFICIAL_GO_GITIGNORE)
    })

    it('Rust 템플릿은 github/gitignore의 Rust.gitignore와 정확히 일치한다', () => {
        const rust = GITIGNORE_TEMPLATES.find(t => t.id === 'rust')!
        expect(rust.entries).toEqual(OFFICIAL_RUST_GITIGNORE)
    })
})

describe('mergeGitignoreTemplates', () => {
    it('템플릿 하나만 선택하면 해당 템플릿의 항목이 그대로 출력된다', () => {
        const result = mergeGitignoreTemplates(['node'])
        const nodeTemplate = GITIGNORE_TEMPLATES.find(t => t.id === 'node')!
        for (const entry of nodeTemplate.entries) {
            expect(result).toContain(entry)
        }
    })

    it('템플릿 2개(Node + macOS)를 선택하면 두 템플릿 항목이 모두 포함되어 병합된다', () => {
        const result = mergeGitignoreTemplates(['node', 'macos'])
        const node = GITIGNORE_TEMPLATES.find(t => t.id === 'node')!
        const macos = GITIGNORE_TEMPLATES.find(t => t.id === 'macos')!
        const resultLines = result.split('\n').filter(line => line && !line.startsWith('#'))

        for (const entry of [...node.entries, ...macos.entries]) {
            expect(resultLines).toContain(entry)
        }
    })

    it('두 템플릿에 겹치는 항목(.env)이 있으면 병합 결과에 한 번만 나타난다', () => {
        const node = GITIGNORE_TEMPLATES.find(t => t.id === 'node')!
        const python = GITIGNORE_TEMPLATES.find(t => t.id === 'python')!
        expect(node.entries).toContain('.env')
        expect(python.entries).toContain('.env')

        const result = mergeGitignoreTemplates(['node', 'python'])
        const resultLines = result.split('\n').filter(line => line && !line.startsWith('#'))

        expect(resultLines.filter(line => line === '.env')).toHaveLength(1)
        expect(new Set(resultLines).size).toBe(resultLines.length)
    })

    it('신규 템플릿 2개(Gradle + Go)를 선택하면 두 템플릿 항목이 모두 포함되어 병합된다', () => {
        const result = mergeGitignoreTemplates(['gradle', 'go'])
        const gradle = GITIGNORE_TEMPLATES.find(t => t.id === 'gradle')!
        const go = GITIGNORE_TEMPLATES.find(t => t.id === 'go')!
        const resultLines = result.split('\n').filter(line => line && !line.startsWith('#'))

        for (const entry of [...gradle.entries, ...go.entries]) {
            expect(resultLines).toContain(entry)
        }
    })
})
