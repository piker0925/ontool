/** 궁합 계산에 쓰이는 3분류. */
export type MbtiCompatibilityCategory = 'romance' | 'friendship' | 'work'

export interface MbtiTypeInfo {
    type: string
    /** 밈스러운 한 줄 별명. */
    nickname: string
    /** 분류별 한 줄 특성 — 궁합 설명 템플릿에 삽입된다. */
    traits: Record<MbtiCompatibilityCategory, string>
}

/** MBTI 16유형. 문자열 순서 그대로 축(EI/SN/TF/JP) 인덱스로 쓰인다 — 순서를 바꾸지 말 것. */
export const MBTI_TYPES: readonly string[] = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

export const MBTI_TYPE_INFO: Record<string, MbtiTypeInfo> = {
    ISTJ: {
        type: 'ISTJ', nickname: '만사형통 관리자',
        traits: {romance: '계획적인 츤데레 사랑꾼', friendship: '한번 친구는 영원한 친구', work: '완벽한 일정 관리의 화신'},
    },
    ISFJ: {
        type: 'ISFJ', nickname: '헌신적인 수호자',
        traits: {romance: '조용히 다 챙겨주는 츤데레', friendship: '내 생일 절대 안 잊는 친구', work: '묵묵히 팀을 떠받치는 살림꾼'},
    },
    INFJ: {
        type: 'INFJ', nickname: '신비주의 예언자',
        traits: {romance: '한번 빠지면 영혼까지 진심', friendship: '깊은 대화 아니면 시작도 안 함', work: '비전은 있는데 회의는 싫어함'},
    },
    INTJ: {
        type: 'INTJ', nickname: '전략의 화신',
        traits: {romance: '연애도 장기 프로젝트로 접근', friendship: '적지만 진짜인 인맥 관리', work: '효율 안 나오면 못 참는 완벽주의'},
    },
    ISTP: {
        type: 'ISTP', nickname: '만능 손재주꾼',
        traits: {romance: '말보다 행동으로 보여주는 스타일', friendship: '불러도 안 오지만 필요할 땐 옴', work: '문제 터지면 조용히 해결해버림'},
    },
    ISFP: {
        type: 'ISFP', nickname: '자유로운 예술혼',
        traits: {romance: '분위기와 감성으로 승부', friendship: '편한 사람만 곁에 두는 주의', work: '내 방식대로 할 때 최고 성과'},
    },
    INFP: {
        type: 'INFP', nickname: '순정 몽상가',
        traits: {romance: '이상형 리스트가 소설 한 권 분량', friendship: '소수정예 찐친 클럽 운영중', work: '의미 없는 일엔 손이 안 감'},
    },
    INTP: {
        type: 'INTP', nickname: '논리 탐구자',
        traits: {romance: '썸도 논리로 분석하다 타이밍 놓침', friendship: '잡담보다 토론이 재밌는 친구', work: '왜 해야 하는지부터 따지고 시작'},
    },
    ESTP: {
        type: 'ESTP', nickname: '즉흥의 아이콘',
        traits: {romance: '고백도 즉흥, 데이트도 즉흥', friendship: '주말 약속은 당일 아침에 잡음', work: '일단 저지르고 나중에 수습'},
    },
    ESFP: {
        type: 'ESFP', nickname: '무대 위 인싸',
        traits: {romance: '설렘 유통기한이 제일 긴 타입', friendship: '모임의 분위기 메이커 담당', work: '재미없으면 능률도 안 나옴'},
    },
    ENFP: {
        type: 'ENFP', nickname: '자유로운 영혼',
        traits: {romance: '하루에도 열두 번 마음이 콩닥', friendship: '오늘 처음 본 사람과도 절친 각', work: '아이디어는 넘치는데 마감이 문제'},
    },
    ENTP: {
        type: 'ENTP', nickname: '악마의 변호사',
        traits: {romance: '썸 타는 것도 토론하듯 즐김', friendship: '논쟁할수록 더 친해지는 사이', work: '반박하다 보면 새 기획이 나옴'},
    },
    ESTJ: {
        type: 'ESTJ', nickname: '타고난 관리자',
        traits: {romance: '연애도 체계적으로 계획 세움', friendship: '약속 시간 어기면 서운해함', work: '규칙과 효율이 최우선 가치'},
    },
    ESFJ: {
        type: 'ESFJ', nickname: '분위기 지킴이',
        traits: {romance: '기념일 절대 안 잊는 스윗함', friendship: '모두를 챙기는 반장 포지션', work: '팀워크 없인 못 사는 스타일'},
    },
    ENFJ: {
        type: 'ENFJ', nickname: '타고난 리더',
        traits: {romance: '상대 마음부터 먼저 헤아림', friendship: '친구 고민 상담소 원장', work: '팀 사기를 끌어올리는 재주꾼'},
    },
    ENTJ: {
        type: 'ENTJ', nickname: '타고난 사령관',
        traits: {romance: '연애도 목표 설정하고 달성', friendship: '친구도 능력으로 인정받고 싶음', work: '결단력 하나로 판도를 바꿈'},
    },
}
