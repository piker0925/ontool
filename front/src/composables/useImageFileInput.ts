import {ref} from 'vue'

/** 이미지 파일 업로드 입력을 로드해 HTMLImageElement로 만드는 공용 로직. 도구별로 호출해 독립된 상태를 얻는다. */
export function useImageFileInput() {
    const imageEl = ref<HTMLImageElement | null>(null)
    const fileName = ref('')
    const error = ref('')

    function loadFile(file: File) {
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

    // 145: UploadDropzone이 클릭·드래그앤드롭 두 경로 모두 File[]로 emit하므로, DOM 이벤트가 아니라
    // File을 직접 받는 진입점 하나만 있으면 된다(이전엔 change 이벤트 전용 onFileChange가 따로 있었으나
    // UploadDropzone 도입 이후 모든 소비자가 이 진입점만 쓰게 되어 제거함).
    function onFilesSelected(files: File[]) {
        const file = files[0]
        if (!file) return
        loadFile(file)
    }

    return {imageEl, fileName, error, onFilesSelected}
}
