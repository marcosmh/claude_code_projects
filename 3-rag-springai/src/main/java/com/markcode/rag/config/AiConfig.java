package com.markcode.rag.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.transformer.splitter.TextSplitter;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ensamblado de los componentes de IA. El {@code VectorStore} (pgvector), el {@code EmbeddingModel}
 * y el {@code ChatModel} (Ollama) los autoconfigura Spring AI desde {@code application.properties}.
 */
@Configuration
@EnableConfigurationProperties(RagProperties.class)
public class AiConfig {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.build();
    }

    @Bean
    TextSplitter textSplitter(RagProperties properties) {
        return TokenTextSplitter.builder()
                .withChunkSize(properties.chunkSize())
                .build();
    }
}
