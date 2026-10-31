package com.markcode.claude.springboot.chatbackend.app.mapper;

import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageRequest;
import com.markcode.claude.springboot.chatbackend.app.models.ChatMessage;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class ChatMessageMapper {

    public ChatMessageDto toDto(ChatMessage entity) {
        return new ChatMessageDto(entity.getId(), entity.getUsername(), entity.getContent(), entity.getTimestamp());
    }

    // The author and the time come from the server, never from the client payload.
    public ChatMessage toEntity(String username, ChatMessageRequest request, Instant timestamp) {
        return new ChatMessage(username, request.content().trim(), timestamp);
    }
}
