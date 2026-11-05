package com.markcode.claude.springboot.chatbackend.app.repositories;

import com.markcode.claude.springboot.chatbackend.app.models.ChatMessage;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.models.UserSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.markcode.claude.springboot.chatbackend.app.PostgresTestConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(PostgresTestConfiguration.class)
class RepositoriesTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    @Autowired
    private ChatMessageRepository messages;
    @Autowired
    private UserSessionRepository sessions;

    @Test
    void latestMessagesComeNewestFirstAndRespectThePageSize() {
        messages.save(new ChatMessage("ana", "uno", NOW));
        messages.save(new ChatMessage("ana", "dos", NOW.plusSeconds(1)));
        messages.save(new ChatMessage("ana", "tres", NOW.plusSeconds(2)));

        assertThat(messages.findAllByOrderByIdDesc(PageRequest.of(0, 2)))
                .extracting(ChatMessage::getContent)
                .containsExactly("tres", "dos");
    }

    @Test
    void emojisAndLongUnicodeContentSurviveTheRoundTrip() {
        String content = "Hola 👋😀 🔥🚀🎉 👨‍👩‍👧‍👦 🇲🇽 ñandú " + "😀".repeat(500);
        ChatMessage saved = messages.saveAndFlush(new ChatMessage("ana", content, NOW));

        assertThat(messages.findById(saved.getId())).get().extracting(ChatMessage::getContent).isEqualTo(content);
    }

    @Test
    void staleSessionsAreThoseStillConnectedBeforeTheCutoff() {
        sessions.save(new UserSession("old", "s-old", NOW.minusSeconds(600)));
        sessions.save(new UserSession("new", "s-new", NOW.plusSeconds(600)));

        assertThat(sessions.findByStatusAndConnectionTimeBefore(ConnectionStatus.CONNECTED, NOW))
                .extracting(UserSession::getUsername).containsExactly("old");
    }

    @Test
    void sessionQueriesFilterByStatusAndUsername() {
        sessions.save(new UserSession("ana", "s1", NOW));
        UserSession left = sessions.save(new UserSession("beto", "s2", NOW.plusSeconds(1)));
        left.disconnect();
        sessions.save(left);

        assertThat(sessions.findByStatusOrderByConnectionTimeAsc(ConnectionStatus.CONNECTED))
                .extracting(UserSession::getUsername).containsExactly("ana");
        assertThat(sessions.existsByUsernameAndStatus("ana", ConnectionStatus.CONNECTED)).isTrue();
        assertThat(sessions.existsByUsernameAndStatus("beto", ConnectionStatus.CONNECTED)).isFalse();
        assertThat(sessions.countByStatus(ConnectionStatus.DISCONNECTED)).isEqualTo(1);
        assertThat(sessions.findBySessionId("s1")).isPresent();
    }
}
