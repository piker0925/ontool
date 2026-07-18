import {ref} from 'vue'
import {apiClient} from '../api/client'

const STORAGE_KEY = 'devtoolbox-recent'
const MAX_RECENT = 6

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
const isAuthed = () => !!localStorage.getItem('dtk_access')

export function useRecentTools() {
    return {
        recentIds: ids,
        async record(id: string) {
            ids.value = [id, ...ids.value.filter(i => i !== id)].slice(0, MAX_RECENT)
            localStorage.setItem(getStorageKey(), JSON.stringify(ids.value))

            if (isAuthed()) {
                try {
                    await apiClient.post(`/api/v1/users/me/personalization/recent-tools/${id}`)
                } catch (e) {
                    console.error('Failed to sync recent tool', e)
                }
            }
        },
        syncFromServer(newIds: string[]) {
            ids.value = newIds
            localStorage.setItem(getStorageKey(), JSON.stringify(ids.value))
        }
    }
}
