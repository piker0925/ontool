import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { apiClient } from '../api/client'
import { toast } from 'vue-sonner'
import { syncPersonalization } from './usePersonalizationSync'

// 토큰 상태 (localStorage 자동 동기화)
export const accessToken = useStorage<string | null>('dtk_access', null)
export const refreshToken = useStorage<string | null>('dtk_refresh', null)

interface User {
  id: number
  provider: 'GOOGLE' | 'KAKAO'
  nickname: string
  email: string | null
  createdAt: string
}

export const user = ref<User | null>(null)
const isLoading = ref(false)

export function useAuth() {
  const isLoggedIn = computed(() => !!accessToken.value)

  function loginWithGoogle() {
    window.location.href = `${apiClient.defaults.baseURL}/oauth2/authorization/google`
  }

  function loginWithKakao() {
    window.location.href = `${apiClient.defaults.baseURL}/oauth2/authorization/kakao`
  }

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
  }

  function clearTokens() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
  }

  async function fetchUser() {
    if (!accessToken.value) return
    try {
      isLoading.value = true
      const { data } = await apiClient.get<User>('/api/v1/users/me')
      user.value = data
      await syncPersonalization()
    } catch (e) {
      // 401 처리는 interceptor가 하므로, 여기서는 그냥 초기화
      if (!accessToken.value) {
        user.value = null
      }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    if (!accessToken.value) return
    try {
      await apiClient.post('/api/v1/auth/logout', { refreshToken: refreshToken.value })
    } catch (e) {
      // 로그아웃 실패해도 프론트엔드는 토큰 파기
    } finally {
      clearTokens()
      toast.success('로그아웃 되었습니다.')
      window.location.href = '/'
    }
  }

  async function updateNickname(nickname: string) {
    if (!user.value) return
    try {
      const { data } = await apiClient.patch<User>('/api/v1/users/me', { nickname })
      user.value = data
      toast.success('닉네임이 변경되었습니다.')
    } catch (e: any) {
      if (e.response?.data?.message) {
        toast.error(e.response.data.message)
      } else {
        toast.error('닉네임 변경에 실패했습니다.')
      }
      throw e
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
    isLoggedIn,
    isLoading,
    loginWithGoogle,
    loginWithKakao,
    setTokens,
    clearTokens,
    fetchUser,
    logout,
    updateNickname,
  }
}
