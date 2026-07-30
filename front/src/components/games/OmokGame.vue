<template>
  <GamePage description="15x15 바둑판에서 먼저 5개의 돌을 연속으로 놓는 사람이 승리하는 오목 게임!" game-id="game-omok" title="오목">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="1v1 턴제 대결" testid-prefix="omok" :max-players="2"/>

      <OmokBattleLobby v-if="mode === 'battle'" game-id="game-omok"/>
      <OmokBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import OmokBoard from './OmokBoard.vue'
import OmokBattleLobby from './OmokBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
