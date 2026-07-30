<template>
  <GamePage description="컴퓨터 또는 상대방과 스트라이크·볼 힌트로 정답을 먼저 추리하세요" game-id="game-baseball" title="숫자야구">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="1v1 턴제 대결" testid-prefix="baseball" :max-players="2"/>

      <NumberBaseballBattleLobby v-if="mode === 'battle'" game-id="game-baseball"/>
      <NumberBaseballBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import NumberBaseballBoard from './NumberBaseballBoard.vue'
import NumberBaseballBattleLobby from './NumberBaseballBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
