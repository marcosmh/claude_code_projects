package com.markcode.rag.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(UUID id, String fileName, Instant uploadedAt, int pageCount, long sizeBytes, int chunkCount) {
}
