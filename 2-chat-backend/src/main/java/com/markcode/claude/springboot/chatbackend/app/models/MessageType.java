package com.markcode.claude.springboot.chatbackend.app.models;

// Kind of event travelling to clients: CHAT is a user message, USER_CONNECTED/USER_DISCONNECTED are system notices and USER_TYPING/USER_STOPPED_TYPING are ephemeral typing state.
public enum MessageType {
    CHAT,
    USER_CONNECTED,
    USER_DISCONNECTED,
    USER_TYPING,
    USER_STOPPED_TYPING
}
