package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.services.UserSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.time.Instant;

// Lifecycle entry point: on startup closes the sessions a previous process left CONNECTED in the database.
@Component
public class StartupSessionListener {

    private static final Logger log = LoggerFactory.getLogger(StartupSessionListener.class);

    private final UserSessionService userSessions;

    public StartupSessionListener(UserSessionService userSessions) {
        this.userSessions = userSessions;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void closeStaleSessions() {
        // Anything connected before this JVM started cannot be a live socket of this process.
        Instant processStart = Instant.ofEpochMilli(ManagementFactory.getRuntimeMXBean().getStartTime());
        int closed = userSessions.closeStaleSessions(processStart);
        if (closed > 0) {
            log.info("Closed {} stale user session(s) left connected by a previous run", closed);
        }
    }
}
