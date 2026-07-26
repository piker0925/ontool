<template>
  <div class="flex flex-col gap-5 max-w-4xl mx-auto w-full">
    <div class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zone-accent-fun/10 text-zone-accent-fun">
        <Sparkles class="size-4.5"/>
      </div>
      <div class="flex flex-col gap-0.5">
        <h2 class="text-[14px] font-semibold text-foreground">MBTI 매칭 카드</h2>
        <p class="text-[12px] text-muted-foreground">16가지 유형에 어울리는 동물·음식·색깔·직업을 카드로 확인해보세요.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="card in MBTI_MATCH_CARDS" :key="card.type"
           class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                :style="{ backgroundColor: card.colorHex }">{{ card.type.slice(0, 2) }}</span>
          <div class="flex flex-col">
            <span class="font-mono text-[13px] font-bold text-foreground">{{ card.type }}</span>
            <span class="text-[11px] text-muted-foreground">{{ card.nickname }}</span>
          </div>
        </div>

        <p class="rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] italic leading-snug text-foreground/80">"{{ card.quote }}"</p>

        <dl class="flex flex-col gap-1.5 text-[12px]">
          <div class="flex items-start gap-1.5">
            <dt class="flex w-14 shrink-0 items-center gap-1 text-muted-foreground"><PawPrint class="size-3"/>동물</dt>
            <dd class="flex-1 text-foreground">
              <span class="font-medium">{{ card.animal }}</span>
              <span class="block text-[11px] text-muted-foreground">{{ card.animalReason }}</span>
            </dd>
          </div>
          <div class="flex items-center gap-1.5">
            <dt class="flex w-14 shrink-0 items-center gap-1 text-muted-foreground"><UtensilsCrossed class="size-3"/>음식</dt>
            <dd class="text-foreground">{{ card.food }}</dd>
          </div>
          <div class="flex items-center gap-1.5">
            <dt class="flex w-14 shrink-0 items-center gap-1 text-muted-foreground"><Palette class="size-3"/>색깔</dt>
            <dd class="flex items-center gap-1.5 text-foreground">
              <span class="inline-block size-2.5 rounded-full" :style="{ backgroundColor: card.colorHex }"/>
              {{ card.color }}
            </dd>
          </div>
          <div class="flex items-center gap-1.5">
            <dt class="flex w-14 shrink-0 items-center gap-1 text-muted-foreground"><Briefcase class="size-3"/>직업</dt>
            <dd class="text-foreground">{{ card.job }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {Briefcase, Palette, PawPrint, Sparkles, UtensilsCrossed} from 'lucide-vue-next'
import {MBTI_MATCH_CARDS} from '../../data/mbtiMatchCards'
</script>
