package com.markcode.claude.springboot.chatbackend.app.repositories;

import com.markcode.claude.springboot.chatbackend.app.models.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Ids grow with insertion time, so id order is chronological order.
    List<ChatMessage> findAllByOrderByIdDesc(Pageable pageable);
}
