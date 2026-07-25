import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncPersonalization } from './usePersonalizationSync'
import { apiClient } from '../api/client'
import { useFavorites } from './useFavorites'
import { useRecentTools } from './useRecentTools'
import { useLikes } from './useLikes'
import { user } from './useAuth'

const mockUser = {
  id: 1,
  provider: 'GOOGLE' as const,
  nickname: '테스터',
  email: 'tester@example.com',
  createdAt: '2026-01-01T00:00:00Z',
  status: 'ACTIVE' as const
}

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  }
}))

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('usePersonalizationSync', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    user.value = mockUser

    // Set up mock data
    const fav = useFavorites()
    const rec = useRecentTools()
    const likes = useLikes()
    fav.syncFromServer(['module-a'])
    rec.syncFromServer(['module-b'])
    likes.syncFromServer(['module-c'])
  })

  afterEach(() => {
    user.value = null
  })

  it('merges local storage on first run and fetches remote data', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} })
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        favorites: ['module-z'],
        recentTools: ['module-y'],
        likes: ['module-x']
      }
    })

    expect(localStorage.getItem(`dtk_merged_${mockUser.id}`)).toBeNull()

    await syncPersonalization()

    // 1. Check if merge POST was called with local data
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/me/personalization/merge', {
      favorites: ['module-a'],
      recentTools: ['module-b'],
      likes: ['module-c']
    })

    // 2. Check if the per-user merge flag is set
    expect(localStorage.getItem(`dtk_merged_${mockUser.id}`)).toBe('true')

    // 3. Check if GET was called
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users/me/personalization')

    // 4. Check if local states were updated from remote
    const fav = useFavorites()
    expect(fav.favoriteIds.value).toEqual(['module-z'])
  })

  it('skips merge POST if already merged, but still fetches remote data', async () => {
    localStorage.setItem(`dtk_merged_${mockUser.id}`, 'true')

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        favorites: ['module-z'],
        recentTools: [],
        likes: []
      }
    })

    await syncPersonalization()

    expect(apiClient.post).not.toHaveBeenCalled()
    expect(apiClient.get).toHaveBeenCalled()

    const fav = useFavorites()
    expect(fav.favoriteIds.value).toEqual(['module-z'])
  })
})
