package com.markcode.claude.springboot.chatbackend.app.controllers;

import com.markcode.claude.springboot.chatbackend.app.dto.StatusDto;
import com.markcode.claude.springboot.chatbackend.app.services.StatusService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/status")
public class StatusController {

    private final StatusService status;

    public StatusController(StatusService status) {
        this.status = status;
    }

    @GetMapping
    public StatusDto status() {
        return status.status();
    }
}
