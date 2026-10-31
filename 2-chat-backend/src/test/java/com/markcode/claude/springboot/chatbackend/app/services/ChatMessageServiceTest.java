package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.config.AppProperties;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageRequest;
import com.markcode.claude.springboot.chatbackend.app.exceptions.BusinessRuleException;
import com.markcode.claude.springboot.chatbackend.app.mapper.ChatMessageMapper;
import com.markcode.claude.springboot.chatbackend.app.models.ChatMessage;
import com.markcode.claude.springboot.chatbackend.app.repositories.ChatMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    @Mock
    private ChatMessageRepository repository;
    @Mock
    private UserSessionService userSessions;

    private ChatMessageService service;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties(new AppProperties.Cors(List.of()), new AppProperties.History(50, 200));
        service = new ChatMessageService(repository, new ChatMessageMapper(), userSessions, properties,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void sendPersistsMessageWithServerAuthorAndTime() {
        when(userSessions.requireConnectedUsername("s1")).thenReturn("ana");
        when(repository.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatMessageDto dto = service.send("s1", new ChatMessageRequest("  hola "));

        assertThat(dto.username()).isEqualTo("ana");
        assertThat(dto.content()).isEqualTo("hola");
        assertThat(dto.timestamp()).isEqualTo(NOW);
    }

    @Test
    void sendFailsWhenSessionNeverJoined() {
        when(userSessions.requireConnectedUsername("s9")).thenThrow(new BusinessRuleException("no"));

        assertThatThrownBy(() -> service.send("s9", new ChatMessageRequest("hola")))
                .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void historyReturnsOldestFirstAndAppliesDefaultLimit() {
        ChatMessage newer = new ChatMessage("ana", "dos", NOW.plusSeconds(1));
        ChatMessage older = new ChatMessage("ana", "uno", NOW);
        when(repository.findAllByOrderByIdDesc(any(Pageable.class))).thenReturn(List.of(newer, older));

        List<ChatMessageDto> history = service.history(null);

        assertThat(history).extracting(ChatMessageDto::content).containsExactly("uno", "dos");
        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAllByOrderByIdDesc(page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    void historyClampsLimitToConfiguredBounds() {
        when(repository.findAllByOrderByIdDesc(any(Pageable.class))).thenReturn(List.of());

        service.history(10_000);
        service.history(-5);

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(repository, org.mockito.Mockito.times(2)).findAllByOrderByIdDesc(page.capture());
        assertThat(page.getAllValues()).extracting(Pageable::getPageSize).containsExactly(200, 1);
    }
}
