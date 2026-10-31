package com.markcode.claude.springboot.chatbackend.app.dto;

import java.time.Instant;

public record ChatMessageDto(Long id, String username, String content, Instant timestamp) {
}
