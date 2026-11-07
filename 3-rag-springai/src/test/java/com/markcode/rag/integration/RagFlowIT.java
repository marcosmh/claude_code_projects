package com.markcode.rag.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import tools.jackson.databind.JsonNode;
import com.markcode.rag.PdfFixtures;
import com.markcode.rag.repository.DocumentRepository;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Flujo completo upload -> ask contra PostgreSQL+pgvector real (Testcontainers). Ollama se sustituye por dobles. */
@Testcontainers
@AutoConfigureTestRestTemplate
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.ai.ollama.init.pull-model-strategy=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.rag.similarity-threshold=0.0"
})
class RagFlowIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer(
            DockerImageName.parse("pgvector/pgvector:pg17").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("spring_ia_rag");

    @TestConfiguration
    static class FakeEmbeddingConfig {
        @Bean
        @Primary
        EmbeddingModel fakeEmbeddingModel() {
            return new HashingEmbeddingModel();
        }
    }

    @MockitoBean
    ChatModel chatModel;

    @Autowired
    TestRestTemplate rest;
    @Autowired
    DocumentRepository documentRepository;

    @Test
    void openApiDocsExposeBothEndpoints() {
        String docs = rest.getForObject("/v3/api-docs", String.class);
        assertThat(docs).contains("/api/documents/upload", "/api/rag/ask");
    }

    @Test
    void uploadThenAskReturnsAnswerWithSources() {
        when(chatModel.getOptions()).thenReturn(ChatOptions.builder().build());
        when(chatModel.call(any(Prompt.class))).thenReturn(
                new ChatResponse(List.of(new Generation(new AssistantMessage("<think>..</think>Son 20 días.")))));

        byte[] pdf = PdfFixtures.pdf("La politica de vacaciones otorga 20 dias {braces} al año.");
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(pdf) {
            @Override
            public String getFilename() {
                return "politica.pdf";
            }
        });
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<JsonNode> upload = rest.postForEntity("/api/documents/upload", new HttpEntity<>(body, headers), JsonNode.class);
        assertThat(upload.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(upload.getBody().get("pageCount").asInt()).isEqualTo(1);
        assertThat(documentRepository.count()).isEqualTo(1);

        ResponseEntity<JsonNode> ask = rest.postForEntity("/api/rag/ask",
                java.util.Map.of("question", "politica de vacaciones"), JsonNode.class);
        assertThat(ask.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ask.getBody().get("answer").asText()).isEqualTo("Son 20 días.");
        assertThat(ask.getBody().get("sources").get(0).get("fileName").asText()).isEqualTo("politica.pdf");
    }

    /** Embedding determinista de 768 dimensiones basado en hash de palabras (bag of words). */
    static class HashingEmbeddingModel implements EmbeddingModel {
        @Override
        public EmbeddingResponse call(EmbeddingRequest request) {
            List<Embedding> out = new ArrayList<>();
            int i = 0;
            for (String text : request.getInstructions()) {
                out.add(new Embedding(embed(text), i++));
            }
            return new EmbeddingResponse(out);
        }

        @Override
        public float[] embed(Document document) {
            return embed(document.getText());
        }

        @Override
        public float[] embed(String text) {
            float[] v = new float[768];
            try {
                for (String word : text.toLowerCase().split("\\W+")) {
                    if (word.isBlank()) {
                        continue;
                    }
                    byte[] h = MessageDigest.getInstance("SHA-256").digest(word.getBytes());
                    v[((h[0] & 0xff) << 8 | (h[1] & 0xff)) % 768] += 1f;
                }
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            v[0] += 0.001f;
            return v;
        }
    }
}
