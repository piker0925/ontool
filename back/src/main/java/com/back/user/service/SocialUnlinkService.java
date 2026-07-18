package com.back.user.service;

import com.back.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 탈퇴 시 소셜 연결 끊기(055-②) — best-effort. 실패해도 탈퇴 자체는 이미 커밋된 뒤라 영향 없다.
 * <p>
 * 카카오 unlink는 REST API 앱키가 아닌 별도 Admin 키가 필요한데 아직 발급·설정되지 않았고,
 * 구글 revoke는 provider가 내려준 access/refresh token이 필요한데 로그인 성공 처리(OAuth2LoginSuccessHandler)가
 * 우리 JWT만 발급하고 provider token은 애초에 저장하지 않는다 — 둘 다 지금 구조로는 실제 호출이 불가능하다.
 * 그래서 지금은 로그만 남기고 실제 API 호출은 하지 않는다(설계 문서의 "실패해도 탈퇴는 진행, 로그만"과 부합).
 */
@Slf4j
@Service
public class SocialUnlinkService {

    public void bestEffortUnlink(User user) {
        try {
            switch (user.getProvider()) {
                case KAKAO -> log.info("카카오 unlink 생략: Admin 키 미설정 (userId={})", user.getId());
                case GOOGLE -> log.info("구글 revoke 생략: 저장된 provider token 없음 (userId={})", user.getId());
            }
        } catch (Exception e) {
            log.warn("소셜 연결 끊기 처리 중 예외 (탈퇴는 이미 완료됨): userId={}", user.getId(), e);
        }
    }
}
