import { apiClient } from '../api/client'
import { useFavorites } from './useFavorites'
import { useRecentTools } from './useRecentTools'
import { useLikes } from './useLikes'
import { user } from './useAuth'

export async function syncPersonalization() {
    const favorites = useFavorites()
    const recents = useRecentTools()
    const likes = useLikes()
    
    if (!user.value) return
    const mergeKey = `dtk_merged_${user.value.id}`
    
    // 로컬 스토리지 데이터 서버와 병합 (기기당 1회)
    if (localStorage.getItem(mergeKey) !== 'true') {
        try {
            await apiClient.post('/api/v1/users/me/personalization/merge', {
                favorites: favorites.favoriteIds.value,
                recentTools: recents.recentIds.value,
                likes: likes.likeIds?.value || [] // expose 안되어 있으면 접근 안되므로 우회, 하지만 수정했으니
            })
            localStorage.setItem(mergeKey, 'true')
        } catch (e) {
            console.error('Personalization merge failed', e)
        }
    }
    
    // 병합 결과 또는 최신 상태를 서버에서 당겨와서 로컬에 덮어쓰기
    try {
        const { data } = await apiClient.get('/api/v1/users/me/personalization')
        favorites.syncFromServer(data.favorites)
        recents.syncFromServer(data.recentTools)
        likes.syncFromServer(data.likes)
    } catch (e) {
        console.error('Fetch personalization failed', e)
    }
}
