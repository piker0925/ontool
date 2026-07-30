<template>
  <GamePage description="코드/CS 용어가 떨어지기 전에 입력해서 맞히는 타이핑 게임" game-id="game-code-rain-typing" title="코드 낙하 타이핑">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 뺏어치기" testid-prefix="code-rain" :max-players="5"/>

      <CodeRainBattleLobby v-if="mode === 'battle'" game-id="game-code-rain-typing"/>
      <CodeRainTypingBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import CodeRainTypingBoard from './CodeRainTypingBoard.vue'
import CodeRainBattleLobby from './CodeRainBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
