package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.services.UserSessionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserSessionService userSessions;

    public UserController(UserSessionService userSessions) {
        this.userSessions = userSessions;
    }

    @GetMapping("/connected")
    public List<UserSessionDto> connected() {
        return userSessions.findConnected();
    }
}
