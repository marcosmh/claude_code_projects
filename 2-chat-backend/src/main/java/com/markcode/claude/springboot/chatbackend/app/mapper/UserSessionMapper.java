package com.markcode.claude.springboot.chatbackend.app.mapper;

import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.models.UserSession;
import org.springframework.stereotype.Component;

@Component
public class UserSessionMapper {

    public UserSessionDto toDto(UserSession entity) {
        return new UserSessionDto(entity.getUsername(), entity.getConnectionTime(), entity.getStatus());
    }
}
