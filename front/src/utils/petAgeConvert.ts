export type PetSpecies = 'dog' | 'cat'

// 품종·크기를 반영하지 않는 일반적인 간이 환산식: 1세=15세, 2세=24세(+9),
// 그 이후로는 매년 강아지 +5세 · 고양이 +4세를 더한다.
const PER_YEAR_AFTER_TWO: Record<PetSpecies, number> = {dog: 5, cat: 4}

export function petAgeToHumanYears(species: PetSpecies, petAgeYears: number): number {
    if (petAgeYears <= 1) return petAgeYears * 15
    if (petAgeYears <= 2) return 15 + (petAgeYears - 1) * 9
    return 24 + (petAgeYears - 2) * PER_YEAR_AFTER_TWO[species]
}
