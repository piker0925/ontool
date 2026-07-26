import {diffLines, diffWords} from 'diff'

/** 단어 단위 하이라이트 조각 */
export interface WordSpan {
  text: string
  changed: boolean
}

export type DiffLineType = 'context' | 'add' | 'remove' | 'empty'

/** Side-by-side 한쪽 패널의 라인 */
export interface SideLine {
  type: DiffLineType
  lineNum: number | null
  text: string
  /** 변경 라인 쌍에 대해서만 채워지는 단어 단위 하이라이트 (없으면 null) */
  spans: WordSpan[] | null
}

/** Side-by-side 한 행 (좌: 원본, 우: 수정) */
export interface SideBySideRow {
  left: SideLine
  right: SideLine
  /** 변경 블록 번호 (0-base). 컨텍스트 행은 null */
  blockIndex: number | null
}

/** Inline 모드 한 라인 */
export interface InlineLine {
  type: 'context' | 'add' | 'remove'
  oldLineNum: number | null
  newLineNum: number | null
  text: string
  spans: WordSpan[] | null
  blockIndex: number | null
}

export interface DiffStats {
  addedLines: number
  removedLines: number
  blocks: number
  /** 0~100. 유지된 라인 / 두 문서 중 긴 쪽 라인 수 */
  similarity: number
}

/** Merged(합쳐보기) 모드의 조각 종류 */
export type MergedSpanType = 'context' | 'add' | 'remove'

/** Merged(합쳐보기) 모드 — 원본/변경본을 하나의 텍스트 흐름으로 합친 조각 */
export interface MergedSpan {
  text: string
  type: MergedSpanType
}

export interface DiffRenderModel {
  rows: SideBySideRow[]
  inline: InlineLine[]
  /** 원본·변경본을 한 텍스트 흐름으로 합친 word-level 조각 (합쳐보기 모드용) */
  merged: MergedSpan[]
  stats: DiffStats
  identical: boolean
}

export interface DiffRenderOptions {
  /** 변경 라인 쌍에 대한 단어 단위 diff 수행 여부 (대용량 성능 가드용) */
  wordDiff?: boolean
  /** 이 길이를 넘는 라인은 단어 diff 생략 */
  maxWordDiffLineLength?: number
}

/** 문서를 라인 배열로 분해 (빈 문서는 0라인, 마지막 개행 뒤 빈 문자열 제거) */
export function splitDocLines(value: string): string[] {
  if (value === '') return []
  const lines = value.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * 한 쌍의 remove/add 라인에 대해 diffWords를 한 번만 호출하고, 그 결과를
 * side-by-side용(left/right)과 merged(합쳐보기)용 표현으로 함께 파생시킨다.
 * (diff 알고리즘을 다시 구현하지 않고, 이미 쓰는 diffWords 결과를 재사용)
 */
function computeWordDiff(oldLine: string, newLine: string): { left: WordSpan[]; right: WordSpan[]; merged: MergedSpan[] } {
  const parts = diffWords(oldLine, newLine)
  const left: WordSpan[] = []
  const right: WordSpan[] = []
  const merged: MergedSpan[] = []
  for (const p of parts) {
    if (p.added) {
      right.push({text: p.value, changed: true})
      merged.push({text: p.value, type: 'add'})
    } else if (p.removed) {
      left.push({text: p.value, changed: true})
      merged.push({text: p.value, type: 'remove'})
    } else {
      left.push({text: p.value, changed: false})
      right.push({text: p.value, changed: false})
      merged.push({text: p.value, type: 'context'})
    }
  }
  return {left, right, merged}
}

/**
 * 원본/수정 텍스트를 받아 side-by-side, inline 렌더 모델과 통계를 생성한다.
 * 순수 함수 — DOM/Vue 의존 없음.
 */
export function buildDiffModel(
  original: string,
  revised: string,
  options: DiffRenderOptions = {},
): DiffRenderModel {
  const {wordDiff = true, maxWordDiffLineLength = 500} = options

  // 마지막 개행 유무가 라인 차이로 잡히지 않도록 정규화한다
  const normOriginal = original === '' || original.endsWith('\n') ? original : original + '\n'
  const normRevised = revised === '' || revised.endsWith('\n') ? revised : revised + '\n'
  const changes = diffLines(normOriginal, normRevised)
  const rows: SideBySideRow[] = []
  const inline: InlineLine[] = []
  const merged: MergedSpan[] = []

  let oldLn = 1
  let newLn = 1
  let addedLines = 0
  let removedLines = 0
  let blocks = 0
  let contextLines = 0

  let i = 0
  while (i < changes.length) {
    const c = changes[i]

    if (!c.added && !c.removed) {
      for (const text of splitDocLines(c.value)) {
        rows.push({
          left: {type: 'context', lineNum: oldLn, text, spans: null},
          right: {type: 'context', lineNum: newLn, text, spans: null},
          blockIndex: null,
        })
        inline.push({type: 'context', oldLineNum: oldLn, newLineNum: newLn, text, spans: null, blockIndex: null})
        merged.push({text: text + '\n', type: 'context'})
        oldLn++
        newLn++
        contextLines++
      }
      i++
      continue
    }

    // 변경 블록: 연속된 removed + added 를 하나로 묶는다
    let removed: string[] = []
    let added: string[] = []
    while (i < changes.length && (changes[i].added || changes[i].removed)) {
      const part = splitDocLines(changes[i].value)
      if (changes[i].removed) removed = removed.concat(part)
      else added = added.concat(part)
      i++
    }

    const blockIndex = blocks
    blocks++
    removedLines += removed.length
    addedLines += added.length

    const pairCount = Math.min(removed.length, added.length)
    const max = Math.max(removed.length, added.length)
    const leftSpansArr: (WordSpan[] | null)[] = []
    const rightSpansArr: (WordSpan[] | null)[] = []
    const mergedArr: (MergedSpan[] | null)[] = []

    for (let k = 0; k < max; k++) {
      const canWordDiff =
        wordDiff &&
        k < pairCount &&
        removed[k].length <= maxWordDiffLineLength &&
        added[k].length <= maxWordDiffLineLength
      if (canWordDiff) {
        const s = computeWordDiff(removed[k], added[k])
        leftSpansArr.push(s.left)
        rightSpansArr.push(s.right)
        mergedArr.push(s.merged)
      } else {
        leftSpansArr.push(null)
        rightSpansArr.push(null)
        mergedArr.push(null)
      }
    }

    // Merged(합쳐보기): 쌍이 되는 라인은 word-level로 교차, 그 외는 라인 전체를 remove/add로 표시
    for (let k = 0; k < max; k++) {
      const hasLeft = k < removed.length
      const hasRight = k < added.length
      const wordLevel = mergedArr[k]
      if (hasLeft && hasRight && wordLevel) {
        merged.push(...wordLevel)
        merged.push({text: '\n', type: 'context'})
      } else {
        if (hasLeft) merged.push({text: removed[k] + '\n', type: 'remove'})
        if (hasRight) merged.push({text: added[k] + '\n', type: 'add'})
      }
    }

    for (let k = 0; k < max; k++) {
      const hasLeft = k < removed.length
      const hasRight = k < added.length
      const left: SideLine = hasLeft
        ? {type: 'remove', lineNum: oldLn++, text: removed[k], spans: leftSpansArr[k]}
        : {type: 'empty', lineNum: null, text: '', spans: null}
      const right: SideLine = hasRight
        ? {type: 'add', lineNum: newLn++, text: added[k], spans: rightSpansArr[k]}
        : {type: 'empty', lineNum: null, text: '', spans: null}
      rows.push({left, right, blockIndex})
    }

    // Inline: 삭제 라인 전부 → 추가 라인 전부
    let inlineOldLn = oldLn - removed.length
    for (let k = 0; k < removed.length; k++) {
      inline.push({
        type: 'remove',
        oldLineNum: inlineOldLn + k,
        newLineNum: null,
        text: removed[k],
        spans: leftSpansArr[k] ?? null,
        blockIndex,
      })
    }
    let inlineNewLn = newLn - added.length
    for (let k = 0; k < added.length; k++) {
      inline.push({
        type: 'add',
        oldLineNum: null,
        newLineNum: inlineNewLn + k,
        text: added[k],
        spans: rightSpansArr[k] ?? null,
        blockIndex,
      })
    }
  }

  const totalMax = Math.max(contextLines + removedLines, contextLines + addedLines)
  const similarity = totalMax === 0 ? 100 : Math.round((contextLines / totalMax) * 100)

  return {
    rows,
    inline,
    merged,
    stats: {addedLines, removedLines, blocks, similarity},
    identical: blocks === 0,
  }
}
