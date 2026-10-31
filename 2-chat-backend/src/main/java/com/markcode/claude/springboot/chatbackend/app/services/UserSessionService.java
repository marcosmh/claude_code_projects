package com.markcode.claude.springboot.chatbackend.app.services;

import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.exceptions.BusinessRuleException;
import com.markcode.claude.springboot.chatbackend.app.mapper.UserSessionMapper;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.models.UserSession;
import com.markcode.claude.springboot.chatbackend.app.repositories.UserSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class UserSessionService {

    private final UserSessionRepository repository;
    private final UserSessionMapper mapper;
    private final Clock clock;

    public UserSessionService(UserSessionRepository repository, UserSessionMapper mapper, Clock clock) {
        this.repository = repository;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public UserSessionDto join(String sessionId, String requestedUsername) {
        String username = requestedUsername.trim();
        if (repository.findBySessionId(sessionId).filter(UserSession::isConnected).isPresent()) {
            throw new BusinessRuleException("Ya te has unido al chat con esta conexión.");
        }
        if (repository.existsByUsernameAndStatus(username, ConnectionStatus.CONNECTED)) {
            throw new BusinessRuleException("El nombre de usuario '" + username + "' ya está en uso.");
        }
        UserSession session = repository.save(new UserSession(username, sessionId, Instant.now(clock)));
        return mapper.toDto(session);
    }

    // Empty when the session never joined or was already closed.
    @Transactional
    public Optional<UserSessionDto> disconnect(String sessionId) {
        return repository.findBySessionId(sessionId)
                .filter(UserSession::isConnected)
                .map(session -> {
                    session.disconnect();
                    return mapper.toDto(repository.save(session));
                });
    }

    @Transactional(readOnly = true)
    public String requireConnectedUsername(String sessionId) {
        return repository.findBySessionId(sessionId)
                .filter(UserSession::isConnected)
                .map(UserSession::getUsername)
                .orElseThrow(() -> new BusinessRuleException("Debes unirte al chat antes de enviar mensajes."));
    }

    @Transactional(readOnly = true)
    public List<UserSessionDto> findConnected() {
        return repository.findByStatusOrderByConnectionTimeAsc(ConnectionStatus.CONNECTED).stream()
                .map(mapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countConnected() {
        return repository.countByStatus(ConnectionStatus.CONNECTED);
    }
}
