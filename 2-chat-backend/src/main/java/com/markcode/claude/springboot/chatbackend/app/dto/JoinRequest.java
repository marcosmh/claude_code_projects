package com.markcode.claude.springboot.chatbackend.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinRequest(@NotBlank @Size(max = 24) String username) {
}
