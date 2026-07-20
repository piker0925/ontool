import type {Component} from 'vue'

// mock.ts에는 두지 않는다: vite.config.ts → build/sitemap.ts가 mock.ts를 Node 컨텍스트로
// 번들링하는데, 여기 있는 .vue 동적 import를 만나면 파싱에 실패한다. component 로더는
// 브라우저 전용 소비처(api/modules.ts)에서만 병합한다.
export const GAME_COMPONENTS: Record<string, () => Promise<Component>> = {
    'game-reaction-time': () => import('../components/games/ReactionTimeGame.vue').then(m => m.default),
    'game-2048': () => import('../components/games/Game2048.vue').then(m => m.default),
    'game-minesweeper': () => import('../components/games/MinesweeperGame.vue').then(m => m.default),
    'game-memory-cards': () => import('../components/games/MemoryCardsGame.vue').then(m => m.default),
    'game-snake': () => import('../components/games/SnakeGame.vue').then(m => m.default),
    'game-simon': () => import('../components/games/SimonGame.vue').then(m => m.default),
    'game-baseball': () => import('../components/games/NumberBaseballGame.vue').then(m => m.default),
    'game-tictactoe': () => import('../components/games/TicTacToeGame.vue').then(m => m.default),
    'pomodoro': () => import('../components/games/PomodoroGame.vue').then(m => m.default),
}
