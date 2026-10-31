package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.services.UserSessionService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

// WebSocket entry point for connection lifecycle events: delegates to the service and publishes presence.
@Component
public class WebSocketEventListener {

    private final UserSessionService userSessions;
    private final SimpMessagingTemplate messaging;

    public WebSocketEventListener(UserSessionService userSessions, SimpMessagingTemplate messaging) {
        this.userSessions = userSessions;
        this.messaging = messaging;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        userSessions.disconnect(event.getSessionId())
                .ifPresent(session -> messaging.convertAndSend("/topic/presence", session));
    }
}
