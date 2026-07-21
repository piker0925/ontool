package com.back.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.LinkedHashMap;
import java.util.Map;

// 기본 로그인은 브라우저에 남은 provider 세션으로 조용히 재로그인되는 동작을 그대로 둔다(자동 로그인 유지).
// ?switch=true 로 요청된 경우에만 prompt=select_account를 얹어 계정 선택 화면을 강제한다.
public class SelectAccountOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final String SWITCH_ACCOUNT_PARAMETER = "switch";

    private final OAuth2AuthorizationRequestResolver delegate;

    public SelectAccountOAuth2AuthorizationRequestResolver(OAuth2AuthorizationRequestResolver delegate) {
        this.delegate = delegate;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return withSelectAccountPromptIfRequested(request, delegate.resolve(request));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
        return withSelectAccountPromptIfRequested(request, delegate.resolve(request, registrationId));
    }

    private OAuth2AuthorizationRequest withSelectAccountPromptIfRequested(
            HttpServletRequest request, OAuth2AuthorizationRequest original) {
        if (original == null || request.getParameter(SWITCH_ACCOUNT_PARAMETER) == null) {
            return original;
        }
        Map<String, Object> additionalParameters = new LinkedHashMap<>(original.getAdditionalParameters());
        additionalParameters.put("prompt", "select_account");
        return OAuth2AuthorizationRequest.from(original)
                .additionalParameters(additionalParameters)
                .build();
    }
}
