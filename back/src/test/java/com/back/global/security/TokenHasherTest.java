package com.back.global.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenHasherTest {

    @Test
    void 같은_입력이면_같은_해시가_나온다() {
        assertThat(TokenHasher.sha256("raw-token")).isEqualTo(TokenHasher.sha256("raw-token"));
    }

    @Test
    void 다른_입력이면_다른_해시가_나온다() {
        assertThat(TokenHasher.sha256("raw-token-a")).isNotEqualTo(TokenHasher.sha256("raw-token-b"));
    }

    @Test
    void sha256_16진수_64자리를_반환한다() {
        assertThat(TokenHasher.sha256("raw-token")).hasSize(64).matches("[0-9a-f]+");
    }
}
