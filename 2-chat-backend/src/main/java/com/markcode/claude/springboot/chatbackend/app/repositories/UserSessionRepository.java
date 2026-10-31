package com.markcode.claude.springboot.chatbackend.app.repositories;

import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.models.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findBySessionId(String sessionId);

    List<UserSession> findByStatusOrderByConnectionTimeAsc(ConnectionStatus status);

    boolean existsByUsernameAndStatus(String username, ConnectionStatus status);

    long countByStatus(ConnectionStatus status);
}
