// jsdom은 Element.prototype.scrollIntoView를 구현하지 않는다 — reka-ui의 Listbox가 하이라이트
// 변경 시 이를 호출해 "not a function" unhandled rejection을 던지고 테스트를 오염시킨다.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
}
