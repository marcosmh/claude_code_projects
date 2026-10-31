package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageRequest;
import com.markcode.claude.springboot.chatbackend.app.dto.ErrorDto;
import com.markcode.claude.springboot.chatbackend.app.dto.JoinRequest;
import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.exceptions.BusinessRuleException;
import com.markcode.claude.springboot.chatbackend.app.services.ChatMessageService;
import com.markcode.claude.springboot.chatbackend.app.services.UserSessionService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.validation.ObjectError;
import org.springframework.stereotype.Controller;

@Controller
public class ChatWebSocketController {

    private static final String ERRORS_QUEUE = "/queue/errors";

    private final UserSessionService userSessions;
    private final ChatMessageService messages;
    private final SimpMessagingTemplate messaging;

    public ChatWebSocketController(UserSessionService userSessions, ChatMessageService messages,
                                   SimpMessagingTemplate messaging) {
        this.userSessions = userSessions;
        this.messages = messages;
        this.messaging = messaging;
    }

    @MessageMapping("/chat.join")
    @SendTo("/topic/presence")
    public UserSessionDto join(@Valid @Payload JoinRequest request, SimpMessageHeaderAccessor headers) {
        return userSessions.join(headers.getSessionId(), request.username());
    }

    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public ChatMessageDto send(@Valid @Payload ChatMessageRequest request, SimpMessageHeaderAccessor headers) {
        return messages.send(headers.getSessionId(), request);
    }

    @MessageExceptionHandler(BusinessRuleException.class)
    public void handleBusinessRule(BusinessRuleException ex, SimpMessageHeaderAccessor headers) {
        replyError(headers.getSessionId(), ex.getMessage());
    }

    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    public void handleInvalidPayload(MethodArgumentNotValidException ex, SimpMessageHeaderAccessor headers) {
        String detail = ex.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(ObjectError::getDefaultMessage)
                .orElse("valor no válido");
        replyError(headers.getSessionId(), "Datos no válidos: " + detail);
    }

    // Errors go only to the session that caused them, addressed by session id (there is no Principal yet).
    private void replyError(String sessionId, String message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setSessionId(sessionId);
        accessor.setLeaveMutable(true);
        messaging.convertAndSendToUser(sessionId, ERRORS_QUEUE, new ErrorDto(message), accessor.getMessageHeaders());
    }
}
