package com.markcode.rag.dto;

import java.util.UUID;

public record SourceDto(UUID documentId, String fileName, Integer page, Double score, String snippet) {
}
