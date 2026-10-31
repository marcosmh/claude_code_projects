package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.TypingEventDto;
import com.markcode.claude.springboot.chatbackend.app.dto.TypingRequest;
import com.markcode.claude.springboot.chatbackend.app.exceptions.BusinessRuleException;
import com.markcode.claude.springboot.chatbackend.app.models.MessageType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TypingServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    @Mock
    private UserSessionService userSessions;

    @Test
    void relayUsesTheSessionUsernameAndServerTime() {
        when(userSessions.requireConnectedUsername("s1")).thenReturn("Anakin");
        TypingService service = new TypingService(userSessions, Clock.fixed(NOW, ZoneOffset.UTC));

        TypingEventDto event = service.relay("s1", new TypingRequest(MessageType.USER_TYPING));

        assertThat(event).isEqualTo(new TypingEventDto(MessageType.USER_TYPING, "Anakin", NOW));
    }

    @Test
    void relayRejectsSessionsThatNeverJoined() {
        when(userSessions.requireConnectedUsername("ghost")).thenThrow(new BusinessRuleException("Debes unirte"));
        TypingService service = new TypingService(userSessions, Clock.fixed(NOW, ZoneOffset.UTC));

        assertThatThrownBy(() -> service.relay("ghost", new TypingRequest(MessageType.USER_STOPPED_TYPING)))
                .isInstanceOf(BusinessRuleException.class);
    }
}
