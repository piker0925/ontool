<template>
  <GamePage description="주사위 5개를 굴려 12가지 족보 조합을 맞춰 최고점을 겨루는 정통 요트 다이스 게임! 5인 동시 점수 대결 멀티 지원!" game-id="game-yacht-dice" title="요트 다이스">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 점수 대결" testid-prefix="yacht" :max-players="5"/>

      <YachtDiceBattleLobby v-if="mode === 'battle'" game-id="game-yacht-dice"/>
      <YachtDiceBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import YachtDiceBoard from './YachtDiceBoard.vue'
import YachtDiceBattleLobby from './YachtDiceBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
