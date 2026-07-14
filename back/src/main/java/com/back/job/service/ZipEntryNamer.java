package com.back.job.service;

import com.back.global.util.FilenameSanitizer;

import java.util.HashSet;
import java.util.Set;

/**
 * 배치 ZIP 엔트리명 생성 (038). 한 배치의 ZIP을 만드는 동안 상태(이미 쓴 이름)를 들고 순차 호출된다.
 * - 베이스명: 원본 입력 파일명에서(정화). 확장자: 결과 파일(resultKey)에서 — 입력/결과 확장자가
 *   다를 수 있다(image-to-pdf: red.png → red.pdf).
 * - 충돌: 같은 이름이 이미 있으면 확장자 앞에 -2, -3 순번.
 * - 폴백: 정화 후 원본명이 비면(경로 탈출 시도 등) file-N.ext.
 */
public class ZipEntryNamer {

    private final Set<String> used = new HashSet<>();
    private int index = 0;

    public String nameFor(String inputPath, String resultKey) {
        index++;
        String base = stripExtension(FilenameSanitizer.sanitize(inputPath));
        String ext = extensionOf(resultKey);
        String dotExt = ext.isEmpty() ? "" : "." + ext;

        String stem = base.isEmpty() ? "file-" + index : base;
        String candidate = stem + dotExt;
        int n = 2;
        while (!used.add(candidate)) {
            candidate = stem + "-" + n + dotExt;
            n++;
        }
        return candidate;
    }

    private static String stripExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static String extensionOf(String key) {
        String filename = key.substring(Math.max(key.lastIndexOf('/'), key.lastIndexOf('\\')) + 1);
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "";
    }
}
