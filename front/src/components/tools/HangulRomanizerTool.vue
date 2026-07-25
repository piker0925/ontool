<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <div class="flex gap-2">
      <label class="flex flex-1 flex-col gap-1.5 text-[13px]">
        성
        <input v-model="surname" class="rounded-md border border-input bg-background px-3 py-2" placeholder="홍" type="text"/>
      </label>
      <label class="flex flex-1 flex-col gap-1.5 text-[13px]">
        이름
        <input v-model="givenName" class="rounded-md border border-input bg-background px-3 py-2" placeholder="빛나" type="text"/>
      </label>
    </div>

    <label class="flex flex-col gap-1.5 text-[13px]">
      이름 표기 방식
      <select v-model="style" class="rounded-md border border-input bg-background px-3 py-2 text-[13px]">
        <option value="concat">붙여쓰기 (Bitna) — 원칙</option>
        <option value="hyphen">붙임표 (Bit-na) — 허용</option>
        <option value="capitalize-each">음절별 대문자 (BitNa) — 관용 표기</option>
      </select>
    </label>

    <div v-if="result.full" class="flex items-center justify-between gap-2 rounded-lg border border-zone-accent-life/20 bg-zone-accent-life/10 px-4 py-4">
      <span class="font-mono text-xl font-semibold text-zone-accent-life">{{ result.full }}</span>
      <button aria-label="결과 복사"
              :class="copied ? 'text-emerald-500' : 'text-muted-foreground/60 hover:text-foreground'"
              class="rounded p-0.5 transition-colors"
              @click="copyResult">
        <Check v-if="copied" class="size-4"/>
        <Copy v-else class="size-4"/>
      </button>
    </div>

    <p class="text-[11px] text-muted-foreground">국립국어원 로마자 표기법(2000) 기준입니다. 이름에서 일어나는 음운 변화(예: 한복남→[한봉남])는 표기에 반영하지 않습니다 — 인명 표기의 공식 예외 규정입니다.</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Check, Copy} from 'lucide-vue-next'
import {type NameStyle, romanizeName} from '../../utils/hangulRomanize'

const surname = ref('')
const givenName = ref('')
const style = ref<NameStyle>('concat')
const copied = ref(false)

const result = computed(() => romanizeName({surname: surname.value, givenName: givenName.value}, style.value))

async function copyResult() {
  if (!result.value.full) return
  await navigator.clipboard.writeText(result.value.full)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>
