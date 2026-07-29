<template>
  <GamePage description="신호가 뜨면 최대한 빨리 클릭하세요" game-id="game-reaction-time" title="반응속도 테스트">
    <template #default="{ submitScore, onGameEnd }">
      <div class="flex justify-center pt-4">
        <button
            class="text-sm text-muted-foreground underline"
            data-testid="battle-mode-toggle"
            @click="battleMode = !battleMode"
        >{{ battleMode ? '← 싱글로 돌아가기' : '5인 대결로 플레이 (베타)' }}
        </button>
      </div>
      <ReactionBattleLobby v-if="battleMode" game-id="game-reaction-time"/>
      <ReactionTimeBoard v-else :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import ReactionTimeBoard from './ReactionTimeBoard.vue'
import ReactionBattleLobby from './ReactionBattleLobby.vue'

// 193 파일럿 — 방 생성/입장/실시간 로비만 검증하는 단계라 라운드 동기화(GO 신호·판정)는 아직 없다.
const battleMode = ref(false)
</script>
