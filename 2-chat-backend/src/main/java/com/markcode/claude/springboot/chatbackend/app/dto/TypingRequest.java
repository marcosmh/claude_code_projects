package com.markcode.claude.springboot.chatbackend.app.dto;

import com.markcode.claude.springboot.chatbackend.app.models.MessageType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

// Sent by a client to /app/chat.typing: only the state; the author comes from the session.
public record TypingRequest(@NotNull MessageType type) {

    @AssertTrue(message = "el tipo de evento debe ser USER_TYPING o USER_STOPPED_TYPING")
    boolean isTypingEvent() {
        return type == null || type == MessageType.USER_TYPING || type == MessageType.USER_STOPPED_TYPING;
    }
}
