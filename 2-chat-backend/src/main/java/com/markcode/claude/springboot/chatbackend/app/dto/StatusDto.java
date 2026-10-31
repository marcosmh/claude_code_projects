package com.markcode.claude.springboot.chatbackend.app.dto;

import java.time.Instant;

public record StatusDto(String status, long connectedUsers, long totalMessages, Instant serverTime) {
}
