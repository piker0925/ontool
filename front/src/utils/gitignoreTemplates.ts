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
    {
        id: 'gradle',
        label: 'Gradle',
        entries: [
            '.gradle',
            '**/build/',
            '!**/src/**/build/',
            'gradle-app.setting',
            '!gradle-wrapper.jar',
            '!gradle-wrapper.properties',
            '.gradletasknamecache',
            '.project',
            '.classpath',
        ],
    },
    {
        id: 'vite',
        label: 'Vue.js / Vite',
        entries: [
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
        ],
    },
    {
        id: 'react',
        label: 'React / Next.js',
        entries: [
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
        ],
    },
    {
        id: 'go',
        label: 'Go',
        entries: [
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
        ],
    },
    {
        id: 'rust',
        label: 'Rust',
        entries: [
            'debug',
            'target',
            '**/*.rs.bk',
            '*.pdb',
            '**/mutants.out*/',
            'rustc-ice-*.txt',
        ],
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
