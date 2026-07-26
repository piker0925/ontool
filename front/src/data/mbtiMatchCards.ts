import {MBTI_TYPES} from './mbtiTypes'

export interface MbtiMatchCard {
    type: string
    nickname: string
    animal: string
    animalReason: string
    food: string
    color: string
    colorHex: string
    job: string
    quote: string
}

/** 16유형 매칭 카드 — 동물/음식/색깔/직업 등 정적 데이터. 밈 톤, 유형 비하 없이. */
export const MBTI_MATCH_CARDS: readonly MbtiMatchCard[] = [
    {
        type: 'ISTJ', nickname: '만사형통 관리자', animal: '비버', animalReason: '부지런히 둑을 쌓듯 계획대로 착착 해내는 완벽주의',
        food: '집밥 백반 정식', color: '네이비', colorHex: '#1e3a5f', job: '회계사 · 공무원',
        quote: '계획에 없는 일은 일단 보류입니다',
    },
    {
        type: 'ISFJ', nickname: '헌신적인 수호자', animal: '골든리트리버', animalReason: '곁에 있는 사람을 조용히 챙기는 다정함',
        food: '엄마표 집밥', color: '세이지그린', colorHex: '#87a878', job: '간호사 · 사회복지사',
        quote: '네가 편해야 나도 편해',
    },
    {
        type: 'INFJ', nickname: '신비주의 예언자', animal: '올빼미', animalReason: '조용히 관찰하다 핵심만 짚어내는 통찰력',
        food: '향 좋은 허브차', color: '딥퍼플', colorHex: '#4b2e6e', job: '상담사 · 작가',
        quote: '겉은 조용, 속은 우주만큼 복잡함',
    },
    {
        type: 'INTJ', nickname: '전략의 화신', animal: '늑대', animalReason: '무리보다 자기만의 판단으로 움직이는 독립성',
        food: '심플한 오마카세', color: '차콜', colorHex: '#36454f', job: '전략기획 · 개발자',
        quote: '계획 B까지 이미 세워뒀음',
    },
    {
        type: 'ISTP', nickname: '만능 손재주꾼', animal: '표범', animalReason: '평소엔 조용하다가 필요할 때 정확하게 움직이는 기민함',
        food: '캠핑장 즉석요리', color: '카키', colorHex: '#78866b', job: '엔지니어 · 정비사',
        quote: '말보다 실물로 증명함',
    },
    {
        type: 'ISFP', nickname: '자유로운 예술혼', animal: '사슴', animalReason: '숲속을 유유히 거니는 온화하고 자유로운 분위기',
        food: '감성 브런치', color: '라벤더', colorHex: '#b19cd9', job: '디자이너 · 아티스트',
        quote: '분위기가 반, 감성이 반',
    },
    {
        type: 'INFP', nickname: '순정 몽상가', animal: '토끼', animalReason: '여리지만 자기만의 세계가 확고한 몽상가',
        food: '달콤한 디저트', color: '파스텔핑크', colorHex: '#f4c2c2', job: '작가 · 콘텐츠 기획자',
        quote: '머릿속 소설이 벌써 3부작',
    },
    {
        type: 'INTP', nickname: '논리 탐구자', animal: '미어캣', animalReason: '고개만 빼꼼 내밀고 세상을 관찰·분석하는 탐구욕',
        food: '심야 라면', color: '슬레이트그레이', colorHex: '#708090', job: '연구원 · 개발자',
        quote: '그거 왜 그런지 알아봤어',
    },
    {
        type: 'ESTP', nickname: '즉흥의 아이콘', animal: '치타', animalReason: '생각보다 몸이 먼저 튀어나가는 순발력',
        food: '길거리 음식 총집합', color: '레드', colorHex: '#c0392b', job: '세일즈 · 스포츠 선수',
        quote: '일단 몸부터 움직이고 봄',
    },
    {
        type: 'ESFP', nickname: '무대 위 인싸', animal: '앵무새', animalReason: '어딜 가든 시선을 사로잡는 화려한 존재감',
        food: '파티 핑거푸드', color: '옐로우', colorHex: '#e8b923', job: '방송인 · 이벤트 기획자',
        quote: '오늘의 무대는 접니다',
    },
    {
        type: 'ENFP', nickname: '자유로운 영혼', animal: '웰시코기', animalReason: '짧은 다리로도 어디든 신나게 뛰어다니는 에너지',
        food: '메뉴판 이것저것 다 시켜보기', color: '코랄', colorHex: '#ff7f50', job: '마케터 · 크리에이터',
        quote: '그거 완전 제 얘기인데요?',
    },
    {
        type: 'ENTP', nickname: '악마의 변호사', animal: '여우', animalReason: '재치와 임기응변으로 상황을 뒤집는 영리함',
        food: '매운맛 챌린지', color: '오렌지', colorHex: '#e07b2f', job: '변호사 · 사업가',
        quote: '반박하고 싶어서 손이 근질근질',
    },
    {
        type: 'ESTJ', nickname: '타고난 관리자', animal: '사자', animalReason: '무리를 이끌고 질서를 잡는 타고난 통솔력',
        food: '정석대로 끓인 찌개', color: '버건디', colorHex: '#7b1e2b', job: '경영자 · 군인',
        quote: '규칙은 지키라고 있는 겁니다',
    },
    {
        type: 'ESFJ', nickname: '분위기 지킴이', animal: '꿀벌', animalReason: '부지런히 주변을 챙기며 공동체를 돌보는 성실함',
        food: '다 같이 나눠먹는 배달음식', color: '피치', colorHex: '#ffcba4', job: '이벤트 플래너 · 교사',
        quote: '다들 밥은 먹었어?',
    },
    {
        type: 'ENFJ', nickname: '타고난 리더', animal: '코끼리', animalReason: '무리 전체를 살피고 이끄는 따뜻한 리더십',
        food: '정성 들인 홈파티 요리', color: '에메랄드', colorHex: '#2e8b57', job: '교육자 · HR',
        quote: '네 얘기 좀 더 해줘',
    },
    {
        type: 'ENTJ', nickname: '타고난 사령관', animal: '독수리', animalReason: '높은 곳에서 전체를 조망하고 목표를 향해 직진하는 추진력',
        food: '스테이크 풀코스', color: '딥블루', colorHex: '#1a3c6e', job: 'CEO · 컨설턴트',
        quote: '그래서 결론이 뭔데?',
    },
]

if (MBTI_MATCH_CARDS.length !== MBTI_TYPES.length) {
    throw new Error('MBTI_MATCH_CARDS는 MBTI_TYPES의 16유형을 정확히 1개씩 포함해야 합니다.')
}
