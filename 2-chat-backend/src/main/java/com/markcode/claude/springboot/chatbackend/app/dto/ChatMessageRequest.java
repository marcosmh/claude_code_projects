package com.markcode.claude.springboot.chatbackend.app.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

public record ChatMessageRequest(@NotBlank String content) {

    public static final int MAX_CHARACTERS = 500;

    // Counted in Unicode code points, not UTF-16 units: an emoji is one character for the user (and for the
    // VARCHAR(500) column) but two chars in Java, so @Size would reject 250 emojis. Content is never altered.
    @AssertTrue(message = "el mensaje no puede superar " + MAX_CHARACTERS + " caracteres")
    boolean isWithinMaxCharacters() {
        return content == null || content.codePointCount(0, content.length()) <= MAX_CHARACTERS;
    }
}
