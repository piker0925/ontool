import { useLocalStorage } from '@vueuse/core'

export function useViewMode() {
  const viewMode = useLocalStorage<'grid' | 'list'>('ontool-view-mode', 'grid')
  
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
  }
  
  return { viewMode, toggleViewMode }
}
