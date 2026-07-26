<template>
  <GamePage description="제한 시간 안에 나타나는 두더지를 최대한 많이 클릭/탭하세요" game-id="game-whack-a-mole" title="두더지잡기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <WhackAMoleBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import WhackAMoleBoard from './WhackAMoleBoard.vue'
</script>
