package com.back.tool.codegen;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * codegen 모듈 공용 산출물 압축 헬퍼.
 * 생성된 디렉터리를 ZIP으로 묶고 임시 디렉터리를 정리한다.
 */
final class CodegenZipSupport {

    private CodegenZipSupport() {
    }

    static void zipDirectory(Path dir, Path zipPath) throws IOException {
        try (OutputStream fos = Files.newOutputStream(zipPath);
             ZipOutputStream zip = new ZipOutputStream(fos);
             Stream<Path> walk = Files.walk(dir)) {
            walk.filter(p -> !Files.isDirectory(p))
                    .forEach(p -> {
                        try {
                            zip.putNextEntry(new ZipEntry(dir.relativize(p).toString()));
                            Files.copy(p, zip);
                            zip.closeEntry();
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        }
    }

    static void deleteDir(File dir) {
        File[] files = dir.listFiles();
        if (files != null) for (File f : files) {
            if (f.isDirectory()) deleteDir(f);
            else f.delete();
        }
        dir.delete();
    }
}
