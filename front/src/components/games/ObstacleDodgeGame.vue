<template>
  <GamePage description="탭이나 스페이스바로 점프해서 장애물을 피해보세요" title="장애물 피하기">
    <template #default="{ submitScore }">
      <ObstacleDodgeBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import ObstacleDodgeBoard from './ObstacleDodgeBoard.vue'
</script>
