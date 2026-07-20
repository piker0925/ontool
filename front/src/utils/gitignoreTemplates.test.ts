import {describe, expect, it} from 'vitest'
import {GITIGNORE_TEMPLATES, mergeGitignoreTemplates} from './gitignoreTemplates'

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
})
