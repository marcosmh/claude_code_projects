package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.SystemEventDto;
import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.models.MessageType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class SystemEventServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    private final SystemEventService service = new SystemEventService(Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void userConnectedBuildsASystemNoticeWithServerTime() {
        UserSessionDto session = new UserSessionDto("Luke", NOW.minusSeconds(5), ConnectionStatus.CONNECTED);

        SystemEventDto event = service.userConnected(session);

        assertThat(event.type()).isEqualTo(MessageType.USER_CONNECTED);
        assertThat(event.username()).isEqualTo("Luke");
        assertThat(event.content()).isEqualTo("Luke se ha conectado al chat.");
        assertThat(event.timestamp()).isEqualTo(NOW);
    }

    @Test
    void userDisconnectedBuildsASystemNotice() {
        UserSessionDto session = new UserSessionDto("Ana", NOW.minusSeconds(60), ConnectionStatus.DISCONNECTED);

        SystemEventDto event = service.userDisconnected(session);

        assertThat(event.type()).isEqualTo(MessageType.USER_DISCONNECTED);
        assertThat(event.content()).isEqualTo("Ana ha salido del chat.");
    }
}
