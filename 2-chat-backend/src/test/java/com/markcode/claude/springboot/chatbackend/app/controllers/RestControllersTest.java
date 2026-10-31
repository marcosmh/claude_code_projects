package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.config.AppProperties;
import com.markcode.claude.springboot.chatbackend.app.config.WebConfig;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.StatusDto;
import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.services.ChatMessageService;
import com.markcode.claude.springboot.chatbackend.app.services.StatusService;
import com.markcode.claude.springboot.chatbackend.app.services.UserSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({MessageController.class, UserController.class, StatusController.class})
@Import(WebConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class RestControllersTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");

    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private ChatMessageService messages;
    @MockitoBean
    private UserSessionService userSessions;
    @MockitoBean
    private StatusService statusService;

    @Test
    void historyReturnsMessagesAndPassesTheLimit() throws Exception {
        when(messages.history(10)).thenReturn(List.of(new ChatMessageDto(1L, "ana", "hola", NOW)));

        mvc.perform(get("/api/messages").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("ana"))
                .andExpect(jsonPath("$[0].content").value("hola"))
                .andExpect(jsonPath("$[0].timestamp").value("2026-10-30T10:00:00Z"));
        verify(messages).history(10);
    }

    @Test
    void connectedUsersDoNotExposeSessionIds() throws Exception {
        when(userSessions.findConnected()).thenReturn(List.of(new UserSessionDto("ana", NOW, ConnectionStatus.CONNECTED)));

        mvc.perform(get("/api/users/connected"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("ana"))
                .andExpect(jsonPath("$[0].status").value("CONNECTED"))
                .andExpect(jsonPath("$[0].sessionId").doesNotExist());
    }

    @Test
    void statusReportsApplicationState() throws Exception {
        when(statusService.status()).thenReturn(new StatusDto("UP", 2, 5, NOW));

        mvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.connectedUsers").value(2))
                .andExpect(jsonPath("$.totalMessages").value(5));
    }

    @Test
    void corsAllowsTheConfiguredFrontendOrigin() throws Exception {
        mvc.perform(options("/api/messages")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void corsRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/messages")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
