package com.markcode.claude.springboot.chatbackend.app.dto;

import com.markcode.claude.springboot.chatbackend.app.models.MessageType;

import java.time.Instant;

// System notice published on /topic/system. Not persisted and never mixed into the chat history.
public record SystemEventDto(MessageType type, String username, String content, Instant timestamp) {
}
