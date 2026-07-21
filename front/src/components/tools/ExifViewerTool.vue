<template>
  <div class="flex flex-col gap-3 max-w-lg mx-auto w-full">
    <input ref="fileInput" accept="image/*" class="hidden" type="file" @change="onFileChange"/>

    <button v-if="!fileName"
            class="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-[13px] text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            @click="fileInput?.click()">
      <ImageOff class="size-6 text-muted-foreground/60"/>
      이미지를 선택하세요
    </button>

    <template v-else>
      <div class="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <span class="truncate text-[13px] text-foreground">{{ fileName }}</span>
        <button class="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground/80 transition-colors hover:bg-accent"
                @click="fileInput?.click()">다시 선택
        </button>
      </div>

      <!-- 로딩 스켈레톤 -->
      <div v-if="loading" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div class="h-3 w-1/3 animate-pulse rounded bg-muted"/>
        <div class="h-3 w-2/3 animate-pulse rounded bg-muted"/>
        <div class="h-3 w-1/2 animate-pulse rounded bg-muted"/>
      </div>

      <!-- 에러 -->
      <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <AlertTriangle class="size-4 shrink-0 text-destructive/70"/>
        <p class="text-[12px] text-destructive/80">{{ error }}</p>
      </div>

      <template v-else-if="display">
        <!-- 메타데이터 없음 -->
        <div v-if="!display.hasData"
             class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-10 text-center">
          <ImageOff class="size-6 text-muted-foreground/50"/>
          <p class="text-[13px] font-medium text-foreground">메타데이터 없음</p>
          <p class="text-[11px] text-muted-foreground">이 이미지에는 EXIF 정보가 포함되어 있지 않습니다</p>
        </div>

        <template v-else>
          <!-- 민감 정보 배너 -->
          <div v-if="display.sensitiveFields.length > 0"
               class="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <ShieldAlert class="size-3.5 text-amber-600"/>
              <span class="text-[12px] font-semibold text-amber-700">민감할 수 있는 정보가 포함되어 있습니다</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="f in display.sensitiveFields" :key="f.key"
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{{ f.label }}</span>
            </div>
            <router-link class="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                         to="/tools/exif-remove">
              제거하려면 EXIF 제거 도구로
              <ArrowRight class="size-3"/>
            </router-link>
          </div>

          <!-- 카메라 정보 -->
          <div v-if="display.camera" class="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Camera class="size-3.5"/>
              카메라
            </div>
            <p class="text-[13px] text-foreground">
              {{ formatCameraLabel(display.camera.make, display.camera.model) }}
            </p>
            <p v-if="display.camera.serialNumber" class="text-[11px] text-muted-foreground">
              일련번호: <span class="font-mono">{{ display.camera.serialNumber }}</span>
            </p>
          </div>

          <!-- 촬영일시 -->
          <div v-if="display.captureDate" class="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Clock class="size-3.5"/>
              촬영일시
            </div>
            <p class="text-[13px] text-foreground">{{ display.captureDate }}</p>
          </div>

          <!-- GPS 위치 -->
          <div v-if="display.gps" class="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <MapPin class="size-3.5"/>
              GPS 위치
            </div>
            <p class="font-mono text-[13px] text-foreground">{{ display.gps.text }}</p>
          </div>

          <!-- 촬영 설정 -->
          <div v-if="display.settings" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Aperture class="size-3.5"/>
              촬영 설정
            </div>
            <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px]">
              <template v-if="display.settings.exposureTime">
                <span class="text-muted-foreground">노출시간</span>
                <span class="text-foreground">{{ display.settings.exposureTime }}</span>
              </template>
              <template v-if="display.settings.fNumber">
                <span class="text-muted-foreground">조리개</span>
                <span class="text-foreground">{{ display.settings.fNumber }}</span>
              </template>
              <template v-if="display.settings.iso !== undefined">
                <span class="text-muted-foreground">ISO</span>
                <span class="text-foreground">{{ display.settings.iso }}</span>
              </template>
              <template v-if="display.settings.focalLength">
                <span class="text-muted-foreground">초점거리</span>
                <span class="text-foreground">{{ display.settings.focalLength }}</span>
              </template>
            </div>
          </div>

          <!-- 크기/방향 -->
          <div v-if="display.dimensions || display.orientation"
               class="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Image class="size-3.5"/>
              이미지 정보
            </div>
            <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px]">
              <template v-if="display.dimensions">
                <span class="text-muted-foreground">크기</span>
                <span class="text-foreground">{{ display.dimensions.width }} × {{ display.dimensions.height }}</span>
              </template>
              <template v-if="display.orientation">
                <span class="text-muted-foreground">방향</span>
                <span class="text-foreground">{{ display.orientation }}</span>
              </template>
            </div>
          </div>
        </template>
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {AlertTriangle, Aperture, ArrowRight, Camera, Clock, Image, ImageOff, MapPin, ShieldAlert} from 'lucide-vue-next'
import {formatCameraLabel, mapExifToDisplay, type ExifDisplayData} from '../../utils/exifView'

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const loading = ref(false)
const error = ref('')
const display = ref<ExifDisplayData | null>(null)

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  error.value = ''
  display.value = null

  if (!file.type.startsWith('image/')) {
    error.value = '이미지 파일이 아닙니다. 이미지를 선택해주세요.'
    input.value = ''
    return
  }

  loading.value = true
  try {
    const {parse} = await import('exifr')
    const raw = await parse(file, true)
    display.value = mapExifToDisplay(raw ?? undefined)
  } catch {
    error.value = '메타데이터를 읽는 중 문제가 발생했습니다. 손상되었거나 지원하지 않는 이미지 형식일 수 있습니다.'
  } finally {
    loading.value = false
    input.value = ''
  }
}
</script>
