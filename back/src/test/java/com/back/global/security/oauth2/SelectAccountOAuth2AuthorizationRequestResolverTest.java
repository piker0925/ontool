package com.back.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.endpoint.PkceParameterNames;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SelectAccountOAuth2AuthorizationRequestResolverTest {

    @Mock
    OAuth2AuthorizationRequestResolver delegate;
    @Mock
    HttpServletRequest request;

    @Test
    void switch_파라미터가_없으면_기본_로그인은_원본_그대로_통과되어_자동_로그인이_유지된다() {
        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put(OAuth2ParameterNames.REGISTRATION_ID, "google");

        OAuth2AuthorizationRequest original = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("client-id")
                .redirectUri("http://localhost:8080/login/oauth2/code/google")
                .state("original-state")
                .attributes(attributes)
                .build();
        when(request.getParameter("switch")).thenReturn(null);
        when(delegate.resolve(request)).thenReturn(original);

        SelectAccountOAuth2AuthorizationRequestResolver resolver =
                new SelectAccountOAuth2AuthorizationRequestResolver(delegate);
        OAuth2AuthorizationRequest resolved = resolver.resolve(request);

        assertThat(resolved.getAdditionalParameters()).doesNotContainKey("prompt");
        assertThat(resolved.getAuthorizationRequestUri()).doesNotContain("prompt=");
    }

    @Test
    void switch_파라미터가_있으면_구글_인가_요청에_prompt_select_account가_추가되고_기존_attributes는_보존된다() {
        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put(OAuth2ParameterNames.REGISTRATION_ID, "google");
        attributes.put(PkceParameterNames.CODE_VERIFIER, "original-verifier");

        OAuth2AuthorizationRequest original = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("client-id")
                .redirectUri("http://localhost:8080/login/oauth2/code/google")
                .state("original-state")
                .attributes(attributes)
                .build();
        when(request.getParameter("switch")).thenReturn("true");
        when(delegate.resolve(request)).thenReturn(original);

        SelectAccountOAuth2AuthorizationRequestResolver resolver =
                new SelectAccountOAuth2AuthorizationRequestResolver(delegate);
        OAuth2AuthorizationRequest resolved = resolver.resolve(request);

        assertThat(resolved.getAdditionalParameters()).containsEntry("prompt", "select_account");
        assertThat(resolved.getAuthorizationRequestUri()).contains("prompt=select_account");
        assertThat(resolved.getAttributes()).containsEntry(PkceParameterNames.CODE_VERIFIER, "original-verifier");
        assertThat(resolved.getState()).isEqualTo("original-state");
    }

    @Test
    void switch_파라미터가_있으면_카카오_인가_요청에도_prompt_select_account가_추가된다() {
        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put(OAuth2ParameterNames.REGISTRATION_ID, "kakao");

        OAuth2AuthorizationRequest original = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://kauth.kakao.com/oauth/authorize")
                .clientId("client-id")
                .redirectUri("http://localhost:8080/login/oauth2/code/kakao")
                .state("original-state")
                .attributes(attributes)
                .build();
        when(request.getParameter("switch")).thenReturn("true");
        when(delegate.resolve(request, "kakao")).thenReturn(original);

        SelectAccountOAuth2AuthorizationRequestResolver resolver =
                new SelectAccountOAuth2AuthorizationRequestResolver(delegate);
        OAuth2AuthorizationRequest resolved = resolver.resolve(request, "kakao");

        assertThat(resolved.getAdditionalParameters()).containsEntry("prompt", "select_account");
        assertThat(resolved.getAuthorizationRequestUri()).contains("prompt=select_account");
    }
}
