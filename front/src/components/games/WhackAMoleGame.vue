<template>
  <GamePage description="제한 시간 안에 나타나는 두더지를 최대한 많이 클릭/탭하세요" game-id="game-whack-a-mole" title="두더지잡기">
    <template #default="{ submitScore }">
      <WhackAMoleBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import WhackAMoleBoard from './WhackAMoleBoard.vue'
</script>
