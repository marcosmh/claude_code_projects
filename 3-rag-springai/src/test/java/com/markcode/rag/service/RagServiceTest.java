package com.markcode.rag.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.markcode.rag.config.RagProperties;
import com.markcode.rag.dto.AskResponse;
import com.markcode.rag.repository.VectorStoreRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;

class RagServiceTest {

    VectorStoreRepository vectorStoreRepository = mock(VectorStoreRepository.class);
    ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    RagService service;

    @BeforeEach
    void setUp() {
        service = new RagService(vectorStoreRepository, chatClient, new RagProperties(800, 5, 0.5));
    }

    @Test
    void returnsFixedAnswerWithoutCallingLlmWhenNothingRelevant() {
        when(vectorStoreRepository.similaritySearch(anyString(), anyInt(), anyDouble())).thenReturn(List.of());

        AskResponse response = service.ask("¿algo?");

        assertThat(response.answer()).isEqualTo(RagService.NO_INFORMATION);
        assertThat(response.sources()).isEmpty();
        verifyNoInteractions(chatClient);
    }

    @Test
    void answersFromRetrievedContextAndReturnsSources() {
        UUID docId = UUID.randomUUID();
        Document chunk = Document.builder()
                .text("Las vacaciones son 20 días.")
                .metadata(Map.of("documentId", docId.toString(), "fileName", "rrhh.pdf", "page", 3))
                .score(0.9)
                .build();
        when(vectorStoreRepository.similaritySearch(anyString(), anyInt(), anyDouble())).thenReturn(List.of(chunk));
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("<think>razonando</think>\n20 días.");

        AskResponse response = service.ask("¿Cuántas vacaciones hay?");

        assertThat(response.answer()).isEqualTo("20 días.");
        assertThat(response.sources()).singleElement().satisfies(s -> {
            assertThat(s.documentId()).isEqualTo(docId);
            assertThat(s.fileName()).isEqualTo("rrhh.pdf");
            assertThat(s.page()).isEqualTo(3);
            assertThat(s.score()).isEqualTo(0.9);
        });
    }

    @Test
    void cleanFallsBackWhenModelReturnsOnlyThinking() {
        assertThat(RagService.clean("<think>x</think>")).isEqualTo(RagService.NO_INFORMATION);
        assertThat(RagService.clean(null)).isEqualTo(RagService.NO_INFORMATION);
    }
}
