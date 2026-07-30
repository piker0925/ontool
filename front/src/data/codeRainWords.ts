// Dev Code Rain Typing 단어 팩. game-plan.md 초안의 "팩당 80개·400단어"는 검증 안 된 숫자라
// 그대로 따르지 않고 팩당 30개 안팎으로 시작한다(198).
export interface CodeRainWordPack {
    id: string
    label: string
    words: string[]
}

export const CODE_RAIN_WORD_PACKS: CodeRainWordPack[] = [
    {
        id: 'short-dev',
        label: '스피드 개발 용어 (3~4자)',
        words: [
            'git', 'pr', 'push', 'pull', 'diff', 'merge', 'branch', 'commit', 'fetch', 'clone',
            'fork', 'tag', 'stash', 'tree', 'head', 'main', 'patch', 'ci', 'cd', 'yaml', 'cron',
            'log', 'env', 'build', 'deploy', 'sudo', 'bash', 'zsh', 'cd', 'ls', 'rm', 'mv',
            'cp', 'cat', 'grep', 'awk', 'sed', 'nano', 'vim', 'vi', 'kill', 'top', 'ps',
            'df', 'du', 'curl', 'wget', 'ping', 'ssh', 'scp', 'pipe', 'path', 'root', 'user',
            'db', 'sql', 'row', 'col', 'key', 'index', 'join', 'view', 'drop', 'alter',
            'insert', 'select', 'where', 'from', 'crud', 'redis', 'mongo', 'json', 'csv', 'blob',
            'dump', 'acid', 'orm', 'table', 'query', 'api', 'rest', 'http', 'cors', 'jwt',
            'auth', 'token', 'cookie', 'body', 'param', 'url', 'uri', 'dom', 'css', 'html',
            'js', 'ts', 'npm', 'yarn', 'bun', 'vite', 'cpu', 'ram', 'gpu', 'bus', 'bit',
            'byte', 'bug', 'fix', 'port', 'ip', 'dns', 'cache', 'stack', 'heap', 'node', 'lock',
        ],
    },
    {
        id: 'java',
        label: 'Java',
        words: [
            'class', 'static', 'final', 'public', 'void', 'return', 'try', 'catch', 'new', 'this',
            'super', 'null', 'enum', 'record', 'sealed', 'switch', 'byte', 'int', 'long', 'short',
            'float', 'double', 'char', 'list', 'set', 'map', 'get', 'put', 'add', 'size',
        ],
    },
    {
        id: 'spring',
        label: 'Spring',
        words: [
            'bean', 'autowired', 'service', 'controller', 'entity', 'query', 'profile', 'value',
            'patch', 'post', 'get', 'put', 'delete', 'model', 'dto', 'repo', 'scope', 'boot',
        ],
    },
    {
        id: 'kotlin',
        label: 'Kotlin',
        words: [
            'fun', 'val', 'var', 'data', 'object', 'when', 'lazy', 'scope', 'apply', 'let',
            'also', 'run', 'with', 'pair', 'triple', 'list', 'map', 'set', 'flow', 'task',
        ],
    },
    {
        id: 'javascript',
        label: 'JavaScript',
        words: [
            'function', 'const', 'let', 'var', 'async', 'await', 'this', 'null', 'typeof', 'export',
            'import', 'yield', 'proxy', 'event', 'loop', 'node', 'fetch', 'dom', 'arr', 'obj',
        ],
    },
    {
        id: 'cs',
        label: 'CS 지식',
        words: [
            'heap', 'stack', 'queue', 'graph', 'tree', 'array', 'mutex', 'thread', 'cache', 'index',
            'node', 'port', 'host', 'ipv4', 'ipv6', 'tcp', 'udp', 'dns', 'http', 'mac', 'b-tree',
        ],
    },
]

export function findCodeRainWordPack(id: string): CodeRainWordPack {
    return CODE_RAIN_WORD_PACKS.find(pack => pack.id === id) ?? CODE_RAIN_WORD_PACKS[0]
}

