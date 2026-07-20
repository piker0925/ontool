export interface GitignoreTemplate {
    id: string
    label: string
    entries: string[]
}

export const GITIGNORE_TEMPLATES: GitignoreTemplate[] = [
    {
        id: 'node',
        label: 'Node.js',
        entries: ['node_modules/', 'npm-debug.log*', 'pnpm-debug.log*', 'yarn-error.log*', 'dist/', '.env', '.env.local'],
    },
    {
        id: 'java',
        label: 'Java',
        entries: ['*.class', '*.jar', '*.war', 'target/', 'build/', '.gradle/'],
    },
    {
        id: 'python',
        label: 'Python',
        entries: ['__pycache__/', '*.pyc', '*.pyo', '.venv/', 'venv/', '*.egg-info/', '.env'],
    },
    {
        id: 'intellij',
        label: 'IntelliJ IDEA',
        entries: ['.idea/', '*.iml', '*.iws', 'out/'],
    },
    {
        id: 'vscode',
        label: 'VS Code',
        entries: ['.vscode/*', '!.vscode/extensions.json'],
    },
    {
        id: 'macos',
        label: 'macOS',
        entries: ['.DS_Store', '.AppleDouble', '.LSOverride', '._*'],
    },
    {
        id: 'windows',
        label: 'Windows',
        entries: ['Thumbs.db', 'desktop.ini', '$RECYCLE.BIN/'],
    },
    {
        id: 'linux',
        label: 'Linux',
        entries: ['*~', '.directory', '.Trash-*'],
    },
]

export function mergeGitignoreTemplates(ids: string[]): string {
    const seen = new Set<string>()
    const sections: string[] = []

    for (const id of ids) {
        const template = GITIGNORE_TEMPLATES.find(t => t.id === id)
        if (!template) continue
        const newEntries = template.entries.filter(entry => !seen.has(entry))
        newEntries.forEach(entry => seen.add(entry))
        if (newEntries.length === 0) continue
        sections.push(`# ${template.label}\n${newEntries.join('\n')}`)
    }

    return sections.join('\n\n')
}
