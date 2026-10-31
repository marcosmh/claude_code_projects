package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.exceptions.BusinessRuleException;
import com.markcode.claude.springboot.chatbackend.app.mapper.UserSessionMapper;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.models.UserSession;
import com.markcode.claude.springboot.chatbackend.app.repositories.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSessionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    @Mock
    private UserSessionRepository repository;

    private UserSessionService service;

    @BeforeEach
    void setUp() {
        service = new UserSessionService(repository, new UserSessionMapper(), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void joinRegistersConnectedSessionWithServerTime() {
        when(repository.findBySessionId("s1")).thenReturn(Optional.empty());
        when(repository.existsByUsernameAndStatus("ana", ConnectionStatus.CONNECTED)).thenReturn(false);
        when(repository.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserSessionDto dto = service.join("s1", "  ana ");

        assertThat(dto.username()).isEqualTo("ana");
        assertThat(dto.status()).isEqualTo(ConnectionStatus.CONNECTED);
        assertThat(dto.connectionTime()).isEqualTo(NOW);
    }

    @Test
    void joinRejectsUsernameAlreadyConnected() {
        when(repository.findBySessionId("s2")).thenReturn(Optional.empty());
        when(repository.existsByUsernameAndStatus("ana", ConnectionStatus.CONNECTED)).thenReturn(true);

        assertThatThrownBy(() -> service.join("s2", "ana"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ana");
        verify(repository, never()).save(any());
    }

    @Test
    void joinRejectsSecondJoinOnSameSession() {
        when(repository.findBySessionId("s1")).thenReturn(Optional.of(new UserSession("ana", "s1", NOW)));

        assertThatThrownBy(() -> service.join("s1", "otra")).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void disconnectMarksSessionDisconnected() {
        when(repository.findBySessionId("s1")).thenReturn(Optional.of(new UserSession("ana", "s1", NOW)));
        when(repository.save(any(UserSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<UserSessionDto> dto = service.disconnect("s1");

        assertThat(dto).get().extracting(UserSessionDto::status).isEqualTo(ConnectionStatus.DISCONNECTED);
    }

    @Test
    void disconnectIsEmptyForUnknownSession() {
        when(repository.findBySessionId("nope")).thenReturn(Optional.empty());

        assertThat(service.disconnect("nope")).isEmpty();
    }

    @Test
    void requireConnectedUsernameFailsWhenNotJoined() {
        when(repository.findBySessionId("s9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireConnectedUsername("s9")).isInstanceOf(BusinessRuleException.class);
    }
}
