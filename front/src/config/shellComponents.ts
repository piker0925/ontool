import type {Component} from 'vue'

// mock.ts에는 두지 않는다: vite.config.ts → build/sitemap.ts가 mock.ts를 Node 컨텍스트로
// 번들링하는데, 여기 있는 .vue 동적 import를 만나면 파싱에 실패한다. component 로더는
// 브라우저 전용 소비처(api/modules.ts)에서만 병합한다.
//
// "게임"이 아니라 "ToolPage의 기본 헤더·즐겨찾기·좋아요 UI를 건너뛰고 GamePage 셸을 통째로
// 쓰는 모듈"의 컴포넌트 로더다 — 뽀모도로처럼 게임이 아닌 모듈도 이 계약이 필요하면 여기 둔다
// (ToolPage.vue의 modComponent 분기, ADR-0026: kind는 렌더 결정권이 없다).
export const FULL_SHELL_COMPONENTS: Record<string, () => Promise<Component>> = {
    'game-reaction-time': () => import('../components/games/ReactionTimeGame.vue').then(m => m.default),
    'game-2048': () => import('../components/games/Game2048.vue').then(m => m.default),
    'game-minesweeper': () => import('../components/games/MinesweeperGame.vue').then(m => m.default),
    'game-memory-cards': () => import('../components/games/MemoryCardsGame.vue').then(m => m.default),
    'game-snake': () => import('../components/games/SnakeGame.vue').then(m => m.default),
    'game-baseball': () => import('../components/games/NumberBaseballGame.vue').then(m => m.default),
    'game-sliding-puzzle': () => import('../components/games/SlidingPuzzleGame.vue').then(m => m.default),
    'game-whack-a-mole': () => import('../components/games/WhackAMoleGame.vue').then(m => m.default),
    'game-tower-stack': () => import('../components/games/TowerStackGame.vue').then(m => m.default),
    'game-match3': () => import('../components/games/Match3Game.vue').then(m => m.default),
    'game-water-sort': () => import('../components/games/WaterSortGame.vue').then(m => m.default),
    'game-code-rain-typing': () => import('../components/games/CodeRainTypingGame.vue').then(m => m.default),
    'game-tetris': () => import('../components/games/TetrisGame.vue').then(m => m.default),
    'game-omok': () => import('../components/games/OmokGame.vue').then(m => m.default),
    'game-suika-merge': () => import('../components/games/SuikaMergeGame.vue').then(m => m.default),
    'game-dino-run': () => import('../components/games/DinoRunGame.vue').then(m => m.default),
    'game-flappy-bird': () => import('../components/games/FlappyBirdGame.vue').then(m => m.default),
    'game-crossy-road': () => import('../components/games/CrossyRoadGame.vue').then(m => m.default),
    'game-yacht-dice': () => import('../components/games/YachtDiceGame.vue').then(m => m.default),
    'game-tug-of-war': () => import('../components/games/TugOfWarGame.vue').then(m => m.default),
    'game-grid-turf-war': () => import('../components/games/GridTurfWarGame.vue').then(m => m.default),
    'pinball-lottery': () => import('../components/PinballLotteryPage.vue').then(m => m.default),
    'pomodoro': () => import('../components/PomodoroGame.vue').then(m => m.default),
}
