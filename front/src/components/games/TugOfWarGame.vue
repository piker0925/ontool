<template>
  <GamePage description="10초간 스페이스바와 마우스를 폭풍 연타하여 5인 참가자 중 최고 CPS 연타왕에 도전하세요!" game-id="game-tug-of-war" title="10초 연타 배틀">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 동시 연타" testid-prefix="tug" :max-players="5"/>

      <TugOfWarBattleLobby v-if="mode === 'battle'" game-id="game-tug-of-war"/>
      <TugOfWarBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import TugOfWarBoard from './TugOfWarBoard.vue'
import TugOfWarBattleLobby from './TugOfWarBattleLobby.vue'

const mode = ref<'single' | 'battle'>('battle')
</script>
