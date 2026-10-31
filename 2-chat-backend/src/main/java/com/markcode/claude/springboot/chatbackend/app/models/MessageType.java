package com.markcode.claude.springboot.chatbackend.app.models;

// Kind of event travelling to clients: CHAT is a user message, the others are system events.
public enum MessageType {
    CHAT,
    USER_CONNECTED,
    USER_DISCONNECTED
}
