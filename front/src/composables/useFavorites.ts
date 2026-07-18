import {computed, ref} from 'vue'
import {apiClient} from '../api/client'

const STORAGE_KEY = 'devtoolbox-favorites'

function getStorageKey(): string {
    return localStorage.getItem('dtk_access') ? STORAGE_KEY + '_auth' : STORAGE_KEY
}

function load(): string[] {
    try {
        const stored = JSON.parse(localStorage.getItem(getStorageKey()) ?? '[]') as string[]
        return Array.isArray(stored) ? stored.sort() : []
    } catch {
        return []
    }
}

const ids = ref<string[]>(load())
const idSet = computed(() => new Set(ids.value))
const isAuthed = () => !!localStorage.getItem('dtk_access')

export function useFavorites() {
    return {
        favoriteIds: ids,
        isFavorite: (id: string) => idSet.value.has(id),
        async toggle(id: string) {
            const adding = !idSet.value.has(id)
            let newIds = adding
                ? [...ids.value, id]
                : ids.value.filter(i => i !== id)
            newIds.sort()
            ids.value = newIds
            localStorage.setItem(getStorageKey(), JSON.stringify(ids.value))

            if (isAuthed()) {
                try {
                    if (adding) {
                        await apiClient.post(`/api/v1/users/me/personalization/favorites/${id}`)
                    } else {
                        await apiClient.delete(`/api/v1/users/me/personalization/favorites/${id}`)
                    }
                } catch (e) {
                    console.error('Failed to sync favorite', e)
                }
            }
        },
        syncFromServer(newIds: string[]) {
            const sorted = [...newIds].sort()
            ids.value = sorted
            localStorage.setItem(getStorageKey(), JSON.stringify(ids.value))
        }
    }
}
