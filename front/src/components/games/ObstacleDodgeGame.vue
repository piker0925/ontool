<template>
  <GamePage description="탭이나 스페이스바로 점프해서 장애물을 피해보세요! 5인 동시 서바이벌 지원!" game-id="game-obstacle-dodge" title="장애물 피하기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <GameModeTab v-model="mode" battle-label="5인 서바이벌 회피" testid-prefix="obstacle" :max-players="5"/>

      <ObstacleDodgeBattleLobby v-if="mode === 'battle'" game-id="game-obstacle-dodge"/>
      <ObstacleDodgeBoard v-else :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import GamePage from '../GamePage.vue'
import GameModeTab from './GameModeTab.vue'
import ObstacleDodgeBoard from './ObstacleDodgeBoard.vue'
import ObstacleDodgeBattleLobby from './ObstacleDodgeBattleLobby.vue'

const mode = ref<'single' | 'battle'>('single')
</script>
