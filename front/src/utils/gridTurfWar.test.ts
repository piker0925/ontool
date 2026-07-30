import {describe, expect, it} from 'vitest'
import {createGridTurfState, setPlayerDirection, startGridTurfGame, tickGridTurf, TURF_GRID_SIZE} from './gridTurfWar'

describe('Paper.io style gridTurfWar engine', () => {
    it('초기 상태 생성 시 ready 상태이고 30x30 격자 및 기지가 할당된다', () => {
        let state = createGridTurfState('ready')
        expect(state.status).toBe('ready')
        state = startGridTurfGame(state)
        expect(state.status).toBe('playing')
        expect(state.grid.length).toBe(TURF_GRID_SIZE)
        expect(state.grid[0].length).toBe(TURF_GRID_SIZE)
        expect(state.players.length).toBe(4)
        expect(state.players[0].score).toBe(9)
    })

    it('방향 전환 및 tick 실행 시 플레이어가 이동하고 꼬리를 그리며 땅을 루프하여 점유한다', () => {
        let state = createGridTurfState('playing')
        
        // P1 starts at (3,3) inside 3x3 home base (1,1)-(3,3)
        state = setPlayerDirection(state, 'p1', 'down')
        state = tickGridTurf(state, 120, () => 0.1) // moves to (3,4), draws trail
        expect(state.players[0].y).toBe(4)
        expect(state.players[0].trail.length).toBe(1)

        state = setPlayerDirection(state, 'p1', 'right')
        state = tickGridTurf(state, 120, () => 0.1) // moves to (4,4)
        expect(state.players[0].x).toBe(4)

        state = setPlayerDirection(state, 'p1', 'up')
        state = tickGridTurf(state, 120, () => 0.1) // moves to (4,3)
        state = tickGridTurf(state, 120, () => 0.1) // moves to (4,2)

        state = setPlayerDirection(state, 'p1', 'left')
        state = tickGridTurf(state, 120, () => 0.1) // moves to (3,2) (reconnects home -> capture!)
        
        expect(state.players[0].trail.length).toBe(0) // trail captured!
        expect(state.players[0].score).toBeGreaterThan(9) // territory expanded!
    })

    it('시간(timeLeftMs)이 종료되면 status가 over가 된다', () => {
        let state = createGridTurfState('playing')
        state = tickGridTurf(state, 50000, () => 0.1)
        expect(state.status).toBe('over')
        expect(state.timeLeftMs).toBe(0)
    })
})
