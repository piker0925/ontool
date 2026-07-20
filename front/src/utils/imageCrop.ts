export interface Size {
    width: number
    height: number
}

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

/** 원본 안에 들어가는, 주어진 종횡비의 가장 큰 중앙 정렬 사각형을 계산한다. */
export function computeCenteredCropRect(source: Size, aspect: Size): Rect {
    const sourceRatio = source.width / source.height
    const targetRatio = aspect.width / aspect.height

    const width = sourceRatio > targetRatio ? source.height * targetRatio : source.width
    const height = sourceRatio > targetRatio ? source.height : source.width / targetRatio

    return {
        x: (source.width - width) / 2,
        y: (source.height - height) / 2,
        width,
        height,
    }
}

export interface SocialCropPreset {
    id: string
    label: string
    aspect: Size
}

export const SOCIAL_CROP_PRESETS: SocialCropPreset[] = [
    {id: 'instagram-square', label: '인스타그램 정사각형 게시물', aspect: {width: 1, height: 1}},
    {id: 'instagram-portrait', label: '인스타그램 세로 게시물', aspect: {width: 4, height: 5}},
    {id: 'instagram-story', label: '인스타그램 스토리', aspect: {width: 9, height: 16}},
    {id: 'twitter-post', label: 'X(트위터) 게시물', aspect: {width: 16, height: 9}},
    {id: 'facebook-cover', label: '페이스북 커버', aspect: {width: 205, height: 78}},
    {id: 'youtube-thumbnail', label: '유튜브 썸네일', aspect: {width: 16, height: 9}},
    {id: 'linkedin-banner', label: '링크드인 배너', aspect: {width: 4, height: 1}},
]
