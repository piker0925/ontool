package com.back.global.util;

/**
 * ZIP 엔트리명 등에 쓰기 위한 파일명 정화 (038).
 * 원본 파일명은 업로더가 통제하는 신뢰 불가 입력이라, 그대로 엔트리명에 쓰면 Zip Slip(압축 해제 시
 * 경로 탈출) 위험이 있다. 여기서 순수 basename으로 강제해 최종 이름이 경로 구분자·상위 참조를 포함하지
 * 않게 한다. 안전한 이름이 남지 않으면 빈 문자열을 반환하고, 호출부가 폴백 이름을 적용한다.
 */
public final class FilenameSanitizer {

    private static final int MAX_LENGTH = 200;

    private FilenameSanitizer() {
    }

    public static String sanitize(String rawName) {
        if (rawName == null) {
            return "";
        }
        // 1) 경로 세그먼트 제거 — / 와 \ 둘 다 기준으로 마지막 세그먼트만 남긴다.
        //    (getFileName()은 리눅스에서 \ 를 세그먼트로 남기지만 Windows 해제기엔 구분자다.)
        String name = rawName;
        int sep = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (sep >= 0) {
            name = name.substring(sep + 1);
        }
        // 2) 널바이트·제어문자 제거
        StringBuilder cleaned = new StringBuilder(name.length());
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (c >= 0x20 && c != 0x7F) {
                cleaned.append(c);
            }
        }
        name = cleaned.toString();
        // 3) 상위/현재 디렉토리 참조·빈 이름 → 안전한 이름 없음
        if (name.isEmpty() || name.equals(".") || name.equals("..")) {
            return "";
        }
        // 4) 화이트리스트: 유니코드 문자·숫자(한글 등 보존)와 . _ - 공백만 유지, 그 외는 _로 치환
        StringBuilder safe = new StringBuilder(name.length());
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isLetterOrDigit(c) || c == '.' || c == '_' || c == '-' || c == ' ') {
                safe.append(c);
            } else {
                safe.append('_');
            }
        }
        name = safe.toString();
        // 5) 과도한 길이 컷
        if (name.length() > MAX_LENGTH) {
            name = name.substring(0, MAX_LENGTH);
        }
        // 6) 후행 점·공백 제거 — Windows는 이를 무시해(우회 유발) 위험하고, "..." 같은 전부-점 이름은
        //    downstream이 ".."로 접힐 수 있어 원천 차단한다. (선행 점은 dotfile이라 보존.)
        int end = name.length();
        while (end > 0 && (name.charAt(end - 1) == '.' || name.charAt(end - 1) == ' ')) {
            end--;
        }
        name = name.substring(0, end);
        // 후행 제거 후 다시 비었으면(전부 점·공백이었으면) 안전한 이름 없음
        if (name.isEmpty()) {
            return "";
        }
        return name;
    }
}
