package com.markcode.claude.springboot.chatbackend.app.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "user_session")
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 24)
    private String username;

    @Column(nullable = false, unique = true)
    private String sessionId;

    @Column(nullable = false)
    private Instant connectionTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ConnectionStatus status;

    protected UserSession() {
    }

    public UserSession(String username, String sessionId, Instant connectionTime) {
        this.username = username;
        this.sessionId = sessionId;
        this.connectionTime = connectionTime;
        this.status = ConnectionStatus.CONNECTED;
    }

    public void disconnect() {
        this.status = ConnectionStatus.DISCONNECTED;
    }

    public boolean isConnected() {
        return status == ConnectionStatus.CONNECTED;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getSessionId() {
        return sessionId;
    }

    public Instant getConnectionTime() {
        return connectionTime;
    }

    public ConnectionStatus getStatus() {
        return status;
    }
}
