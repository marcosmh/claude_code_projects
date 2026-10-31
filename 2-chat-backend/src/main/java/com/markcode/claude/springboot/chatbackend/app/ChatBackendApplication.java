package com.markcode.claude.springboot.chatbackend.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ChatBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChatBackendApplication.class, args);
	}

}
