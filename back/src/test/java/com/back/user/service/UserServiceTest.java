package com.back.user.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void getById_존재하면_반환한다() {
        User user = new User(AuthProvider.GOOGLE, "g1", null, "닉네임");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThat(userService.getById(1L)).isEqualTo(user);
    }

    @Test
    void getById_존재하지_않으면_UNAUTHORIZED() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getById(1L))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void updateNickname_닉네임을_변경한다() {
        User user = new User(AuthProvider.GOOGLE, "g1", null, "기존닉네임");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User result = userService.updateNickname(1L, "새닉네임");

        assertThat(result.getNickname()).isEqualTo("새닉네임");
    }

    @Test
    void upsertFromSocialLogin_처음_로그인이면_새유저를_생성한다() {
        when(userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "g1")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.upsertFromSocialLogin(AuthProvider.GOOGLE, "g1", "a@test.com", "홍길동");

        assertThat(result.getProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(result.getProviderId()).isEqualTo("g1");
        assertThat(result.getNickname()).isEqualTo("홍길동");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void upsertFromSocialLogin_이미_존재하면_기존_유저를_그대로_반환하고_저장하지_않는다() {
        User existing = new User(AuthProvider.GOOGLE, "g1", "old@test.com", "기존닉네임");
        when(userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, "g1")).thenReturn(Optional.of(existing));

        User result = userService.upsertFromSocialLogin(AuthProvider.GOOGLE, "g1", "new@test.com", "새로운소셜프로필명");

        assertThat(result.getNickname()).isEqualTo("기존닉네임");
        assertThat(result.getEmail()).isEqualTo("old@test.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    void upsertFromSocialLogin_닉네임이_20자_초과면_잘라서_저장한다() {
        when(userRepository.findByProviderAndProviderId(any(), any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.upsertFromSocialLogin(AuthProvider.KAKAO, "k1", null, "123456789012345678901234567890");

        assertThat(result.getNickname()).hasSize(20);
    }

    @Test
    void upsertFromSocialLogin_이모지가_섞인_닉네임을_잘라도_서로게이트_쌍이_깨지지_않는다() {
        when(userRepository.findByProviderAndProviderId(any(), any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // "가" 1개 + 이모지(서로게이트 쌍, UTF-16 2유닛) 25개 = 26 코드포인트, 51 UTF-16 유닛.
        // 예전 substring(0,20)은 UTF-16 유닛 기준이라 20번째 유닛이 이모지 쌍 한가운데를 잘랐다.
        String nicknameWithEmoji = "가" + "😀".repeat(25);

        User result = userService.upsertFromSocialLogin(AuthProvider.KAKAO, "k3", null, nicknameWithEmoji);

        String nickname = result.getNickname();
        assertThat(nickname.codePointCount(0, nickname.length())).isEqualTo(20);
        assertThat(Character.isHighSurrogate(nickname.charAt(nickname.length() - 1))).isFalse();
    }

    @Test
    void upsertFromSocialLogin_닉네임이_비어있으면_기본값을_사용한다() {
        when(userRepository.findByProviderAndProviderId(any(), any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.upsertFromSocialLogin(AuthProvider.KAKAO, "k2", null, null);

        assertThat(result.getNickname()).isNotBlank();
    }
}
