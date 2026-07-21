<template>
  <div v-if="loading" class="flex items-center gap-2 p-6 text-sm text-muted-foreground">
    <Loader2 class="size-4 animate-spin"/>
    불러오는 중...
  </div>

  <div v-else-if="!mod" class="p-6 text-sm text-muted-foreground">모듈을 찾을 수 없습니다.</div>

  <template v-else>

    <!-- component 지정 모듈(게임 등): 자체 셸(GamePage 등)이 있으므로 기본 도구 헤더/레이아웃을 건너뛴다 (ADR-0026) -->
    <div v-if="modComponent" class="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6">
      <component :is="modComponent"/>
    </div>

    <div v-else class="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6">

      <!-- Title -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 pb-4 pt-6">
        <h1 class="text-lg font-semibold tracking-tight text-foreground">{{ mod.name }}</h1>
        <span
            v-if="mod.isHeavy"
            class="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
        >파일 처리</span>
        <p v-if="mod.description" class="text-[13px] text-muted-foreground">{{ mod.description }}</p>
        <div class="ml-auto flex items-center gap-3 text-[12px] text-muted-foreground">
          <span class="flex items-center gap-1.5">
            <BarChart2 class="size-3.5"/>
            사용 <span class="font-mono">{{ stats?.useCount ?? 0 }}</span>회
          </span>
          <button
              :class="isFav ? 'border-amber-300 text-amber-500 bg-amber-500/10' : 'border-border hover:border-amber-300 hover:text-amber-500 hover:bg-amber-500/5'"
              :title="isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'"
              class="flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[12px] transition-colors"
              @click="toggleFav"
          >
            <Star :class="isFav ? 'fill-amber-500 text-amber-500' : ''" class="size-3.5"/>
            즐겨찾기
          </button>
          <button
              :class="liked ? 'border-rose-300 text-rose-500' : 'border-border hover:border-rose-300 hover:text-rose-500'"
              :disabled="likePending"
              :title="liked ? '좋아요 취소' : '좋아요'"
              class="flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[12px] transition-colors disabled:opacity-60"
              @click="toggleLike"
          >
            <Heart :class="liked ? 'fill-rose-500 text-rose-500' : ''" class="size-3.5"/>
            {{ stats?.likeCount ?? 0 }}
          </button>
        </div>
      </div>

      <!-- Frontend-only (단일 컴포넌트 도구 / 통합 페이지 도구 모두 registry에서 조회) -->
      <div v-if="mod.isFrontendOnly" :class="frontendToolLayoutClass">
        <component :is="frontendToolComponent" v-if="frontendToolComponent"/>
      </div>

      <!-- Heavy -->
      <div
          v-else-if="mod.isHeavy"
          class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
      >
        <!-- Left: Params + Upload -->
        <div class="flex flex-col overflow-hidden">
          <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
            <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">파일 업로드</span>
            <button
                v-if="jobId || batchId || result"
                class="ml-auto rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                @click="resetAll"
            >
              <X class="size-3.5"/>
            </button>
          </div>

          <!-- Heavy params (있을 때만) -->
          <div v-if="heavyConfig?.params.length" class="flex shrink-0 flex-col gap-3 border-b border-border p-4">
            <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">파라미터</span>

            <!-- image-resize 전용: 크기 단위/입력/락 아이콘/프리셋/실시간 미리보기 -->
            <div v-if="mod?.id === 'image-resize'" class="flex flex-col gap-2" data-testid="resize-size-block">
              <label class="text-[11px] text-muted-foreground">크기 단위</label>
              <select
                  v-model="heavyFormValues.unit"
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  data-testid="resize-unit"
              >
                <option value="px">px</option>
                <option value="%">%</option>
              </select>

              <div v-if="heavyFormValues.unit === '%'" class="flex items-center gap-2">
                <input
                    v-if="heavyFormValues.keepAspectRatio === 'true'"
                    v-model="heavyFormValues.width"
                    class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                    data-testid="resize-percent-linked"
                    placeholder="100"
                    type="number"
                    @input="onResizePercentLinkedInput"
                />
                <template v-else>
                  <input
                      v-model="heavyFormValues.width"
                      class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      data-testid="resize-width-percent"
                      placeholder="100"
                      type="number"
                      @input="onResizePercentInput"
                  />
                  <span class="shrink-0 font-mono text-[11px] text-muted-foreground">%</span>
                  <input
                      v-model="heavyFormValues.height"
                      class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      data-testid="resize-height-percent"
                      placeholder="100"
                      type="number"
                      @input="onResizePercentInput"
                  />
                  <span class="shrink-0 font-mono text-[11px] text-muted-foreground">%</span>
                </template>
                <button
                    class="shrink-0 rounded p-1.5 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                    data-testid="resize-aspect-lock"
                    :title="heavyFormValues.keepAspectRatio === 'true' ? '종횡비 고정됨 (클릭하면 해제)' : '종횡비 자유 (클릭하면 고정)'"
                    type="button"
                    @click="toggleAspectLock"
                >
                  <Lock v-if="heavyFormValues.keepAspectRatio === 'true'" class="size-4"/>
                  <LockOpen v-else class="size-4"/>
                </button>
              </div>

              <template v-else>
                <select
                    v-model="selectedResizePreset"
                    class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                    data-testid="resize-preset"
                    @change="applyResizePreset"
                >
                  <option value="">프리셋 (직접 입력)</option>
                  <option v-for="preset in resizePresetOptions" :key="preset.label" :disabled="preset.disabled" :value="preset.label">
                    {{ preset.label }}{{ preset.disabled ? ' — 원본보다 커서 비활성화' : '' }}
                  </option>
                </select>
                <div class="flex items-center gap-2">
                  <input
                      v-model="heavyFormValues.width"
                      class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      data-testid="resize-width-px"
                      placeholder="800"
                      type="number"
                      @input="onResizeWidthInput"
                  />
                  <span class="shrink-0 font-mono text-[11px] text-muted-foreground">x</span>
                  <input
                      v-model="heavyFormValues.height"
                      class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                      data-testid="resize-height-px"
                      placeholder="600"
                      type="number"
                      @input="onResizeHeightInput"
                  />
                  <button
                      class="shrink-0 rounded p-1.5 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                      data-testid="resize-aspect-lock"
                      :title="heavyFormValues.keepAspectRatio === 'true' ? '종횡비 고정됨 (클릭하면 해제)' : '종횡비 자유 (클릭하면 고정)'"
                      type="button"
                      @click="toggleAspectLock"
                  >
                    <Lock v-if="heavyFormValues.keepAspectRatio === 'true'" class="size-4"/>
                    <LockOpen v-else class="size-4"/>
                  </button>
                </div>
              </template>

              <p
                  v-if="resizePreviewInfo"
                  class="rounded-md bg-muted/50 px-2.5 py-1.5 text-[12px] font-medium text-foreground/80"
                  data-testid="resize-preview"
              >{{ resizePreviewInfo.text }}</p>
            </div>

            <div v-for="p in visibleHeavyParams" :key="p.key" class="flex flex-col gap-1">
              <label v-if="p.type !== 'checkbox'" class="text-[11px] text-muted-foreground">{{ p.label }}</label>
              <span v-if="p.type !== 'checkbox' && p.help" class="-mt-1 text-[11px] font-normal text-muted-foreground/60">— {{ p.help }}</span>
              <input
                  v-if="p.type === 'text'"
                  v-model="heavyFormValues[p.key]"
                  :placeholder="p.placeholder ?? ''"
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  type="text"
              />
              <div v-else-if="p.type === 'number'" class="flex items-center gap-2">
                <input
                    v-model="heavyFormValues[p.key]"
                    :placeholder="p.placeholder ?? ''"
                    class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                    type="number"
                />
                <span v-if="p.unit" class="shrink-0 font-mono text-[11px] text-muted-foreground">{{ p.unit }}</span>
              </div>
              <label v-else-if="p.type === 'checkbox'" class="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
                <input
                    :checked="heavyFormValues[p.key] === 'true'"
                    class="accent-primary"
                    type="checkbox"
                    @change="heavyFormValues[p.key] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
                />
                {{ p.label }}
                <span v-if="p.help" class="text-[11px] text-muted-foreground/60">— {{ p.help }}</span>
              </label>
              <select
                  v-else-if="p.type === 'select'"
                  v-model="heavyFormValues[p.key]"
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option v-for="opt in p.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input
                  v-else-if="p.type === 'color'"
                  v-model="heavyFormValues[p.key]"
                  class="h-8 w-16 rounded-md border border-input bg-background p-0.5"
                  type="color"
              />
            </div>
          </div>

          <!-- 텍스트 직접 입력 (json-schema-to-dto, openapi-to-code) -->
          <div v-if="heavyConfig?.textInput" class="flex flex-col border-b border-border">
            <div class="flex h-9 shrink-0 items-center justify-between border-b border-border px-4">
              <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{
                  heavyConfig.textInput.label
                }}</span>
            </div>
            <p v-if="heavyConfig.textInput.help" class="px-4 pt-2 text-[11px] text-muted-foreground/60">
              — {{ heavyConfig.textInput.help }}
            </p>
            <textarea
                v-model="heavyTextContent"
                :placeholder="heavyConfig.textInput.placeholder"
                class="h-56 resize-none bg-muted/40 p-3 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            <div class="flex items-center gap-2 px-4 py-2">
              <Button :disabled="!heavyTextContent.trim()" class="h-7 text-[12px]" @click="uploadTextAsFile">
                텍스트로 생성
              </Button>
              <span class="text-[11px] text-muted-foreground">또는 아래에서 파일 업로드</span>
            </div>
          </div>

          <div class="flex flex-1 flex-col overflow-auto p-6">
            <FileUploader
                :accept="heavyConfig?.fileAccept"
                :moduleId="mod.id"
                :multiple="heavyConfig?.fileMultiple ?? true"
                :params="heavyFormValues"
                :reorderable="heavyConfig?.reorderable ?? false"
                @dimensions="onFileDimensions"
                @error="onUploadError"
                @uploaded="onUploaded"
            />
          </div>
        </div>

        <!-- Right: Result -->
        <div class="flex flex-col">
          <div class="flex h-10 shrink-0 items-center border-b border-border px-4">
            <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">결과</span>
          </div>

          <!-- 단건 파일 결과: 패널을 채우고 하단 고정 액션 바(FileResultPanel) -->
          <FileResultPanel
              v-if="result && !batchId && result.url"
              class="min-h-0 flex-1"
              :url="result.url"
              :advisory="result.text"
          />

          <!-- 그 외 상태(배치·오류·대기·처리중·텍스트 결과)는 중앙 정렬 -->
          <div v-else class="flex flex-1 items-center justify-center p-6">
            <!-- 배치: 여러 파일을 각각 처리 후 ZIP -->
            <div v-if="batchId" class="flex w-full flex-col items-center gap-4 text-center">
              <BatchPoller
                  v-if="!batchComplete && !batchFailed"
                  :batchId="batchId"
                  @done="onBatchDone"
                  @error="onBatchError"
                  @progress="onBatchProgress"
                  @retrying="onBatchRetrying"
              />
              <!-- 배치 폴링 반복 실패 (042): 무한 대기로 방치하지 않고 명확히 실패 안내 -->
              <template v-if="batchFailed">
                <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
                  <AlertTriangle class="size-5 text-destructive/70"/>
                </div>
                <p class="max-w-xs text-[13px] font-medium text-destructive">상태를 확인할 수 없습니다 — 새로고침해 주세요</p>
              </template>
              <template v-else-if="!batchComplete">
                <Loader2 class="size-8 animate-spin text-primary/60"/>
                <!-- 폴링 재시도 중 (042): 진행률이 멈춘 채 방치되지 않도록 명시적으로 알림 -->
                <p v-if="batchReconnecting" class="text-[12px] text-amber-600">연결이 끊겼습니다 · 재연결 중...</p>
                <p class="text-[13px] text-muted-foreground">
                  일괄 처리 중… {{ batchProgress?.doneCount ?? 0 }} / {{ batchProgress?.totalCount ?? 0 }}
                  <span v-if="batchProgress?.failCount" class="text-destructive">(실패 {{
                      batchProgress.failCount
                    }})</span>
                </p>
              </template>
              <template v-else>
                <p class="text-[13px] text-foreground">
                  완료 {{ batchProgress?.doneCount ?? 0 }} / {{ batchProgress?.totalCount ?? 0 }}
                  <span v-if="batchProgress?.failCount" class="text-destructive">(실패 {{
                      batchProgress.failCount
                    }})</span>
                </p>
                <a
                    :href="batchResultUrl"
                    class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    data-testid="batch-download"
                    download
                >ZIP 다운로드</a>
              </template>
            </div>

            <div v-else-if="runError && !jobId && !result" class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
                <AlertTriangle class="size-5 text-destructive/70"/>
              </div>
              <p class="max-w-xs text-[13px] font-medium text-destructive">{{ runError }}</p>
            </div>
            <div v-else-if="!jobId && !result" class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
                <ArrowRight class="size-5 text-muted-foreground/50"/>
              </div>
              <p class="text-[12px] text-muted-foreground">파일을 업로드하면 처리가 시작됩니다</p>
            </div>
            <!-- SSE 재연결 반복 실패 (042): 무한 스피너로 방치하지 않고 명확히 실패 안내 -->
            <div v-else-if="!result && sseFailed" class="flex flex-col items-center gap-3 text-center">
              <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-destructive/40">
                <AlertTriangle class="size-5 text-destructive/70"/>
              </div>
              <p class="max-w-xs text-[13px] font-medium text-destructive">상태를 확인할 수 없습니다 — 새로고침해 주세요</p>
            </div>
            <div v-else-if="!result" class="flex w-full max-w-sm flex-col items-center gap-4">
              <Loader2 class="size-8 animate-spin text-primary/60"/>
              <!-- 연결 끊김 상태 (042): 진행률이 멈춘 채 방치되지 않도록 명시적으로 알림 -->
              <p v-if="sseReconnecting" class="text-[12px] text-amber-600">연결이 끊겼습니다 · 재연결 중...</p>
              <!-- 대기 중: 큐 순번 안내 (ADR-0019 진행 가시화) -->
              <p v-if="jobProgress && jobProgress.queuePosition > 0" class="text-[13px] text-muted-foreground">
                대기 중… 앞에 {{ jobProgress.queuePosition }}개
              </p>
              <!-- 처리 중: 진행률 바 + ETA -->
              <template v-else-if="jobProgress && jobProgress.progress > 0">
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                      :style="{width: jobProgress.progress + '%'}"
                      class="h-full rounded-full bg-primary transition-all"
                  ></div>
                </div>
                <p class="text-[13px] text-muted-foreground">
                  처리 중… {{ jobProgress.progress }}%
                  <span v-if="jobProgress.etaSeconds != null"> · 약 {{ formatEta(jobProgress.etaSeconds) }} 남음</span>
                </p>
              </template>
              <p v-else class="text-[13px] text-muted-foreground">처리 중입니다...</p>
            </div>
            <div v-else class="flex w-full flex-col gap-4">
              <ResultViewer :text="result.text"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Light -->
      <div
          v-else
          class="grid min-h-[420px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-2 lg:divide-x lg:divide-y-0"
      >
        <!-- Input -->
        <div class="flex flex-col">
          <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
            <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">입력</span>
            <div class="flex items-center gap-1">
              <button
                  v-if="moduleConfig?.sample"
                  class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
                  @click="applySample"
              >
                <Wand2 class="size-3"/>
                예시
              </button>
              <button
                  v-if="hasInput"
                  class="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                  @click="resetLight"
              >
                <X class="size-3.5"/>
              </button>
            </div>
          </div>

          <!-- CONFIGS 기반 입력 -->
          <div v-if="moduleConfig" class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div v-for="p in moduleConfig.params" :key="p.key" class="flex flex-col gap-1.5">
              <label v-if="p.type !== 'checkbox'" class="text-[11px] font-medium text-muted-foreground">{{ p.label }}</label>
              <span v-if="p.type !== 'checkbox' && p.help" class="-mt-1 text-[11px] font-normal text-muted-foreground/60">— {{ p.help }}</span>
              <textarea
                  v-if="p.type === 'textarea'"
                  v-model="formValues[p.key]"
                  :class="textareaCount > 1 ? 'min-h-[20vh]' : 'min-h-[36vh]'"
                  :placeholder="p.placeholder ?? ''"
                  class="flex-1 resize-y rounded-md border border-input bg-muted/40 p-3 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  @keydown="handleTextareaKeydown"
              />
              <input
                  v-else-if="p.type === 'text'"
                  v-model="formValues[p.key]"
                  :placeholder="p.placeholder ?? ''"
                  class="rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-ring focus:ring-2 focus:ring-ring/20"
                  type="text"
                  @keydown="handleTextareaKeydown"
              />
              <div v-else-if="p.type === 'number'" class="flex items-center gap-2">
                <input
                    v-model="formValues[p.key]"
                    :placeholder="p.placeholder ?? ''"
                    class="w-full rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-ring focus:ring-2 focus:ring-ring/20"
                    type="number"
                    @keydown="handleTextareaKeydown"
                />
                <span v-if="p.unit" class="shrink-0 font-mono text-[11px] text-muted-foreground">{{ p.unit }}</span>
              </div>
              <label v-else-if="p.type === 'checkbox'" class="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
                <input
                    :checked="formValues[p.key] === 'true'"
                    class="accent-primary"
                    type="checkbox"
                    @change="formValues[p.key] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
                />
                {{ p.label }}
                <span v-if="p.help" class="text-[11px] text-muted-foreground/60">— {{ p.help }}</span>
              </label>
              <select
                  v-else-if="p.type === 'select'"
                  v-model="formValues[p.key]"
                  class="rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option v-for="opt in p.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input
                  v-else-if="p.type === 'color'"
                  v-model="formValues[p.key]"
                  class="h-8 w-16 rounded-md border border-input bg-background p-0.5"
                  type="color"
              />
            </div>
          </div>

          <!-- 단일 textarea (CONFIGS 없는 모듈) -->
          <textarea
              v-else
              v-model="runInput"
              class="min-h-[40vh] flex-1 resize-y bg-muted/40 p-4 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40"
              placeholder="입력값을 입력하세요"
              @keydown="handleTextareaKeydown"
          />

          <div class="flex h-11 shrink-0 items-center gap-3 border-t border-border px-4">
            <p class="flex-1 text-[11px] text-muted-foreground/70">
              <template v-if="autoRunEnabled">입력하면 자동으로 실행됩니다</template>
              <template v-else>입력 후 실행 버튼을 누르세요</template>
            </p>
            <span class="font-mono text-[10px] text-muted-foreground/60">⌘↵</span>
            <Button :disabled="running" class="h-8 px-4 text-[13px]" size="sm" @click="() => runLight()">
              <Loader2 v-if="running" class="size-3.5 animate-spin"/>
              <span>{{ running ? '실행 중' : '실행' }}</span>
            </Button>
          </div>
        </div>

        <!-- Output -->
        <div class="flex flex-col">
          <div class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
            <span
                class="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              결과
              <Loader2 v-if="running" class="size-3 animate-spin"/>
            </span>
            <button
                v-if="result?.text && moduleConfig?.resultType !== 'image'"
                :class="copied ? 'text-emerald-500' : 'text-muted-foreground/60 hover:text-foreground'"
                class="rounded p-0.5 transition-colors"
                @click="copyResult"
            >
              <Check v-if="copied" class="size-3.5"/>
              <Copy v-else class="size-3.5"/>
            </button>
          </div>

          <div class="flex-1 overflow-auto">
            <div v-if="runError && !result"
                 class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div class="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle class="size-5 text-destructive/70"/>
              </div>
              <div>
                <p class="text-[13px] font-medium text-foreground">{{ runError }}</p>
                <p class="mt-0.5 text-[11px] text-muted-foreground">입력을 확인하거나 잠시 후 다시 시도해 주세요</p>
              </div>
              <Button class="text-[12px]" size="sm" variant="outline" @click="() => runLight()">다시 시도</Button>
            </div>

            <div v-else-if="moduleConfig?.resultType === 'image' && result?.text"
                 class="flex flex-col items-center gap-4 p-6">
              <img :src="`data:image/png;base64,${result.text}`" alt="생성된 이미지"
                   class="max-w-full rounded border border-border bg-white shadow-sm"/>
              <Button class="text-[12px]" size="sm" variant="outline" @click="downloadImage">다운로드</Button>
            </div>

            <!-- 구조화 결과 (백엔드 ToolResult.ofJson 컨벤션) -->
            <div v-else-if="structuredResult" class="flex h-full flex-col">
              <p v-if="runError" class="px-3 pt-2 text-[11px] text-destructive/80">{{ runError }}</p>
              <StructuredResultView :data="structuredResult"/>
            </div>

            <div v-else-if="result" class="flex h-full flex-col p-4">
              <p v-if="runError" class="mb-2 text-[11px] text-destructive/80">{{ runError }}</p>
              <ResultViewer :text="result.text" class="flex-1"/>
            </div>

            <div v-else class="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
              <div class="flex size-12 items-center justify-center rounded-xl border-2 border-dashed border-border">
                <ArrowRight class="size-5 text-muted-foreground/50"/>
              </div>
              <p class="text-[12px] text-muted-foreground">
                <template v-if="autoRunEnabled">입력과 동시에 결과가 나타납니다</template>
                <template v-else>입력 후 <kbd class="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">⌘↵</kbd> 또는 실행 버튼을
                  누르세요
                </template>
              </p>
              <Button
                  v-if="moduleConfig?.sample"
                  class="text-[12px]"
                  size="sm"
                  variant="outline"
                  @click="applySample"
              >
                <Wand2 class="size-3.5"/>
                예시로 실행해 보기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments (접이식) -->
      <div class="mt-8 border-t border-border pt-4">
        <button
            class="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            @click="showComments = !showComments"
        >
          <MessageSquare class="size-4"/>
          댓글
          <span v-if="commentCount !== null" class="font-mono text-[11px]">{{ commentCount }}</span>
          <ChevronDown :class="showComments ? 'rotate-180' : ''" class="size-3.5 transition-transform"/>
        </button>
        <div v-show="showComments">
          <CommentSection :module-id="(route.params.moduleId as string)" @count="commentCount = $event"/>
        </div>
      </div>
    </div>
  </template>
</template>

<script lang="ts" setup>
import {computed, defineAsyncComponent, onUnmounted, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Check,
  ChevronDown,
  Copy,
  Heart,
  Star,
  Loader2,
  Lock,
  LockOpen,
  MessageSquare,
  Wand2,
  X,
} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {normalizeApiModules, resolveMockModule} from '../api/modules'
import {buildFallbackParams} from '../utils/lightParams'
import {uploadErrorMessage} from '../utils/uploadError'
import {clearPreviousRun, type RunResult} from '../utils/runState'
import {predictResizeOutput} from '../utils/imageResizePreview'
import type {PixelSize} from '../utils/imageDimensions'
import type {BatchProgress, Module, UploadResult} from '../types'
import {isBatchResult} from '../types'
import {Button} from '@/components/ui/button'
import {HEAVY_CONFIGS, MODULE_CONFIGS} from '../config/toolConfigs'
import {FRONTEND_TOOL_COMPONENTS} from '../config/frontendToolRegistry'
import {useRecentTools} from '../composables/useRecentTools'
import {useLikes} from '../composables/useLikes'
import {useFavorites} from '../composables/useFavorites'
import {useActiveJobs} from '../composables/useActiveJobs'

import {parseStructuredResult} from '../utils/structuredResult'
import StructuredResultView from '../components/StructuredResultView.vue'
import FileUploader from '../components/FileUploader.vue'
import BatchPoller from '../components/BatchPoller.vue'
import ResultViewer from '../components/ResultViewer.vue'
import FileResultPanel from '../components/FileResultPanel.vue'
import CommentSection from '../components/CommentSection.vue'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

// ── 상태 ──────────────────────────────────────────────────────────────────

const route = useRoute()
const mod = ref<Module | null>(null)
const loading = ref(true)
const jobId = ref<string | null>(null)
// 단건 작업 진행 가시화 (ADR-0019): 큐 순번·진행률·ETA를 SSE로 받아 표시
const jobProgress = ref<{ queuePosition: number; progress: number; etaSeconds: number | null } | null>(null)
const sseReconnecting = ref(false)
const sseFailed = ref(false)
const batchId = ref<string | null>(null)
const batchProgress = ref<BatchProgress | null>(null)
const batchComplete = ref(false)
const batchFailed = ref(false)
const batchReconnecting = ref(false)
const result = ref<RunResult | null>(null)
const runInput = ref('')
const formValues = ref<Record<string, string>>({})
const heavyFormValues = ref<Record<string, string>>({})
const heavyTextContent = ref('')
const running = ref(false)
const runError = ref('')
const copied = ref(false)
const showComments = ref(true)
const commentCount = ref<number | null>(null)

const {record: recordRecent} = useRecentTools()
const {track: trackActiveJob} = useActiveJobs()
const {isFavorite, toggle: toggleFavorite} = useFavorites()
const isFav = computed(() => mod.value ? isFavorite(mod.value.id) : false)
function toggleFav() {
  if (mod.value) toggleFavorite(mod.value.id)
}

const moduleConfig = computed(() => mod.value ? MODULE_CONFIGS[mod.value.id] ?? null : null)
const heavyConfig = computed(() => mod.value ? HEAVY_CONFIGS[mod.value.id] ?? null : null)
const frontendToolEntry = computed(() => mod.value ? FRONTEND_TOOL_COMPONENTS[mod.value.id] ?? null : null)

// ── image-resize 전용: 크기 입력 UI (락 아이콘 + 프리셋 + 실시간 미리보기) ──────
// 이 4개 키는 파라미터 폼에 자동 렌더링하지 않고 아래 전용 블록이 직접 그린다
// (기본값 시딩·제출은 heavyConfig.params에 남겨둔 채로 그대로 재사용한다).
const RESIZE_CUSTOM_KEYS = new Set(['unit', 'width', 'height', 'keepAspectRatio'])
const visibleHeavyParams = computed(() => {
  if (!heavyConfig.value) return []
  if (mod.value?.id !== 'image-resize') return heavyConfig.value.params
  return heavyConfig.value.params.filter(p => !RESIZE_CUSTOM_KEYS.has(p.key))
})

const RESIZE_PRESETS = [
  {label: '1920 x 1080 (FHD)', width: 1920, height: 1080},
  {label: '1280 x 720 (HD)', width: 1280, height: 720},
  {label: '1080 x 1080 (정사각형)', width: 1080, height: 1080},
  {label: '800 x 600', width: 800, height: 600},
]
const selectedResizePreset = ref('')
const stagedImageDims = ref<PixelSize | null>(null)
let resizeSyncing = false

// 확대 방지가 켜져 있으면 입력칸 자체가 원본보다 큰 값을 들고 있지 않도록 즉시 되돌린다
// — "미리보기 숫자만 다르고 입력칸은 그대로"인 혼란을 없앤다.
// %는 원본이 몇 픽셀이든 100%가 상한이라 실제 크기를 몰라도 바로 판단할 수 있지만,
// px는 원본 픽셀 수를 알아야 상한을 계산할 수 있어 stagedImageDims가 있을 때만 clamp한다.
// 실제로 값을 조정했다면 지금 필드가 더 이상 선택된 프리셋과 일치하지 않으므로 선택을 해제한다
// — 안 그러면 드롭다운은 "1920x1080"인데 실제 필드는 조정된 다른 숫자인 모순된 상태가 남는다.
function clampResizeFieldsToSource() {
  if (heavyFormValues.value.preventUpscale === 'false') return
  let changed = false
  if (heavyFormValues.value.unit === '%') {
    if (Number(heavyFormValues.value.width) > 100) { heavyFormValues.value.width = '100'; changed = true }
    if (Number(heavyFormValues.value.height) > 100) { heavyFormValues.value.height = '100'; changed = true }
  } else if (stagedImageDims.value) {
    const w = Number(heavyFormValues.value.width)
    const h = Number(heavyFormValues.value.height)
    if (Number.isFinite(w) && w > stagedImageDims.value.width) {
      heavyFormValues.value.width = String(stagedImageDims.value.width)
      changed = true
    }
    if (Number.isFinite(h) && h > stagedImageDims.value.height) {
      heavyFormValues.value.height = String(stagedImageDims.value.height)
      changed = true
    }
  }
  if (changed) selectedResizePreset.value = ''
}

// 확대 방지가 켜져 있고 원본 크기를 알면, 원본보다 큰 프리셋은 골라봤자 바로 조정될 뿐이므로
// 드롭다운에서 미리 비활성화해 "선택했는데 왜 다른 숫자가 됐지"를 애초에 겪지 않게 한다.
const resizePresetOptions = computed(() => {
  const blockUpscale = heavyFormValues.value.preventUpscale !== 'false'
  const dims = stagedImageDims.value
  return RESIZE_PRESETS.map(preset => ({
    ...preset,
    disabled: !!(blockUpscale && dims && (preset.width > dims.width || preset.height > dims.height)),
  }))
})

function onFileDimensions(dims: PixelSize | null) {
  stagedImageDims.value = dims
  clampResizeFieldsToSource()
}

function toggleAspectLock() {
  heavyFormValues.value.keepAspectRatio = heavyFormValues.value.keepAspectRatio === 'true' ? 'false' : 'true'
}

function applyResizePreset() {
  const preset = RESIZE_PRESETS.find(p => p.label === selectedResizePreset.value)
  if (!preset) return
  heavyFormValues.value.width = String(preset.width)
  heavyFormValues.value.height = String(preset.height)
  clampResizeFieldsToSource()
}

// px + 종횡비 잠금 + 실제 이미지 크기를 알 때만 반대 칸을 자동 계산한다.
// 배치(파일 여러 장)에서는 기준 이미지가 모호해 자동 계산을 하지 않고 그대로 둔다.
// 직접 타이핑하면 프리셋 선택과 어긋나므로 "직접 입력"으로 되돌린다.
function onResizeWidthInput() {
  if (resizeSyncing) return
  selectedResizePreset.value = ''
  resizeSyncing = true
  clampResizeFieldsToSource()
  const w = Number(heavyFormValues.value.width)
  if (heavyFormValues.value.keepAspectRatio === 'true' && stagedImageDims.value && Number.isFinite(w) && w > 0) {
    heavyFormValues.value.height = String(Math.max(1, Math.round(w * stagedImageDims.value.height / stagedImageDims.value.width)))
  }
  resizeSyncing = false
}

function onResizeHeightInput() {
  if (resizeSyncing) return
  selectedResizePreset.value = ''
  resizeSyncing = true
  clampResizeFieldsToSource()
  const h = Number(heavyFormValues.value.height)
  if (heavyFormValues.value.keepAspectRatio === 'true' && stagedImageDims.value && Number.isFinite(h) && h > 0) {
    heavyFormValues.value.width = String(Math.max(1, Math.round(h * stagedImageDims.value.width / stagedImageDims.value.height)))
  }
  resizeSyncing = false
}

function onResizePercentInput() {
  if (resizeSyncing) return
  resizeSyncing = true
  clampResizeFieldsToSource()
  resizeSyncing = false
}

// % + 종횡비 잠금이면 가로/세로 퍼센트가 항상 같은 값이어야 의미가 있으므로 입력칸 하나로 합쳐
// width를 대표값으로 편집하고 height를 그대로 따라가게 한다.
function onResizePercentLinkedInput() {
  if (resizeSyncing) return
  resizeSyncing = true
  heavyFormValues.value.height = heavyFormValues.value.width
  clampResizeFieldsToSource()
  resizeSyncing = false
}

// 확대 방지를 켜는 순간 이미 입력된 값이 원본보다 크면 즉시 되돌린다.
watch(() => heavyFormValues.value.preventUpscale, () => clampResizeFieldsToSource())

// px↔% 전환 시 이전 단위의 값(예: px 800)이 그대로 남아있으면 의미가 달라지므로
// 단위에 맞는 기본값으로 되돌린다.
watch(() => heavyFormValues.value.unit, unit => {
  if (mod.value?.id !== 'image-resize') return
  selectedResizePreset.value = ''
  if (unit === '%') {
    heavyFormValues.value.width = '100'
    heavyFormValues.value.height = '100'
  } else {
    heavyFormValues.value.width = '800'
    heavyFormValues.value.height = '600'
  }
  clampResizeFieldsToSource()
})

// 입력 필드 자체가 clampResizeFieldsToSource()로 항상 유효 범위로 즉시 보정되므로,
// 이 미리보기는 "지금 필드 값 그대로" 계산한 결과만 보여주면 된다(별도 강조 상태 불필요).
const resizePreviewInfo = computed(() => {
  if (mod.value?.id !== 'image-resize') return null
  const locked = heavyFormValues.value.keepAspectRatio === 'true'
  const preventUpscale = heavyFormValues.value.preventUpscale !== 'false'
  if (!stagedImageDims.value) {
    // 파일 여러 장(배치)이거나 아직 크기를 못 읽었을 때는 정확한 숫자 대신 동작 방식을 안내한다.
    // 배치는 각 파일이 자기 자신의 원본 크기를 기준으로 개별 처리되므로 그 점을 명시한다.
    const behavior = locked
        ? '각 이미지가 비율을 유지한 채 이 크기 안에 맞춰집니다.'
        : '각 이미지가 이 크기로 강제 변형됩니다.'
    const note = preventUpscale ? ' 파일마다 자기 원본보다 커지지 않도록 각각 확인합니다.' : ''
    return {text: behavior + note}
  }
  const width = Number(heavyFormValues.value.width)
  const height = Number(heavyFormValues.value.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const base = {unit: (heavyFormValues.value.unit === '%' ? '%' : 'px') as 'px' | '%', width, height, keepAspectRatio: locked}
  const predicted = predictResizeOutput(stagedImageDims.value, {...base, preventUpscale})
  return {text: `결과 크기: ${predicted.width} x ${predicted.height}px`}
})
const frontendToolComponent = computed(() =>
    frontendToolEntry.value ? defineAsyncComponent(frontendToolEntry.value.load) : null,
)
const modComponent = computed(() => mod.value?.component ? defineAsyncComponent(mod.value.component) : null)
const frontendToolLayoutClass = computed(() =>
    frontendToolEntry.value?.layout === 'narrow' ? 'px-6 py-8 max-w-5xl mx-auto' : '',
)
const batchResultUrl = computed(() => batchId.value ? `${API_BASE}/api/v1/batches/${batchId.value}/result` : '')

const structuredResult = computed(() => parseStructuredResult(result.value?.text))

const textareaCount = computed(() =>
    moduleConfig.value?.params.filter(p => p.type === 'textarea').length ?? 0,
)

const hasInput = computed(() => {
  if (moduleConfig.value) return Object.values(formValues.value).some(v => v !== '' && v !== undefined)
  return !!runInput.value
})

// ── 통계 ──────────────────────────────────────────────────────────────────

interface ToolStats {
  moduleId: string
  useCount: number
  likeCount: number
}

const stats = ref<ToolStats | null>(null)
const likePending = ref(false)
const {isLiked, markLiked, markUnliked} = useLikes()

const liked = computed(() => mod.value ? isLiked(mod.value.id) : false)

async function loadStats(moduleId: string) {
  try {
    const {data} = await apiClient.get<ToolStats>(`/api/v1/tools/${moduleId}/stats`)
    stats.value = data
  } catch {
    stats.value = null
  }
}

async function toggleLike() {
  const moduleId = route.params.moduleId as string
  if (likePending.value) return
  likePending.value = true
  try {
    if (liked.value) {
      const {data} = await apiClient.delete<ToolStats>(`/api/v1/tools/${moduleId}/like`)
      stats.value = data
      markUnliked(moduleId)
    } else {
      const {data} = await apiClient.post<ToolStats>(`/api/v1/tools/${moduleId}/like`)
      stats.value = data
      markLiked(moduleId)
    }
  } catch {
    // 서버 오류 시 상태 변경하지 않음
  } finally {
    likePending.value = false
  }
}

// ── 로드 & 초기화 ─────────────────────────────────────────────────────────

async function loadModule(moduleId: string) {
  loading.value = true
  mod.value = null
  stats.value = null
  showComments.value = true
  commentCount.value = null
  resetAll()
  try {
    const {data} = await apiClient.get<Module[]>('/api/v1/modules')
    const allModules = normalizeApiModules(data)
    mod.value = allModules.find(m => m.id === moduleId) ?? null
  } catch {
    mod.value = resolveMockModule(moduleId)
  } finally {
    loading.value = false
    initForm()
    loadStats(moduleId)
    if (mod.value) recordRecent(mod.value.id).catch(() => {})
  }
}

// ── SSE ───────────────────────────────────────────────────────────────────

let eventSource: EventSource | null = null
let sseErrorCount = 0
const SSE_MAX_CONSECUTIVE_ERRORS = 5

watch(() => route.params.moduleId as string, loadModule, {immediate: true})

watch(jobId, (id) => {
  if (id) startSse(id)
})

onUnmounted(stopSse)

function startSse(id: string) {
  stopSse()
  sseErrorCount = 0
  sseReconnecting.value = false
  sseFailed.value = false
  const es = new EventSource(`${API_BASE}/api/v1/jobs/${id}/stream`)
  eventSource = es
  es.addEventListener('job-status-changed', (e: MessageEvent) => {
    const d = JSON.parse(e.data)
    sseErrorCount = 0
    sseReconnecting.value = false
    jobProgress.value = {
      queuePosition: d.queuePosition ?? 0,
      progress: d.progress ?? 0,
      etaSeconds: d.etaSeconds ?? null,
    }
    if (d.status === 'DONE' || d.status === 'FAILED') {
      stopSse()
      if (d.status === 'DONE') onDone(id)
      else onFailed()
    }
  })
  es.onerror = () => {
    sseErrorCount += 1
    // CLOSED: 네이티브가 재연결을 완전히 포기한 상태(예: 리다이렉트 거부·잘못된 content-type) —
    // 더 이상 onerror가 안 불릴 것이므로 카운트가 상한에 도달할 기회 자체가 없다. 즉시 실패 처리.
    const gaveUp = es.readyState === EventSource.CLOSED
    if (gaveUp || sseErrorCount >= SSE_MAX_CONSECUTIVE_ERRORS) {
      sseReconnecting.value = false
      sseFailed.value = true
      stopSse()
      return
    }
    sseReconnecting.value = true
  }
}

function stopSse() {
  eventSource?.close()
  eventSource = null
}

function initForm() {
  const lc = mod.value ? MODULE_CONFIGS[mod.value.id] : undefined
  if (lc) {
    const v: Record<string, string> = {}
    for (const p of lc.params) v[p.key] = p.default ?? ''
    formValues.value = v
  }
  const hc = mod.value ? HEAVY_CONFIGS[mod.value.id] : undefined
  if (hc) {
    const v: Record<string, string> = {}
    for (const p of hc.params) v[p.key] = p.default ?? ''
    heavyFormValues.value = v
  }
}

// ── Heavy ─────────────────────────────────────────────────────────────────

function onUploadError(message: string) {
  runError.value = message
}

// 재업로드 시작 시 직전 실행의 잔여 상태(result·반대쪽 경로 jobId/batchId·batchComplete 등)를
// 전부 비운다. 안 그러면 템플릿이 옛 결과/배치 화면에 머문다(033 문제 1).
function resetRunState() {
  stopSse()
  sseReconnecting.value = false
  sseFailed.value = false
  batchFailed.value = false
  batchReconnecting.value = false
  const cleared = clearPreviousRun({
    jobId: jobId.value,
    jobProgress: jobProgress.value,
    batchId: batchId.value,
    batchProgress: batchProgress.value,
    batchComplete: batchComplete.value,
    result: result.value,
    runError: runError.value,
  })
  jobId.value = cleared.jobId
  jobProgress.value = cleared.jobProgress
  batchId.value = cleared.batchId
  batchProgress.value = cleared.batchProgress
  batchComplete.value = cleared.batchComplete
  result.value = cleared.result
  runError.value = cleared.runError
}

function onUploaded(r: UploadResult) {
  resetRunState()
  if (isBatchResult(r)) {
    // 배치: 단건 SSE를 시작하지 않도록 jobId는 null로 두고 배치 진행률로 진입한다.
    batchId.value = r.batchId
    return
  }
  jobId.value = r.jobId
  // 043: 페이지를 벗어나도 추적이 끊기지 않도록 전역 store에도 등록한다. Light 모듈은
  // 이 분기(Heavy 전용 업로드 흐름)에 도달하지 않으므로 추적 대상에서 자연히 제외된다.
  if (mod.value?.isHeavy) {
    trackActiveJob(r.jobId, mod.value.id, mod.value.name)
  }
}

// ETA 초 → 사람이 읽는 문자열 (예: "45초", "2분 10초")
function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}초`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function onBatchProgress(p: BatchProgress) {
  batchReconnecting.value = false
  batchProgress.value = p
}

function onBatchDone(p: BatchProgress) {
  batchReconnecting.value = false
  batchProgress.value = p
  batchComplete.value = true
}

function onBatchError() {
  batchReconnecting.value = false
  batchFailed.value = true
}

function onBatchRetrying() {
  batchReconnecting.value = true
}

async function uploadTextAsFile() {
  if (!mod.value || !heavyConfig.value?.textInput || !heavyTextContent.value.trim()) return
  const {filename} = heavyConfig.value.textInput
  const blob = new Blob([heavyTextContent.value], {type: 'text/plain'})
  const form = new FormData()
  form.append('files', new File([blob], filename))
  Object.entries(heavyFormValues.value).forEach(([k, v]) => { if (v) form.append(k, v) })
  try {
    const {data} = await apiClient.post<UploadResult>(`/api/v1/tools/${mod.value.id}/upload`, form)
    onUploaded(data)
  } catch (e) {
    onUploadError(uploadErrorMessage(e))
  }
}

async function onDone(id: string) {
  try {
    const {data} = await apiClient.get(`/api/v1/jobs/${id}/result`)
    result.value = {url: data.url ?? null, text: data.text ?? null}
  } catch {
    result.value = {url: null, text: '결과를 불러오지 못했습니다.'}
  }
}

function onFailed() {
  result.value = {url: null, text: '처리에 실패했습니다.'}
}

// ── Light ─────────────────────────────────────────────────────────────────

// 키 입력마다 외부 요청이 나가면 안 되는 모듈은 자동 실행에서 제외한다
const AUTO_RUN_DISABLED = new Set(['html-fetch'])

const autoRunEnabled = computed(() =>
    !!mod.value && !mod.value.isHeavy && !mod.value.isFrontendOnly
    && !AUTO_RUN_DISABLED.has(mod.value.id)
    && autoRunReady.value !== null,
)

// 자동 실행 트리거 기준: 첫 번째 자유 입력 필드(select 제외)가 비어있지 않을 때.
// select만 있는 모듈(rsa-key 등)은 자동 실행하지 않는다 (null).
const autoRunReady = computed<boolean | null>(() => {
  if (moduleConfig.value) {
    const primary = moduleConfig.value.params.find(p => p.type !== 'select')
    if (!primary) return null
    return (formValues.value[primary.key]?.trim() ?? '') !== ''
  }
  return runInput.value.trim() !== ''
})

let runToken = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch([formValues, runInput], () => {
  if (!autoRunEnabled.value || !autoRunReady.value) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runLight({auto: true}), 600)
}, {deep: true})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function runLight(opts: { auto?: boolean } = {}) {
  if (running.value && opts.auto) return
  const token = ++runToken
  running.value = true
  if (!opts.auto) {
    runError.value = ''
    result.value = null
  }
  try {
    let params: Record<string, string>
    if (moduleConfig.value) {
      params = {...formValues.value}
      // rsa-key: split "RSA-2048" → {keyType: "RSA", keySize: "2048"}
      if (mod.value?.id === 'rsa-key' && params.preset) {
        const [keyType, keySize] = params.preset.split('-')
        params = {keyType, keySize}
      }
    } else {
      params = buildFallbackParams(runInput.value)
    }
    const {data} = await apiClient.post(`/api/v1/tools/${mod.value?.id}/run`, params)
    if (token !== runToken) return
    result.value = {url: null, text: data.result ?? null}
    runError.value = ''
  } catch (e: unknown) {
    if (token !== runToken) return
    const err = e as { response?: { data?: { message?: string } } }
    runError.value = err.response?.data?.message ?? '서버에 연결할 수 없습니다'
    if (!opts.auto) result.value = null
  } finally {
    if (token === runToken) running.value = false
  }
}

function applySample() {
  const sample = moduleConfig.value?.sample
  if (!sample) return
  formValues.value = {...formValues.value, ...sample}
}

function handleTextareaKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    runLight()
  }
}

async function copyResult() {
  const text = result.value?.text
  if (!text) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadImage() {
  const text = result.value?.text
  if (!text) return
  const a = document.createElement('a')
  a.href = `data:image/png;base64,${text}`
  a.download = `${mod.value?.id ?? 'image'}.png`
  a.click()
}

// ── 리셋 ──────────────────────────────────────────────────────────────────

function resetAll() {
  stopSse()
  jobId.value = null
  jobProgress.value = null
  sseReconnecting.value = false
  sseFailed.value = false
  batchId.value = null
  batchProgress.value = null
  batchComplete.value = false
  batchFailed.value = false
  batchReconnecting.value = false
  result.value = null
  runInput.value = ''
  runError.value = ''
  copied.value = false
  heavyTextContent.value = ''
  initForm()
}

function resetLight() {
  result.value = null
  runInput.value = ''
  runError.value = ''
  copied.value = false
  initForm()
}
</script>
