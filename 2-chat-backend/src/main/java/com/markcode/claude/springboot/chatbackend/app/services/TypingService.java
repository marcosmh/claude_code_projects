package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.TypingEventDto;
import com.markcode.claude.springboot.chatbackend.app.dto.TypingRequest;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;

// Typing state is ephemeral: it is only validated and relayed, so it has no repository and no entity.
// Each event carries its own author, which is what lets clients track several people typing at once.
@Service
public class TypingService {

    private final UserSessionService userSessions;
    private final Clock clock;

    public TypingService(UserSessionService userSessions, Clock clock) {
        this.userSessions = userSessions;
        this.clock = clock;
    }

    // Only a session that joined can announce typing; the username is never taken from the client.
    public TypingEventDto relay(String sessionId, TypingRequest request) {
        String username = userSessions.requireConnectedUsername(sessionId);
        return new TypingEventDto(request.type(), username, Instant.now(clock));
    }
}
