package com.markcode.claude.springboot.chatbackend.app.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "chat_message")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 24)
    private String username;

    // The API accepts 500 characters (code points); H2 measures length in UTF-16 units, so emojis need up to 2x.
    @Column(nullable = false, length = 1000)
    private String content;

    // "timestamp" is a reserved word in H2, hence the explicit column name.
    @Column(name = "sent_at", nullable = false)
    private Instant timestamp;

    protected ChatMessage() {
    }

    public ChatMessage(String username, String content, Instant timestamp) {
        this.username = username;
        this.content = content;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getContent() {
        return content;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
