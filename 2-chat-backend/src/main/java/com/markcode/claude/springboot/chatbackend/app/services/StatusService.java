package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.StatusDto;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;

@Service
public class StatusService {

    private final UserSessionService userSessions;
    private final ChatMessageService messages;
    private final Clock clock;

    public StatusService(UserSessionService userSessions, ChatMessageService messages, Clock clock) {
        this.userSessions = userSessions;
        this.messages = messages;
        this.clock = clock;
    }

    public StatusDto status() {
        return new StatusDto("UP", userSessions.countConnected(), messages.count(), Instant.now(clock));
    }
}
