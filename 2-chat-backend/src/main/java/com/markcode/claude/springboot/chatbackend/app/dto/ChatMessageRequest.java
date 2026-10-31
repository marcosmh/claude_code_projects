package com.markcode.claude.springboot.chatbackend.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(@NotBlank @Size(max = 500) String content) {
}
