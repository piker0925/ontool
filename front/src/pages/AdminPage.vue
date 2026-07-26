<template>
  <div class="mx-auto max-w-5xl px-6 py-8">
    <h1 class="mb-6 text-xl font-semibold text-foreground">관리자 페이지</h1>

    <!-- 세션에 남은 인증정보를 검증하는 동안(새로고침 직후) — 로그인 폼이 잠깐 보였다 사라지는 걸 방지 -->
    <div v-if="checkingAuth" class="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin"/>
      확인 중…
    </div>

    <!-- 로그인 폼 -->
    <div v-else-if="!authed" class="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-foreground">관리자 로그인</h2>
      <form class="flex flex-col gap-3" @submit.prevent="login">
        <input
            v-model="username"
            aria-label="사용자명"
            class="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="사용자명"
            type="text"
            autocomplete="username"
        />
        <input
            v-model="password"
            aria-label="비밀번호"
            class="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-ring"
            placeholder="비밀번호"
            type="password"
            autocomplete="current-password"
        />
        <p v-if="loginError" role="alert" aria-live="assertive" class="text-xs text-destructive">{{ loginError }}</p>
        <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          로그인
        </button>
      </form>
    </div>

    <!-- 대시보드 -->
    <div v-else>
      <!-- 탭 네비게이션 -->
      <div class="mb-6 border-b border-border">
        <nav class="-mb-px flex gap-6">
          <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="currentTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'"
              class="border-b-2 px-1 pb-4 text-sm font-medium transition-colors"
              @click="switchTab(tab.id as TabId)"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- 탭 내용 -->
      <div class="flex flex-col gap-6">
        
        <!-- 1. 통계 탭 -->
        <div v-if="currentTab === 'stats'" class="flex flex-col gap-6">

          <!-- 시각화 요약(118) — 아래 표들을 한눈에 보기 위한 요약. 표는 정밀한 값 확인용으로 그대로 둔다.
               레이아웃(161 3라운드): 큐 적체는 관리자가 가장 먼저 확인할 시간민감 신호라 모듈별
               사용량과 나란히 맨 위로 올렸다. 일별 Job 처리/일별 신규 가입자는 자연스러운 grid-flow
               순서에 맡기지 않고 전용 서브 그리드로 묶어, 위쪽 카드 개수가 나중에 바뀌어도(레인별
               처리 분포 도넛을 뺐을 때 6→5개로 바뀌며 짝이 깨졌던 전례가 있다) 항상 나란히 붙는다. -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">대시보드 요약</h2>
              <button
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  :disabled="dashboardSummaryLoading" @click="onRefreshDashboardSummary"
              >
                <Loader2 v-if="dashboardSummaryLoading" class="size-3 animate-spin"/>
                새로고침
              </button>
            </div>
            <div class="flex flex-col gap-6 p-5">
              <!-- 1행: 모듈별 사용량 + 큐 적체 (시간민감 신호를 맨 위, 나란히) -->
              <div class="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                <div>
                  <h3 class="mb-3 text-xs font-medium text-muted-foreground">모듈별 사용량 (상위 10)</h3>
                  <BarChart :data="moduleUsageChartData" :value-formatter="v => v.toLocaleString()"/>
                </div>
                <div class="flex flex-col justify-center gap-4">
                  <h3 class="text-xs font-medium text-muted-foreground">큐 적체</h3>
                  <template v-if="dashboardStats">
                    <GaugeMeter
                        label="HEAVY 레인" :pending="dashboardStats.heavyQueue.pending"
                        :running="dashboardStats.heavyQueue.running" :threshold="dashboardStats.heavyQueue.threshold"
                    />
                    <GaugeMeter
                        label="VIDEO 레인" :pending="dashboardStats.videoQueue.pending"
                        :running="dashboardStats.videoQueue.running" :threshold="dashboardStats.videoQueue.threshold"
                    />
                  </template>
                  <p v-else class="text-xs text-muted-foreground">불러오는 중…</p>
                  <!-- 큐 적체 게이지(요약) ↔ 작업 큐 탭(상세 목록) 연결 — 둘이 같은 데이터의 요약/상세 관계라는 게
                       기존엔 드러나지 않았다. 탭 전환 함수를 그대로 재사용해 클릭 시 데이터도 같이 지연 로드된다. -->
                  <p class="text-xs text-muted-foreground">
                    상세 목록은
                    <button class="text-primary underline hover:no-underline" @click="switchTab('jobQueue')">작업 큐</button>
                    탭에서 확인
                  </p>
                </div>
              </div>
              <!-- 2행: 가입 경로 비율 + 구역별 사용량 분포(161) — 두 도넛을 나란히 -->
              <div class="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                <div>
                  <h3 class="mb-3 text-xs font-medium text-muted-foreground">가입 경로 비율</h3>
                  <DonutChart :data="providerDonutData" :donut="false"/>
                </div>
                <div>
                  <h3 class="mb-3 text-xs font-medium text-muted-foreground">구역별 사용량 분포</h3>
                  <DonutChart :data="zoneUsageDonutChartData" :value-formatter="v => v.toLocaleString()"/>
                </div>
              </div>
              <!-- 3행: 일별 Job 처리 + 일별 신규 가입자 — 전용 서브 그리드로 명시적으로 짝을 고정 -->
              <div class="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                <div>
                  <h3 class="mb-3 text-xs font-medium text-muted-foreground">일별 Job 처리 (성공/실패)</h3>
                  <StackedAreaChart :data="dashboardStats?.dailyJobCounts ?? []"/>
                </div>
                <div>
                  <h3 class="mb-3 text-xs font-medium text-muted-foreground">일별 신규 가입자</h3>
                  <LineChart :data="dailySignupChartData" value-label="가입"/>
                </div>
              </div>
            </div>
          </section>

          <!-- 모듈 통계 — 예전엔 "모듈별 실패율 랭킹" 미니 표가 따로 있었으나, 정보가 겹쳐서
               이 표 하나로 합쳤다(정렬 가능한 컬럼 헤더로 랭킹 역할도 겸함). 실패율은 canFail인
               모듈만 계산되고, 그 외에는 "-"(해당 없음)/"사용 없음"으로 명확히 구분해 보여준다. -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">모듈 통계</h2>
              <button
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  :disabled="moduleStatsLoading" @click="onRefreshModuleStats"
              >
                <Loader2 v-if="moduleStatsLoading" class="size-3 animate-spin"/>
                새로고침
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="cursor-pointer select-none px-5 py-3 font-medium" @click="setStatsSort('name')">모듈{{ statsSortIndicator('name') }}</th>
                  <th class="cursor-pointer select-none px-5 py-3 text-right font-medium" @click="setStatsSort('useCount')">사용 횟수{{ statsSortIndicator('useCount') }}</th>
                  <th class="cursor-pointer select-none px-5 py-3 text-right font-medium" @click="setStatsSort('likeCount')">좋아요{{ statsSortIndicator('likeCount') }}</th>
                  <th class="cursor-pointer select-none px-5 py-3 text-right font-medium" @click="setStatsSort('failCount')">실패{{ statsSortIndicator('failCount') }}</th>
                  <th class="cursor-pointer select-none px-5 py-3 text-right font-medium" @click="setStatsSort('failRate')">실패율{{ statsSortIndicator('failRate') }}</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="sortedModuleStatsRows.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="5">데이터 없음</td>
                </tr>
                <tr v-for="r in sortedModuleStatsRows" :key="r.moduleId" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-foreground">{{ r.name }}</td>
                  <td class="px-5 py-3 text-right text-foreground">{{ r.useCount.toLocaleString() }}</td>
                  <td class="px-5 py-3 text-right text-foreground">{{ r.likeCount.toLocaleString() }}</td>
                  <td class="px-5 py-3 text-right text-destructive">{{ r.failCount.toLocaleString() }}</td>
                  <td class="px-5 py-3 text-right font-medium" :class="r.failRate !== null ? 'text-destructive' : 'text-muted-foreground'">
                    <template v-if="r.failRate !== null">{{ (r.failRate * 100).toFixed(1) }}%</template>
                    <template v-else-if="r.canFail">사용 없음</template>
                    <template v-else>-</template>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- 2. 유저 관리 탭 -->
        <div v-if="currentTab === 'users'">
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-4">
                  <h2 class="text-sm font-medium text-foreground">유저 목록</h2>
                  <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{{ totalUsers }}명</span>
                </div>
                <p class="text-xs text-muted-foreground">
                  '이상 로그인 감지' 횟수는 참고용 빈도 지표입니다 — 멀티탭 동시 재발급 등 오탐이 섞일 수 있어 이 수치만으로 계정 탈취를 단정할 수 없습니다.
                </p>
              </div>
              <!-- 검색창 너비 부족으로 placeholder가 단어 중간에서 그냥 잘리고(생략부호 없이),
                   검색 버튼이 좁아져 "검"/"색" 두 글자가 세로로 줄바꿈되던 레이아웃 버그 수정(161 3라운드):
                   max-w를 넉넉히 늘리고 input엔 truncate+min-w-0, 버튼엔 shrink-0+whitespace-nowrap. -->
              <form class="flex w-full max-w-sm items-center gap-2 sm:w-auto" @submit.prevent="onSearch">
                <input
                  v-model="searchInput"
                  type="text"
                  placeholder="닉네임, 제공자 검색… (예: kim, google)"
                  autocomplete="off"
                  class="w-full min-w-0 truncate rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button type="submit" class="shrink-0 whitespace-nowrap rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                  검색
                </button>
              </form>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">ID</th>
                  <th class="px-5 py-3 font-medium">제공자</th>
                  <th class="px-5 py-3 font-medium">닉네임</th>
                  <th class="px-5 py-3 font-medium">이메일</th>
                  <th class="px-5 py-3 font-medium">가입일</th>
                  <th class="px-5 py-3 font-medium text-right" title="참고용 빈도 지표 — 오탐(멀티탭 동시 재발급)이 섞일 수 있어 탈취 확정으로 단정할 수 없습니다.">
                    이상 로그인 감지
                  </th>
                  <th class="px-5 py-3 font-medium text-right">액션</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="users.length === 0">
                  <td class="px-5 py-8 text-center text-muted-foreground" colspan="7">조회된 유저가 없습니다.</td>
                </tr>
                <tr v-for="u in users" :key="u.id" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-xs text-muted-foreground">{{ u.id }}</td>
                  <td class="px-5 py-3">
                    <span class="rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">{{ u.provider }}</span>
                  </td>
                  <td class="px-5 py-3 text-foreground">
                    {{ u.nickname }}
                    <span
                      v-if="u.status === 'SUSPENDED'"
                      class="ml-1.5 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                    >
                      정지됨
                    </span>
                  </td>
                  <td class="px-5 py-3 text-muted-foreground">{{ u.email || '-' }}</td>
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
                  <td class="px-5 py-3 text-right">
                    <span
                      :class="u.theftEventCount > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary/50 text-secondary-foreground'"
                      class="rounded-md px-2 py-1 text-xs font-medium"
                      title="참고용 빈도 지표 — 오탐(멀티탭 동시 재발급)이 섞일 수 있어 탈취 확정으로 단정할 수 없습니다."
                    >
                      {{ u.theftEventCount }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                      <button
                        @click="forceLogoutUser(u.id, u.nickname)"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        강제 로그아웃
                      </button>
                      <button
                        v-if="u.status === 'SUSPENDED'"
                        @click="unsuspendUser(u.id, u.nickname)"
                        class="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        정지 해제
                      </button>
                      <button
                        v-else
                        @click="suspendUser(u.id, u.nickname)"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        정지
                      </button>
                      <button
                        @click="openDeleteUserModal(u.id, u.nickname)"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        계정 삭제
                      </button>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
            
            <!-- 페이지네이션 -->
            <div class="flex items-center justify-between border-t border-border px-5 py-3" v-if="totalPages > 0">
              <button 
                :disabled="usersPage === 0" 
                @click="changePage(usersPage - 1)"
                class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
              >
                이전
              </button>
              <span class="text-sm text-muted-foreground">{{ usersPage + 1 }} / {{ totalPages }}</span>
              <button 
                :disabled="usersPage >= totalPages - 1" 
                @click="changePage(usersPage + 1)"
                class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </section>

          <!-- 댓글 신고 - 유저별 누적 집계 (056 정지 판단용) — 커뮤니티 콘텐츠 조정이 아니라
               "이 유저를 정지할지" 판단을 돕는 유저 관리 관심사라 유저 관리 탭으로 옮겼다. -->
          <section class="mt-6 rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">댓글 신고 - 유저별 누적</h2>
              <button
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  :disabled="reportAggregatesLoading" @click="onRefreshReportAggregates"
              >
                <Loader2 v-if="reportAggregatesLoading" class="size-3 animate-spin"/>
                새로고침
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">닉네임</th>
                  <th class="px-5 py-3 font-medium text-right">누적 신고</th>
                  <th class="px-5 py-3 font-medium">사유별 분포</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="reportUserAggregates.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="3">신고 누적 유저가 없습니다.</td>
                </tr>
                <tr v-for="agg in reportUserAggregates" :key="agg.userId" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 text-foreground">{{ agg.nickname }} <span class="text-xs text-muted-foreground">(ID:{{ agg.userId }})</span></td>
                  <td class="px-5 py-3 text-right font-medium text-destructive">{{ agg.totalCount }}</td>
                  <td class="px-5 py-3 text-xs text-muted-foreground">
                    <span v-for="(cnt, reason) in agg.reasonCounts" :key="reason" class="mr-2">{{ reason }}: {{ cnt }}</span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- 3. 작업 큐 탭 (161 — 기존 "운영" 탭 분할) -->
        <div v-if="currentTab === 'jobQueue'" class="flex flex-col gap-6">

          <!-- 작업 큐(Jobs) 모니터링 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">진행 중인 작업 (Jobs)</h2>
              <button
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  :disabled="jobQueueLoading" @click="onRefreshJobQueue"
              >
                <Loader2 v-if="jobQueueLoading" class="size-3 animate-spin"/>
                새로고침
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                <tr class="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th class="px-5 py-3 font-medium">Job ID</th>
                  <th class="px-5 py-3 font-medium">모듈</th>
                  <th class="px-5 py-3 font-medium">레인(Lane)</th>
                  <th class="px-5 py-3 font-medium">상태</th>
                  <th class="px-5 py-3 font-medium">요청 시간</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="jobs.length === 0">
                  <td class="px-5 py-6 text-center text-muted-foreground" colspan="5">현재 대기/실행 중인 작업이 없습니다.</td>
                </tr>
                <tr v-for="j in jobs" :key="j.id" class="border-b border-border last:border-0 hover:bg-muted/20">
                  <td class="px-5 py-3 font-mono text-xs text-foreground/80">{{ j.id.split('-')[0] }}...</td>
                  <td class="px-5 py-3 text-foreground">{{ j.moduleId }}</td>
                  <td class="px-5 py-3">
                    <span :class="j.lane === 'VIDEO' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'" class="rounded px-2 py-1 text-xs font-medium">
                      {{ j.lane }}
                    </span>
                  </td>
                  <td class="px-5 py-3">
                    <span :class="j.status === 'RUNNING' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-600'" class="rounded px-2 py-1 text-xs font-medium">
                      {{ j.status }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-muted-foreground">{{ formatDate(j.createdAt) }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- 4. 커뮤니티 관리 탭 (161 — 기존 "운영" 탭 분할) -->
        <div v-if="currentTab === 'community'" class="flex flex-col gap-6">

          <!-- 건의사항 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">건의사항</h2>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="suggestions.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">건의사항 없음</li>
              <li v-for="s in suggestions" :key="s.id" class="px-5 py-4">
                <p class="text-sm text-foreground">{{ s.content }}</p>
                <p class="mt-1.5 text-xs text-muted-foreground">{{ formatDate(s.createdAt) }}</p>
              </li>
            </ul>
          </section>

          <!-- 최근 댓글 — 시스템 전체 댓글은 무제한으로 쌓일 수 있어(백엔드 페이지네이션 추가,
               161 이후 라운드) 여기서는 최근 몇 개만 미리보기로 보여주고, 전체는 "전체보기" 모달의
               자체 페이지네이션으로 확인한다(기본으로 무제한 목록을 로드/렌더링하지 않음). -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">댓글 관리 (최근 {{ COMMENTS_PREVIEW_SIZE }}개)</h2>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="openCommentsModal">전체보기</button>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="comments.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">댓글 없음</li>
              <li v-for="c in comments" :key="c.id" class="flex items-start justify-between px-5 py-4 hover:bg-muted/10">
                <div>
                  <span class="mb-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{{ c.moduleId }}</span>
                  <p class="text-sm text-foreground mt-1">{{ c.content }}</p>
                  <p class="mt-1.5 text-xs text-muted-foreground">{{ formatDate(c.createdAt) }}</p>
                </div>
                <button
                    class="ml-4 shrink-0 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    @click="deleteComment(c.id)"
                >
                  삭제
                </button>
              </li>
            </ul>
          </section>

          <!-- 댓글 신고 - 개별 목록 -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-sm font-medium text-foreground">댓글 신고 목록</h2>
              <div class="flex items-center gap-2">
                <select v-model="reportStatusFilter" class="rounded-md border border-border bg-background px-2 py-1 text-xs" @change="loadCommentReports">
                  <option value="">전체 상태</option>
                  <option value="PENDING">대기중</option>
                  <option value="RESOLVED">확인완료</option>
                  <option value="DISMISSED">기각</option>
                </select>
                <select v-model="reportReasonFilter" class="rounded-md border border-border bg-background px-2 py-1 text-xs" @change="loadCommentReports">
                  <option value="">전체 사유</option>
                  <option v-for="opt in COMMENT_REPORT_REASONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <button
                    class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                    :disabled="commentReportsLoading" @click="onRefreshCommentReports"
                >
                  <Loader2 v-if="commentReportsLoading" class="size-3 animate-spin"/>
                  새로고침
                </button>
              </div>
            </div>
            <ul class="divide-y divide-border">
              <li v-if="commentReports.length === 0" class="px-5 py-6 text-center text-sm text-muted-foreground">신고 내역 없음</li>
              <li v-for="r in commentReports" :key="r.id" class="px-5 py-4 hover:bg-muted/10">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="mb-1 flex items-center gap-2">
                      <span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{{ r.reason }}</span>
                      <span
                          :class="r.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600' : r.status === 'RESOLVED' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'"
                          class="rounded px-2 py-0.5 text-xs font-medium"
                      >{{ r.status }}</span>
                    </div>
                    <p class="text-sm text-foreground">{{ r.commentContent }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      신고자: {{ r.reporterNickname || '알수없음' }} (ID:{{ r.reporterId }}) · {{ formatDate(r.createdAt) }}
                      <template v-if="r.detail"> · 상세: {{ r.detail }}</template>
                    </p>
                  </div>
                  <div class="flex shrink-0 gap-1">
                    <button
                        :disabled="r.status === 'RESOLVED'"
                        class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                        @click="updateReportStatus(r.id, 'RESOLVED')"
                    >확인완료</button>
                    <button
                        :disabled="r.status === 'DISMISSED'"
                        class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                        @click="updateReportStatus(r.id, 'DISMISSED')"
                    >기각</button>
                    <button
                        :disabled="r.status === 'RESOLVED'"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-40"
                        title="이 댓글을 삭제하고 신고를 확인완료 처리합니다"
                        @click="deleteComment(r.commentId, r.id)"
                    >댓글 삭제</button>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- 5. 감사 로그 탭 (161 — 기존 "운영" 탭 분할) -->
        <div v-if="currentTab === 'auditLog'" class="flex flex-col gap-6">

          <!-- 관리자 액션 감사로그 — 타임라인이 표와 같은 정보(시각·액션·대상 ID)를 그대로 담으면서
               시간 흐름·액션 종류를 더 잘 드러내므로 표를 완전히 대체한다(118 acceptance criteria 판단). -->
          <section class="rounded-xl border border-border bg-card shadow-sm">
            <div class="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 class="text-sm font-medium text-foreground">관리자 액션 로그</h2>
              <button
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
                  :disabled="actionLogsLoading" @click="onRefreshActionLogs"
              >
                <Loader2 v-if="actionLogsLoading" class="size-3 animate-spin"/>
                새로고침
              </button>
            </div>
            <div class="p-5">
              <ActionLogTimeline :items="actionLogTimelineItems" :legend="actionLogLegend"/>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- 계정 강제 삭제 확인 모달 (100) — 비가역 조작이라 브라우저 confirm 대신 자체 모달을 쓴다 -->
    <Dialog v-model:open="showDeleteUserModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>'{{ deleteUserTarget?.nickname }}' 계정을 정말 삭제하시겠습니까?</DialogTitle>
          <DialogDescription class="pt-4 space-y-2">
            <p>계정 정보 및 즐겨찾기, 좋아요 등 <strong>모든 개인 데이터가 즉시 삭제되며 절대 복구할 수 없습니다.</strong></p>
            <p>작성한 댓글과 작업 이력은 삭제되지 않지만 익명으로 전환됩니다.</p>
            <p class="text-destructive font-semibold mt-2">※ 이 작업은 되돌릴 수 없습니다.</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4 sm:justify-end gap-2 sm:gap-0">
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            @click="showDeleteUserModal = false"
          >
            취소
          </button>
          <button
            class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            :disabled="isDeletingUser"
            @click="confirmDeleteUser"
          >
            {{ isDeletingUser ? '처리 중…' : '영구 삭제' }}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 되돌릴 수 있는 관리자 액션 공용 확인 모달(강제 로그아웃·정지·정지해제) — 브라우저 기본 confirm() 대체 -->
    <Dialog :open="confirmAction !== null" @update:open="v => { if (!v) confirmAction = null }">
      <DialogContent v-if="confirmAction">
        <DialogHeader>
          <DialogTitle>{{ confirmAction.title }}</DialogTitle>
          <DialogDescription class="pt-4">{{ confirmAction.description }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4 sm:justify-end gap-2 sm:gap-0">
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            @click="confirmAction = null"
          >
            취소
          </button>
          <button
            :class="confirmAction.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground hover:opacity-90'
              : 'bg-primary text-primary-foreground hover:opacity-90'"
            class="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            :disabled="confirmActionRunning"
            @click="runConfirmAction"
          >
            {{ confirmActionRunning ? '처리 중…' : confirmAction.confirmLabel }}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 댓글 전체보기 모달 — 시스템 전체 댓글은 무제한으로 쌓일 수 있어(161 이후 라운드) 미리보기
         목록과 별개로, 여기서만 자체 페이지네이션으로 전체를 확인한다(모달을 열 때만 로드). -->
    <Dialog v-model:open="commentsModalOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>댓글 전체보기 <span class="text-sm font-normal text-muted-foreground">(총 {{ commentsModalTotalElements }}개)</span></DialogTitle>
        </DialogHeader>
        <ul class="max-h-[60vh] divide-y divide-border overflow-y-auto">
          <li v-if="commentsModalItems.length === 0" class="py-6 text-center text-sm text-muted-foreground">댓글 없음</li>
          <li v-for="c in commentsModalItems" :key="c.id" class="flex items-start justify-between gap-4 py-4 hover:bg-muted/10">
            <div>
              <span class="mb-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{{ c.moduleId }}</span>
              <p class="text-sm text-foreground mt-1">{{ c.content }}</p>
              <p class="mt-1.5 text-xs text-muted-foreground">{{ formatDate(c.createdAt) }}</p>
            </div>
            <button
                class="ml-4 shrink-0 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                @click="deleteComment(c.id)"
            >
              삭제
            </button>
          </li>
        </ul>
        <div class="flex items-center justify-between border-t border-border pt-3" v-if="commentsModalTotalPages > 0">
          <button
              :disabled="commentsModalPage === 0"
              @click="changeCommentsModalPage(commentsModalPage - 1)"
              class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            이전
          </button>
          <span class="text-sm text-muted-foreground">{{ commentsModalPage + 1 }} / {{ commentsModalTotalPages }}</span>
          <button
              :disabled="commentsModalPage >= commentsModalTotalPages - 1"
              @click="changeCommentsModalPage(commentsModalPage + 1)"
              class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Loader2} from 'lucide-vue-next'
import {apiClient} from '../api/client'
import {COMMENT_REPORT_REASONS} from '../constants/commentReportReasons'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '../components/ui/dialog'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import GaugeMeter from '../components/charts/GaugeMeter.vue'
import StackedAreaChart from '../components/charts/StackedAreaChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import ActionLogTimeline, {type TimelineItem, type TimelineLegendEntry} from '../components/charts/ActionLogTimeline.vue'
import {allFailableModuleIds, moduleCanFail, moduleNameFor, moduleZoneFor} from '../api/modules'
import {
  mergedModuleStatsRows,
  moduleUsageChartData as moduleUsageChartDataOf,
  sortModuleStatsRows,
  zoneUsageDonutData,
  type ModuleStatsSortKey,
} from './adminStatsDerivations'

const username = ref('')
const password = ref('')
const loginError = ref('')
const authed = ref(false)
let authHeader = sessionStorage.getItem('admin_auth') || ''
// 세션에 인증정보가 있으면 유효성 확인 API 응답이 올 때까지 로그인 폼을 보여주지 않는다
// (없으면 확인할 것도 없으므로 곧바로 로그인 폼).
const checkingAuth = ref(!!authHeader)

// --- 탭 상태 ---
// 161: 기존 "운영" 탭 하나에 성격이 다른 6개 섹션(Job 큐·건의사항·댓글 관리·댓글신고 2종·감사로그)이
// 눌러담겨 있던 것을 3개 탭으로 분할(ADR-0035 — 사이드바·라우트 전환은 반려, 상단 탭 개수만 늘림).
type TabId = 'stats' | 'users' | 'jobQueue' | 'community' | 'auditLog'
const tabs = [
  {id: 'stats', name: '통계'},
  {id: 'users', name: '유저 관리'},
  {id: 'jobQueue', name: '작업 큐'},
  {id: 'community', name: '커뮤니티 관리'},
  {id: 'auditLog', name: '감사 로그'},
]

const route = useRoute()
const router = useRouter()

const initialTab = typeof route.query.tab === 'string' && tabs.some(t => t.id === route.query.tab)
    ? route.query.tab as TabId
    : 'stats'

const currentTab = ref<TabId>(initialTab)

// URL query 양방향 동기화(replace라 뒤로가기 이력을 쌓지 않음) — 새로고침해도 탭이 유지된다.
watch(currentTab, id => {
  if (route.query.tab === id) return
  router.replace({query: {...route.query, tab: id}})
})

watch(() => route.query.tab, q => {
  if (typeof q === 'string' && q !== currentTab.value && tabs.some(t => t.id === q)) currentTab.value = q as TabId
})

// --- 타입 정의 ---
interface StatItem {
  moduleId: string
  useCount: number
  likeCount: number
  failCount: number
}

interface UserItem {
  id: number
  provider: string
  nickname: string
  email: string
  createdAt: string
  theftEventCount: number
  status: 'ACTIVE' | 'SUSPENDED'
}

interface JobItem {
  id: string
  moduleId: string
  lane: string
  status: string
  createdAt: string
}

interface SuggestionItem {
  id: number
  content: string
  createdAt: string
}

interface CommentItem {
  id: number
  moduleId: string
  content: string
  createdAt: string
}

interface ActionLogItem {
  id: number
  actionType: string
  targetId: number
  performedAt: string
}

interface CommentReportItem {
  id: number
  commentId: number
  commentContent: string
  reason: string
  detail: string | null
  status: string
  reporterId: number
  reporterNickname: string | null
  createdAt: string
}

interface CommentReportUserAggregateItem {
  userId: number
  nickname: string
  totalCount: number
  reasonCounts: Record<string, number>
}

// --- 대시보드 차트(118) ---
interface QueueDepthItem {
  pending: number
  running: number
  threshold: number
}

interface DailyJobCountItem {
  date: string
  doneCount: number
  failCount: number
}

interface DailySignupItem {
  date: string
  count: number
}

interface DashboardStats {
  providerDistribution: {provider: string; count: number}[]
  heavyQueue: QueueDepthItem
  videoQueue: QueueDepthItem
  dailyJobCounts: DailyJobCountItem[]
  dailySignups: DailySignupItem[]
}

// 가입경로는 항상 이 고정 순서로 도넛에 넘긴다 — 값 크기로 재정렬하면 카테고리 색이
// 순위를 따라 뒤바뀐다(dataviz: 색은 항목을 따라가지, 순위를 따라가지 않는다).
const PROVIDER_ORDER = ['GOOGLE', 'KAKAO'] as const
const PROVIDER_LABELS: Record<string, string> = {GOOGLE: 'Google', KAKAO: 'Kakao'}

// 관리자 액션 타입도 마찬가지로 항상 고정 인덱스를 쓴다 — 이 로그 페이지에 어떤 액션이
// 나타나는지와 무관하게 같은 액션은 항상 같은 색이어야 한다.
const ACTION_TYPE_ORDER = ['FORCE_LOGOUT', 'COMMENT_DELETE', 'MEMBER_SUSPEND', 'MEMBER_UNSUSPEND', 'ACCOUNT_FORCE_DELETE'] as const
const ACTION_TYPE_LABELS: Record<string, string> = {
  FORCE_LOGOUT: '강제 로그아웃',
  COMMENT_DELETE: '댓글 삭제',
  MEMBER_SUSPEND: '회원 정지',
  MEMBER_UNSUSPEND: '정지 해제',
  ACCOUNT_FORCE_DELETE: '계정 강제삭제',
}

// --- 상태 변수 ---
const stats = ref<StatItem[]>([])
const dashboardStats = ref<DashboardStats | null>(null)

const users = ref<UserItem[]>([])
const searchQuery = ref('')
const searchInput = ref('')
const usersPage = ref(0)
const totalPages = ref(0)
const totalUsers = ref(0)

const jobs = ref<JobItem[]>([])
const suggestions = ref<SuggestionItem[]>([])
// 댓글 관리 미리보기(최근 N개) — 시스템 전체 댓글은 무제한이라 이 배열엔 절대 전체를 담지 않는다.
const comments = ref<CommentItem[]>([])
const actionLogs = ref<ActionLogItem[]>([])
const COMMENTS_PREVIEW_SIZE = 5

// 댓글 전체보기 모달 전용 상태 — 미리보기와 별개 페이지네이션(유저 목록과 같은 20개/페이지).
const COMMENTS_MODAL_PAGE_SIZE = 20
const commentsModalOpen = ref(false)
const commentsModalItems = ref<CommentItem[]>([])
const commentsModalPage = ref(0)
const commentsModalTotalPages = ref(0)
const commentsModalTotalElements = ref(0)

const commentReports = ref<CommentReportItem[]>([])
const reportStatusFilter = ref('')
const reportReasonFilter = ref('')
const reportUserAggregates = ref<CommentReportUserAggregateItem[]>([])
// 커뮤니티 관리 탭(161)은 소스가 3개(건의사항/댓글 미리보기/신고 개별)라 특정 배열의
// .length === 0만으로는 "첫 방문 여부"를 정확히 판단할 수 없다 — 전용 플래그로 가드한다.
const communityLoaded = ref(false)

// --- 대시보드 차트 파생 데이터(118) ---
// 순수 파생 로직은 adminStatsDerivations.ts로 분리해 단위 테스트한다(161) — 여기서는 이미 불러온
// stats/모듈 레지스트리를 그 함수들에 연결하기만 한다.
const moduleUsageChartData = computed(() => moduleUsageChartDataOf(stats.value, moduleNameFor))

// "모듈 통계" 표(161 이후 라운드) — 예전엔 별도 "모듈별 실패율 랭킹" 미니 표였으나 이 표로
// 합쳤다. FAILABLE_MODULE_IDS는 정적 레지스트리 파생값이라 매 렌더마다 재계산할 필요 없이 한 번만 계산한다.
const FAILABLE_MODULE_IDS = allFailableModuleIds()
const statsSortKey = ref<ModuleStatsSortKey>('failRate')
const statsSortDir = ref<'asc' | 'desc'>('desc')
const moduleStatsRows = computed(() => mergedModuleStatsRows(stats.value, moduleNameFor, moduleCanFail, FAILABLE_MODULE_IDS))
const sortedModuleStatsRows = computed(() => sortModuleStatsRows(moduleStatsRows.value, statsSortKey.value, statsSortDir.value))

function setStatsSort(key: ModuleStatsSortKey) {
  if (statsSortKey.value === key) {
    statsSortDir.value = statsSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    statsSortKey.value = key
    statsSortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

function statsSortIndicator(key: ModuleStatsSortKey): string {
  if (statsSortKey.value !== key) return ''
  return statsSortDir.value === 'asc' ? ' ▲' : ' ▼'
}

// "구역별 사용량 분포"(161) — stats를 모듈 레지스트리의 zones[0](ADR-0030)과 조인해 구역별 useCount 합산.
const zoneUsageDonutChartData = computed(() => zoneUsageDonutData(stats.value, moduleZoneFor))

const providerDonutData = computed(() => {
  const byProvider = new Map(dashboardStats.value?.providerDistribution.map(d => [d.provider, d.count]) ?? [])
  return PROVIDER_ORDER.map(p => ({label: PROVIDER_LABELS[p], value: byProvider.get(p) ?? 0}))
})

const dailySignupChartData = computed(() =>
    (dashboardStats.value?.dailySignups ?? []).map(d => ({date: d.date, value: d.count})))

const actionLogTimelineItems = computed<TimelineItem[]>(() =>
    actionLogs.value.map(log => ({
      id: log.id,
      label: ACTION_TYPE_LABELS[log.actionType] ?? log.actionType,
      detail: `대상 ID ${log.targetId}`,
      date: log.performedAt,
      colorIndex: Math.max(0, ACTION_TYPE_ORDER.indexOf(log.actionType as typeof ACTION_TYPE_ORDER[number])),
    })))

const actionLogLegend = computed<TimelineLegendEntry[]>(() =>
    ACTION_TYPE_ORDER.map((type, i) => ({label: ACTION_TYPE_LABELS[type], colorIndex: i})))

// --- 인증 ---
async function login() {
  loginError.value = ''
  authHeader = 'Basic ' + btoa(`${username.value}:${password.value}`)
  try {
    await apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
    sessionStorage.setItem('admin_auth', authHeader)
    authed.value = true
    switchTab(currentTab.value)
  } catch {
    loginError.value = '인증 실패. 사용자명과 비밀번호를 확인하세요.'
  }
}

// --- 탭 전환 및 데이터 로드 ---
function switchTab(tab: TabId) {
  currentTab.value = tab
  if (tab === 'stats' && stats.value.length === 0) loadStats()
  if (tab === 'stats' && dashboardStats.value === null) loadDashboardStats()
  if (tab === 'users' && users.value.length === 0) loadUsers()
  // 댓글신고 유저별 누적(056 정지 판단용)은 유저 관리 탭 소속 — 유저 목록과 독립된 소스라 별도 가드.
  if (tab === 'users' && reportUserAggregates.value.length === 0) loadReportUserAggregates()
  if (tab === 'jobQueue' && jobs.value.length === 0) loadJobQueue()
  // 커뮤니티 관리는 건의사항/댓글 미리보기/댓글신고 개별목록, 총 3개의 독립된 소스를 한 번에
  // 불러온다 — 그중 하나(예: 건의사항)만 비어 있는 상태로 잘못 판단하지 않도록 전용 플래그로 첫 방문만 가드한다.
  if (tab === 'community' && !communityLoaded.value) loadCommunity()
  if (tab === 'auditLog' && actionLogs.value.length === 0) loadActionLogs()
}

async function loadStats() {
  try {
    const res = await apiClient.get<StatItem[]>('/admin/stats', {headers: {Authorization: authHeader}})
    stats.value = res.data
  } catch (e) {
    console.error('Failed to load stats', e)
  }
}

async function loadDashboardStats() {
  try {
    const res = await apiClient.get<DashboardStats>('/admin/stats/dashboard', {headers: {Authorization: authHeader}})
    dashboardStats.value = res.data
  } catch (e) {
    console.error('Failed to load dashboard stats', e)
  }
}

async function refreshStatsTab() {
  await Promise.all([loadStats(), loadDashboardStats()])
}

// --- 큐 적체 게이지 폴링(161 3라운드) — 큐 적체는 관리자가 확인하는 신호 중 가장 시간에 민감해서,
// 통계 탭이 열려 있는 동안은 수동 새로고침 없이도 주기적으로 갱신한다. 웹소켓 같은 실시간 인프라
// 대신 폴링을 쓰기로 확정(저트래픽 관리자 화면이라 그 정도로 충분하다는 판단). 탭을 벗어나거나
// 컴포넌트가 언마운트되면 반드시 인터벌을 정리해 백그라운드에서 계속 도는 걸 막는다.
const DASHBOARD_POLL_INTERVAL_MS = 5000
let dashboardPollTimer: ReturnType<typeof setInterval> | null = null

function stopDashboardPolling() {
  if (dashboardPollTimer !== null) {
    clearInterval(dashboardPollTimer)
    dashboardPollTimer = null
  }
}

function startDashboardPolling() {
  stopDashboardPolling()
  dashboardPollTimer = setInterval(() => {
    loadDashboardStats()
  }, DASHBOARD_POLL_INTERVAL_MS)
}

const isDashboardPollActive = computed(() => authed.value && currentTab.value === 'stats')
watch(isDashboardPollActive, active => {
  if (active) startDashboardPolling()
  else stopDashboardPolling()
}, {immediate: true})

onUnmounted(stopDashboardPolling)

// --- 새로고침 버튼 로딩 표시(161 3라운드) — 클릭해도 아무 시각적 반응이 없어 "눌린 게 맞나" 헷갈린다는
// 피드백. 데이터가 바뀌지 않아도(재조회 결과가 이전과 같아도) 최소한 "지금 로딩 중이다"는 알 수 있게
// 모든 새로고침 버튼에 공용 헬퍼로 스피너/비활성화 상태를 통일해서 넣는다.
async function withLoading(loadingRef: {value: boolean}, run: () => Promise<void>) {
  loadingRef.value = true
  try {
    await run()
  } finally {
    loadingRef.value = false
  }
}

const dashboardSummaryLoading = ref(false)
const moduleStatsLoading = ref(false)
const jobQueueLoading = ref(false)
const reportAggregatesLoading = ref(false)
const commentReportsLoading = ref(false)
const actionLogsLoading = ref(false)

function onRefreshDashboardSummary() {
  return withLoading(dashboardSummaryLoading, refreshStatsTab)
}

function onRefreshModuleStats() {
  return withLoading(moduleStatsLoading, loadStats)
}

function onRefreshJobQueue() {
  return withLoading(jobQueueLoading, loadJobQueue)
}

function onRefreshReportAggregates() {
  return withLoading(reportAggregatesLoading, loadReportUserAggregates)
}

function onRefreshCommentReports() {
  return withLoading(commentReportsLoading, loadCommentReports)
}

function onRefreshActionLogs() {
  return withLoading(actionLogsLoading, loadActionLogs)
}

async function loadUsers() {
  try {
    const q = encodeURIComponent(searchQuery.value)
    const p = usersPage.value
    const res = await apiClient.get(`/admin/users?search=${q}&page=${p}&size=20`, {headers: {Authorization: authHeader}})
    users.value = res.data.content
    totalPages.value = res.data.totalPages
    totalUsers.value = res.data.totalElements
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

function onSearch() {
  searchQuery.value = searchInput.value
  usersPage.value = 0
  loadUsers()
}

function changePage(newPage: number) {
  usersPage.value = newPage
  loadUsers()
}

// --- 되돌릴 수 있는 관리자 액션(강제 로그아웃·정지·정지해제) 공용 확인 모달 ---
// 브라우저 기본 confirm()은 스타일을 못 입혀 다른 화면과 이질감이 크다 — 계정 삭제(100)의 자체
// 모달과 같은 톤으로 통일하되, 액션마다 모달을 새로 만들지 않도록 제목·설명·버튼만 갈아끼운다.
interface ConfirmAction {
  title: string
  description: string
  confirmLabel: string
  variant: 'destructive' | 'default'
  run: () => Promise<boolean>
}

const confirmAction = ref<ConfirmAction | null>(null)
const confirmActionRunning = ref(false)

async function runConfirmAction() {
  if (!confirmAction.value) return
  confirmActionRunning.value = true
  try {
    const succeeded = await confirmAction.value.run()
    if (succeeded) confirmAction.value = null
  } finally {
    confirmActionRunning.value = false
  }
}

// 세 액션(강제 로그아웃·정지·정지해제) 모두 "POST 후 실패하면 alert"라는 같은 모양이라 한 곳에 둔다.
async function postAdminAction(url: string, failMessage: string): Promise<boolean> {
  try {
    await apiClient.post(url, {}, {headers: {Authorization: authHeader}})
    return true
  } catch (e) {
    alert(failMessage)
    console.error(e)
    return false
  }
}

function forceLogoutUser(id: number, nickname: string) {
  confirmAction.value = {
    title: `'${nickname}'(ID:${id}) 유저를 강제 로그아웃 하시겠습니까?`,
    description: '이 작업은 즉시 모든 기기에서 토큰을 만료시킵니다.',
    confirmLabel: '강제 로그아웃',
    variant: 'destructive',
    run: async () => {
      const succeeded = await postAdminAction(`/admin/users/${id}/force-logout`, '로그아웃 처리에 실패했습니다.')
      if (succeeded) alert('성공적으로 강제 로그아웃 되었습니다.')
      return succeeded
    },
  }
}

// 회원 정지(056) — 댓글 작성만 막는다, 로그인·좋아요는 그대로. 계정 삭제(100)와 달리 되돌릴 수
// 있는 조치라 비가역 경고 문구까지는 필요 없고, 위 공용 모달로 충분하다.
function suspendUser(id: number, nickname: string) {
  confirmAction.value = {
    title: `'${nickname}'(ID:${id}) 유저를 정지하시겠습니까?`,
    description: '정지되면 댓글 작성이 막힙니다. 로그인·좋아요는 그대로 가능하며, 언제든 다시 해제할 수 있습니다.',
    confirmLabel: '정지',
    variant: 'destructive',
    run: async () => {
      const succeeded = await postAdminAction(`/admin/users/${id}/suspend`, '정지 처리에 실패했습니다.')
      if (succeeded) await loadUsers()
      return succeeded
    },
  }
}

function unsuspendUser(id: number, nickname: string) {
  confirmAction.value = {
    title: `'${nickname}'(ID:${id}) 유저의 정지를 해제하시겠습니까?`,
    description: '해제하면 즉시 댓글 작성이 다시 가능해집니다.',
    confirmLabel: '정지 해제',
    variant: 'default',
    run: async () => {
      const succeeded = await postAdminAction(`/admin/users/${id}/unsuspend`, '정지 해제에 실패했습니다.')
      if (succeeded) await loadUsers()
      return succeeded
    },
  }
}

// --- 계정 강제 삭제(100) ---
// 되돌릴 수 없는 가장 파괴적인 관리자 액션이라 브라우저 confirm() 대신 자체 모달로 오조작을 막는다.
const showDeleteUserModal = ref(false)
const isDeletingUser = ref(false)
const deleteUserTarget = ref<{id: number; nickname: string} | null>(null)

function openDeleteUserModal(id: number, nickname: string) {
  deleteUserTarget.value = {id, nickname}
  showDeleteUserModal.value = true
}

async function confirmDeleteUser() {
  if (!deleteUserTarget.value) return
  isDeletingUser.value = true
  try {
    await apiClient.delete(`/admin/users/${deleteUserTarget.value.id}`, {headers: {Authorization: authHeader}})
    showDeleteUserModal.value = false
    await loadUsers()
  } catch (e) {
    alert('계정 삭제에 실패했습니다 — 네트워크 연결 및 관리자 권한을 확인한 뒤 다시 시도해 주세요.')
    console.error(e)
  } finally {
    isDeletingUser.value = false
  }
}

// --- 작업 큐 탭 ---
async function loadJobQueue() {
  try {
    const res = await apiClient.get<JobItem[]>('/admin/jobs?status=PENDING,RUNNING', {headers: {Authorization: authHeader}})
    jobs.value = res.data
  } catch (e) {
    console.error('Failed to load jobs', e)
  }
}

// --- 커뮤니티 관리 탭 ---
async function loadCommunity() {
  try {
    const res = await apiClient.get<SuggestionItem[]>('/admin/suggestions', {headers: {Authorization: authHeader}})
    suggestions.value = res.data
  } catch (e) {
    console.error('Failed to load suggestions', e)
  }
  await Promise.allSettled([loadCommentsPreview(), loadCommentReports()])
  communityLoaded.value = true
}

// --- 댓글 관리(미리보기 + 전체보기 모달) ---
// 시스템 전체 댓글은 무제한으로 쌓일 수 있어(백엔드 findAll() 무제한 반환 이슈 수정) 커뮤니티
// 관리 탭에는 최근 몇 개만 미리보기로 불러온다. 전체 목록은 모달을 열 때만 별도 로드한다.
async function loadCommentsPreview() {
  try {
    const res = await apiClient.get(`/admin/comments?page=0&size=${COMMENTS_PREVIEW_SIZE}`, {headers: {Authorization: authHeader}})
    comments.value = res.data.content
  } catch (e) {
    console.error('Failed to load comments preview', e)
  }
}

function openCommentsModal() {
  commentsModalOpen.value = true
  commentsModalPage.value = 0
  loadCommentsModalPage()
}

async function loadCommentsModalPage() {
  try {
    const res = await apiClient.get(
        `/admin/comments?page=${commentsModalPage.value}&size=${COMMENTS_MODAL_PAGE_SIZE}`,
        {headers: {Authorization: authHeader}},
    )
    commentsModalItems.value = res.data.content
    commentsModalTotalPages.value = res.data.totalPages
    commentsModalTotalElements.value = res.data.totalElements
  } catch (e) {
    console.error('Failed to load comments modal page', e)
  }
}

function changeCommentsModalPage(newPage: number) {
  commentsModalPage.value = newPage
  loadCommentsModalPage()
}

// --- 댓글 신고(099) ---
async function loadCommentReports() {
  try {
    const params = new URLSearchParams()
    if (reportStatusFilter.value) params.set('status', reportStatusFilter.value)
    if (reportReasonFilter.value) params.set('reason', reportReasonFilter.value)
    const res = await apiClient.get(`/admin/comment-reports?${params.toString()}`, {headers: {Authorization: authHeader}})
    commentReports.value = res.data.content
  } catch (e) {
    console.error('Failed to load comment reports', e)
  }
}

async function loadReportUserAggregates() {
  try {
    const res = await apiClient.get<CommentReportUserAggregateItem[]>('/admin/comment-reports/users', {headers: {Authorization: authHeader}})
    reportUserAggregates.value = res.data
  } catch (e) {
    console.error('Failed to load comment report user aggregates', e)
  }
}

async function updateReportStatus(id: number, status: string) {
  try {
    await apiClient.patch(`/admin/comment-reports/${id}/status`, {status}, {headers: {Authorization: authHeader}})
    await Promise.allSettled([loadCommentReports(), loadReportUserAggregates()])
  } catch (e) {
    alert('상태 변경에 실패했습니다 — 네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
    console.error('Failed to update comment report status', e)
  }
}

async function loadActionLogs() {
  try {
    const res = await apiClient.get('/admin/action-logs', {headers: {Authorization: authHeader}})
    actionLogs.value = res.data.content
  } catch (e) {
    console.error('Failed to load action logs', e)
  }
}

// resolveReportId를 넘기면(댓글 신고 목록에서 호출), 삭제 성공 시 그 신고를 RESOLVED로 자동 전환한다 —
// 관리자가 삭제 후 별도로 확인완료를 또 누를 필요가 없다. 삭제 실패 시에는 상태를 건드리지 않는다.
async function deleteComment(id: number, resolveReportId?: number) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await apiClient.delete(`/admin/comments/${id}`, {headers: {Authorization: authHeader}})
  } catch {
    alert('댓글 삭제에 실패했습니다 — 네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
    return
  }

  // 미리보기는 페이지네이션된 목록이라 단순 splice로는 totalElements·다음 페이지 경계가 어긋난다 —
  // 유저 목록·신고 목록과 같은 방식으로 재조회한다. 모달이 열려 있으면 현재 보던 페이지도 같이 갱신.
  await loadCommentsPreview()
  if (commentsModalOpen.value) await loadCommentsModalPage()

  if (resolveReportId != null) {
    try {
      await apiClient.patch(`/admin/comment-reports/${resolveReportId}/status`, {status: 'RESOLVED'}, {headers: {Authorization: authHeader}})
    } catch (e) {
      console.error('Failed to auto-resolve report status after comment delete', e)
      // 댓글 삭제 자체는 이미 성공했으니 "삭제 실패"로 오인하지 않도록 별도 메시지로 알린다.
      alert('댓글은 삭제됐으나 신고 상태 자동 처리에 실패했습니다 — 목록에서 직접 확인완료 처리해 주세요.')
    }
    await Promise.allSettled([loadCommentReports(), loadReportUserAggregates()])
  }
}

function formatDate(dt: string): string {
  if (!dt) return ''
  const date = new Date(dt)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 컴포넌트 마운트 시 세션 스토리지에 인증 정보가 있으면 자동 로그인 시도
if (authHeader) {
  apiClient.get('/admin/stats', {headers: {Authorization: authHeader}})
      .then(() => {
        authed.value = true
        switchTab(currentTab.value)
      })
      .catch(() => {
        // 토큰이 유효하지 않으면 삭제
        sessionStorage.removeItem('admin_auth')
        authHeader = ''
      })
      .finally(() => {
        checkingAuth.value = false
      })
}
</script>
