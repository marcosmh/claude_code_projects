package com.markcode.claude.springboot.chatbackend.app.dto;

import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;

import java.time.Instant;

// The session id is deliberately not exposed.
public record UserSessionDto(String username, Instant connectionTime, ConnectionStatus status) {
}
