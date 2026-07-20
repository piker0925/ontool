import {ref} from 'vue'

/** 이미지 파일 업로드 입력을 로드해 HTMLImageElement로 만드는 공용 로직. 도구별로 호출해 독립된 상태를 얻는다. */
export function useImageFileInput() {
    const fileInput = ref<HTMLInputElement | null>(null)
    const imageEl = ref<HTMLImageElement | null>(null)
    const fileName = ref('')
    const error = ref('')

    function onFileChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const img = new Image()
        img.onload = () => {
            imageEl.value = img
            fileName.value = file.name
            error.value = ''
        }
        img.onerror = () => {
            error.value = '이미지를 불러오지 못했습니다'
        }
        img.src = URL.createObjectURL(file)
    }

    return {fileInput, imageEl, fileName, error, onFileChange}
}
