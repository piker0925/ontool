<template>
  <GamePage description="블록을 그리드에 놓아 가로·세로 줄을 채워 없애보세요" game-id="game-block-blast" title="블록 블라스트">
    <template #default="{ submitScore, restart, onGameEnd }">
      <BlockBlastBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import BlockBlastBoard from './BlockBlastBoard.vue'
</script>
