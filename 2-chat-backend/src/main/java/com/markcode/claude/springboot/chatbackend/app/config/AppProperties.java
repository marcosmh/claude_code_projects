package com.markcode.claude.springboot.chatbackend.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors, History history) {

    public record Cors(List<String> allowedOrigins) {
    }

    public record History(int defaultLimit, int maxLimit) {
    }
}
