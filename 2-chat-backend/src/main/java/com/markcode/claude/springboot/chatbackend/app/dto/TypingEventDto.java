package com.markcode.claude.springboot.chatbackend.app.dto;

import com.markcode.claude.springboot.chatbackend.app.models.MessageType;

import java.time.Instant;

// Ephemeral typing state published on /topic/typing. Never persisted.
public record TypingEventDto(MessageType type, String username, Instant timestamp) {
}
