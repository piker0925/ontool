<template>
  <GamePage description="클릭으로 코인을 모으고 업그레이드로 자동 수익을 늘려보세요" title="방치형 클리커">
    <template #default>
      <IdleClickerBoard/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import IdleClickerBoard from './IdleClickerBoard.vue'
</script>
