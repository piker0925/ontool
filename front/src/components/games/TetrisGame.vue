<template>
  <GamePage description="블록을 맞춰 라인을 클리어하는 테트리스! 2줄 이상 클리어 시 상대에게 방해 블록이 전달됩니다." game-id="game-tetris" title="테트리스">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 격투 배틀" testid-prefix="tetris" :max-players="5"/>

      <TetrisBattleLobby v-if="mode === 'battle'" game-id="game-tetris"/>
      <TetrisBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import TetrisBoard from './TetrisBoard.vue'
import TetrisBattleLobby from './TetrisBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
