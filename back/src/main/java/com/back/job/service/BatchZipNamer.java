package com.back.job.service;

import com.back.global.util.FilenameSanitizer;

/**
 * 배치 ZIP "파일 자체"의 다운로드명 생성 (112). ZIP 안 엔트리명(038, {@link ZipEntryNamer})과는 별개로,
 * ZIP 파일 자체는 첫 완료 작업의 원본 베이스명 + 나머지 완료 건수로 짓는다.
 * 원본명을 복원할 수 없거나(정화 후 빈 이름) 완료건이 없으면 배치 id 기반 이름으로 폴백한다.
 */
public final class BatchZipNamer {

    private BatchZipNamer() {
    }

    public static String nameFor(String firstInputPath, int doneCount, String batchId) {
        String base = FilenameSanitizer.baseName(firstInputPath, "batch-" + batchId);
        int extra = doneCount - 1;
        return extra > 0 ? base + "-외" + extra + "건.zip" : base + ".zip";
    }
}
