package com.back.tool.dto;

public record ModuleResponse(String id, String name, String category, boolean isHeavy,
                              long maxFileSizeBytes, long maxRequestSizeBytes) {
}
