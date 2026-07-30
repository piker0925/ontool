<template>
  <GamePage description="파이프 사이를 아슬아슬하게 통과하는 2D 새 비행 게임! 5인 동시 비행 멀티 대결 지원!" game-id="game-flappy-bird" title="플래비 버드">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 동시 비행" testid-prefix="flappy" :max-players="5"/>

      <FlappyBirdBattleLobby v-if="mode === 'battle'" game-id="game-flappy-bird"/>
      <FlappyBirdBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import FlappyBirdBoard from './FlappyBirdBoard.vue'
import FlappyBirdBattleLobby from './FlappyBirdBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
