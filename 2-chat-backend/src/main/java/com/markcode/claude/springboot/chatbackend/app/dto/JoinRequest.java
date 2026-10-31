package com.markcode.claude.springboot.chatbackend.app.dto;

import com.markcode.claude.springboot.chatbackend.app.models.MessageType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// type is optional so older clients that send only the username keep working; when present it must be USER_CONNECTED.
public record JoinRequest(@NotBlank @Size(max = 24) String username, MessageType type) {

    public JoinRequest(String username) {
        this(username, MessageType.USER_CONNECTED);
    }

    @AssertTrue(message = "el tipo de evento debe ser USER_CONNECTED")
    boolean isConnectionEvent() {
        return type == null || type == MessageType.USER_CONNECTED;
    }
}
