package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.config.AppProperties;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageRequest;
import com.markcode.claude.springboot.chatbackend.app.mapper.ChatMessageMapper;
import com.markcode.claude.springboot.chatbackend.app.models.ChatMessage;
import com.markcode.claude.springboot.chatbackend.app.repositories.ChatMessageRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatMessageService {

    private final ChatMessageRepository repository;
    private final ChatMessageMapper mapper;
    private final UserSessionService userSessions;
    private final AppProperties properties;
    private final Clock clock;

    public ChatMessageService(ChatMessageRepository repository, ChatMessageMapper mapper,
                              UserSessionService userSessions, AppProperties properties, Clock clock) {
        this.repository = repository;
        this.mapper = mapper;
        this.userSessions = userSessions;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public ChatMessageDto send(String sessionId, ChatMessageRequest request) {
        String username = userSessions.requireConnectedUsername(sessionId);
        ChatMessage saved = repository.save(mapper.toEntity(username, request, Instant.now(clock)));
        return mapper.toDto(saved);
    }

    // Latest messages in chronological order (oldest first).
    @Transactional(readOnly = true)
    public List<ChatMessageDto> history(Integer limit) {
        int size = effectiveLimit(limit);
        List<ChatMessageDto> latestFirst = repository.findAllByOrderByIdDesc(PageRequest.of(0, size)).stream()
                .map(mapper::toDto)
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.reverse(latestFirst);
        return latestFirst;
    }

    @Transactional(readOnly = true)
    public long count() {
        return repository.count();
    }

    private int effectiveLimit(Integer limit) {
        AppProperties.History history = properties.history();
        if (limit == null) {
            return history.defaultLimit();
        }
        return Math.max(1, Math.min(limit, history.maxLimit()));
    }
}
