<template>
  <GamePage description="2D 격자 판에서 영토를 넓히고 상대 땅을 뺏는 땅따먹기 게임!" game-id="game-grid-turf-war" title="땅따먹기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 영토전 배틀" testid-prefix="turf" :max-players="5" :disabled-battle="true" disabled-tooltip="🚧 땅따먹기 멀티 배틀은 준비 중입니다."/>

      <GridTurfWarBattleLobby v-if="mode === 'battle'" game-id="game-grid-turf-war"/>
      <GridTurfWarBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import GridTurfWarBoard from './GridTurfWarBoard.vue'
import GridTurfWarBattleLobby from './GridTurfWarBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
