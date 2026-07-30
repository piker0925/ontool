<template>
  <GamePage description="장애물을 피하며 오래 생존하는 2D 픽셀 공룡 달리기 게임! 1개 트랙 5인 동시 질주 지원!" game-id="game-dino-run" title="구글 공룡 게임">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 동시 질주" testid-prefix="dino" :max-players="5"/>

      <DinoRunBattleLobby v-if="mode === 'battle'" game-id="game-dino-run"/>
      <DinoRunBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import DinoRunBoard from './DinoRunBoard.vue'
import DinoRunBattleLobby from './DinoRunBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
