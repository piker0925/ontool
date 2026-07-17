package com.back.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginFailureHandlerTest {

    @Mock
    HttpServletRequest request;
    @Mock
    HttpServletResponse response;

    @Test
    void 로그인_실패시_프론트_콜백에_error_fragment로_리다이렉트한다() throws Exception {
        OAuth2LoginFailureHandler handler = new OAuth2LoginFailureHandler("http://localhost:5173");

        handler.onAuthenticationFailure(request, response,
                new OAuth2AuthenticationException(new OAuth2Error("access_denied")));

        verify(response).sendRedirect("http://localhost:5173/auth/callback#error=login_failed");
    }
}
