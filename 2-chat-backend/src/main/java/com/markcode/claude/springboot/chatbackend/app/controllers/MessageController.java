package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.services.ChatMessageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final ChatMessageService messages;

    public MessageController(ChatMessageService messages) {
        this.messages = messages;
    }

    @GetMapping
    public List<ChatMessageDto> history(@RequestParam(required = false) Integer limit) {
        return messages.history(limit);
    }
}
