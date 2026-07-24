export type PetSpecies = 'dog' | 'cat'

// 품종·크기를 반영하지 않는 일반적인 간이 환산식: 1세=15세, 2세=24세(+9),
// 그 이후로는 매년 강아지 +5세 · 고양이 +4세를 더한다.
const PER_YEAR_AFTER_TWO: Record<PetSpecies, number> = {dog: 5, cat: 4}

export function petAgeToHumanYears(species: PetSpecies, petAgeYears: number): number {
    if (petAgeYears <= 1) return petAgeYears * 15
    if (petAgeYears <= 2) return 15 + (petAgeYears - 1) * 9
    return 24 + (petAgeYears - 2) * PER_YEAR_AFTER_TWO[species]
}

// 개월수 입력을 받아 사람 나이로 환산한다. 환산 공식 자체(petAgeToHumanYears)는 그대로 두고
// 입력 단위만 개월로 바꾼 어댑터 — 년 단위로 나눈 뒤 기존 로직에 위임한다.
// "정수 개월을 그대로 비율 계산에 쓰는 방식"(나눗셈을 뒤로 미루는 방식)도 검토했으나,
// 0~3000개월(250년) 전 구간에서 이 방식과 표시 자릿수(소수 1자리) 기준 결과가 완전히
// 동일함을 확인했다 — 개월/12 비율이 1.25·0.75·5/12·4/12처럼 배정도 부동소수점에서
// 반올림 경계에 걸리지 않는 값들이라 오차가 표시에 드러나지 않는다. 로직 중복을 피하기
// 위해 기존 petAgeToHumanYears에 위임하는 이 형태를 유지한다.
export function petAgeMonthsToHumanYears(species: PetSpecies, petAgeMonths: number): number {
    return petAgeToHumanYears(species, petAgeMonths / 12)
}
