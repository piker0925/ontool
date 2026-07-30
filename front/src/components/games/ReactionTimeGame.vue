<template>
  <GamePage description="신호가 뜨면 최대한 빨리 클릭하세요" game-id="game-reaction-time" title="반응속도 테스트">
    <template #default="{ submitScore, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 반응속도 배틀" testid-prefix="battle" :max-players="5"/>

      <ReactionBattleLobby v-if="mode === 'battle'" game-id="game-reaction-time"/>
      <ReactionTimeBoard v-else :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import ReactionTimeBoard from './ReactionTimeBoard.vue'
import ReactionBattleLobby from './ReactionBattleLobby.vue'

// 193 파일럿 — 방 생성/입장/실시간 로비만 검증하는 단계라 라운드 동기화(GO 신호·판정)는 아직 없다.
const mode = ref<'single' | 'battle'>('single')
</script>
