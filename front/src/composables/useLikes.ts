import {computed, ref} from 'vue'

const STORAGE_KEY = 'devtoolbox-likes'

function getStorageKey(): string {
    return localStorage.getItem('dtk_access') ? STORAGE_KEY + '_auth' : STORAGE_KEY
}

function load(): string[] {
    try {
        return JSON.parse(localStorage.getItem(getStorageKey()) ?? '[]')
    } catch {
        return []
    }
}

const ids = ref<string[]>(load())
const idSet = computed(() => new Set(ids.value))

function persist() {
    localStorage.setItem(getStorageKey(), JSON.stringify(ids.value))
}

/** 브라우저 단위 좋아요 상태 — 도구당 1회 토글, 새로고침 후에도 유지 */
export function useLikes() {
    return {
        likeIds: ids,
        isLiked: (id: string) => idSet.value.has(id),
        markLiked(id: string) {
            if (!idSet.value.has(id)) {
                ids.value = [...ids.value, id]
                persist()
            }
        },
        markUnliked(id: string) {
            if (idSet.value.has(id)) {
                ids.value = ids.value.filter(i => i !== id)
                persist()
            }
        },
        syncFromServer(newIds: string[]) {
            ids.value = newIds
            persist()
        }
    }
}
