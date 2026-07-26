import {describe, expect, it} from 'vitest'
import {GITIGNORE_TEMPLATES, mergeGitignoreTemplates} from './gitignoreTemplates'

const EXISTING_TEMPLATE_IDS = ['node', 'java', 'python', 'intellij', 'vscode', 'macos', 'windows', 'linux']
const NEW_TEMPLATE_IDS = ['gradle', 'vite', 'react', 'go', 'rust']

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

    it('Gradle 템플릿은 표준 빌드 산출물 패턴을 포함한다', () => {
        const gradle = GITIGNORE_TEMPLATES.find(t => t.id === 'gradle')!
        expect(gradle.entries).toContain('.gradle')
        expect(gradle.entries).toContain('**/build/')
        expect(gradle.entries).toContain('!gradle-wrapper.jar')
    })

    it('Vue/Vite 템플릿은 표준 빌드 산출물·로그 패턴을 포함한다', () => {
        const vite = GITIGNORE_TEMPLATES.find(t => t.id === 'vite')!
        expect(vite.entries).toContain('node_modules')
        expect(vite.entries).toContain('dist')
        expect(vite.entries).toContain('dist-ssr')
    })

    it('React / Next.js 템플릿은 표준 빌드 산출물·환경변수 패턴을 포함한다', () => {
        const react = GITIGNORE_TEMPLATES.find(t => t.id === 'react')!
        expect(react.entries).toContain('/node_modules')
        expect(react.entries).toContain('/build')
        expect(react.entries).toContain('.env*')
    })

    it('Go 템플릿은 표준 바이너리·테스트 산출물 패턴을 포함한다', () => {
        const go = GITIGNORE_TEMPLATES.find(t => t.id === 'go')!
        expect(go.entries).toContain('*.exe')
        expect(go.entries).toContain('*.test')
        expect(go.entries).toContain('*.out')
    })

    it('Rust 템플릿은 표준 빌드 산출물 패턴을 포함한다', () => {
        const rust = GITIGNORE_TEMPLATES.find(t => t.id === 'rust')!
        expect(rust.entries).toContain('target')
        expect(rust.entries).toContain('debug')
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
