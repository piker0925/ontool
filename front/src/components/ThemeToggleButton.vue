<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
          :aria-label="themeLabel"
          :class="buttonClass"
          :title="themeLabel"
          class="flex shrink-0 items-center justify-center rounded-lg transition-colors overflow-hidden"
      >
        <div class="relative flex items-center justify-center size-[15px]">
          <Sun :class="preference === 'light' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'" class="absolute transition-all duration-300 size-[15px]"/>
          <Moon :class="preference === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'" class="absolute transition-all duration-300 size-[15px]"/>
          <MonitorSmartphone :class="preference === 'system' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'" class="absolute transition-all duration-300 size-[15px]"/>
        </div>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent :align="align" :side="side">
      <DropdownMenuRadioGroup :model-value="preference" @update:model-value="onThemeSelect">
        <DropdownMenuRadioItem value="light">
          <Sun class="size-[14px]"/>
          <span>라이트</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">
          <Moon class="size-[14px]"/>
          <span>다크</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">
          <MonitorSmartphone class="size-[14px]"/>
          <span>시스템</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {Moon, MonitorSmartphone, Sun} from 'lucide-vue-next'
import {useTheme, type ThemePreference} from '../composables/useTheme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

withDefaults(defineProps<{
  buttonClass?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}>(), {
  buttonClass: 'size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  side: 'bottom',
  align: 'end',
})

const {preference, setTheme} = useTheme()
const THEME_LABEL = {light: '라이트 테마', dark: '다크 테마', system: '시스템 테마'} as const
const themeLabel = computed(() => `테마: ${THEME_LABEL[preference.value]} (변경하려면 열기)`)

function onThemeSelect(next: unknown) {
  setTheme(next as ThemePreference)
}
</script>
