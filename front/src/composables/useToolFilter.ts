import {computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'

export function useToolFilter() {
    const route = useRoute()
    const router = useRouter()

    const activeCategory = computed(() => (route.query.category as string | undefined) ?? null)

    function setCategory(cat: string | null) {
        router.push({path: '/', query: cat ? {category: cat} : {}})
    }

    return {activeCategory, setCategory}
}
