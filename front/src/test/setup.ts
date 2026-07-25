// jsdom은 Element.prototype.scrollIntoView를 구현하지 않는다 — reka-ui의 Listbox가 하이라이트
// 변경 시 이를 호출해 "not a function" unhandled rejection을 던지고 테스트를 오염시킨다.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
}

// jsdom은 SVGElement.prototype.getBBox를 구현하지 않는다 — Unovis(118, 어드민 대시보드 차트)의
// VisAxis가 렌더 전 라벨 크기를 재려고 이를 호출해 "not a function"으로 테스트를 오염시킨다.
// 실제 크기는 필요 없고(테스트는 레이아웃을 검증하지 않음), 호출이 죽지만 않으면 된다.
if (!(SVGElement.prototype as unknown as {getBBox?: unknown}).getBBox) {
    (SVGElement.prototype as unknown as {getBBox: () => DOMRect}).getBBox = () =>
        ({x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({})}) as DOMRect
}

// jsdom은 ResizeObserver가 없다 — Unovis(118)는 window.ResizeObserver가 없으면 자체 폴리필
// (@juggle/resize-observer)로 대체하는데, 그 폴리필이 jsdom 환경에서 컴포넌트 destroy 시
// "observationTargets" 관련 예외를 던져 컨테이너 unmount를 실패시키고 이후 테스트까지 오염시킨다.
// 여기서 진짜 ResizeObserver 동작(크기 감지)은 필요 없으므로 아무 일도 안 하는 스텁으로 대체한다.
if (!window.ResizeObserver) {
    window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}
