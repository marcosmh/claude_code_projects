package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.SystemEventDto;
import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.models.MessageType;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;

// Builds the system events (connection notices) so controllers only publish them.
// New events (rooms, private messages...) are added here without touching the chat message flow.
@Service
public class SystemEventService {

    private final Clock clock;

    public SystemEventService(Clock clock) {
        this.clock = clock;
    }

    public SystemEventDto userConnected(UserSessionDto session) {
        return event(MessageType.USER_CONNECTED, session.username(), session.username() + " se ha conectado al chat.");
    }

    public SystemEventDto userDisconnected(UserSessionDto session) {
        return event(MessageType.USER_DISCONNECTED, session.username(), session.username() + " ha salido del chat.");
    }

    private SystemEventDto event(MessageType type, String username, String content) {
        return new SystemEventDto(type, username, content, Instant.now(clock));
    }
}
