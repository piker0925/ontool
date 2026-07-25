<template>
  <GamePage description="움직이는 블록을 타이밍에 맞춰 탭해서 쌓아 올리세요" title="타워 쌓기">
    <template #default="{ submitScore }">
      <TowerStackBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import TowerStackBoard from './TowerStackBoard.vue'
</script>
