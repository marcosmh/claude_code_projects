package com.markcode.claude.springboot.chatbackend.app;

import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageDto;
import com.markcode.claude.springboot.chatbackend.app.dto.ChatMessageRequest;
import com.markcode.claude.springboot.chatbackend.app.dto.ErrorDto;
import com.markcode.claude.springboot.chatbackend.app.dto.JoinRequest;
import com.markcode.claude.springboot.chatbackend.app.dto.UserSessionDto;
import com.markcode.claude.springboot.chatbackend.app.models.ConnectionStatus;
import com.markcode.claude.springboot.chatbackend.app.services.ChatMessageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StompMessagingIntegrationTest {

    @LocalServerPort
    private int port;
    @Autowired
    private ChatMessageService messageService;

    private final List<WebSocketStompClient> clients = new ArrayList<>();

    @AfterEach
    void stopClients() {
        clients.forEach(WebSocketStompClient::stop);
    }

    @Test
    void messageSentByOneUserReachesTheOthersAndIsPersisted() throws Exception {
        StompSession ana = connect();
        StompSession beto = connect();
        BlockingQueue<UserSessionDto> presence = subscribe(ana, "/topic/presence", UserSessionDto.class);
        BlockingQueue<ChatMessageDto> betoInbox = subscribe(beto, "/topic/messages", ChatMessageDto.class);

        // Frames from different sessions are handled concurrently, so join one at a time to keep the order.
        ana.send("/app/chat.join", new JoinRequest("ana-msg"));
        assertThat(presence.poll(5, TimeUnit.SECONDS).username()).isEqualTo("ana-msg");
        beto.send("/app/chat.join", new JoinRequest("beto-msg"));
        assertThat(presence.poll(5, TimeUnit.SECONDS).username()).isEqualTo("beto-msg");

        ana.send("/app/chat.send", new ChatMessageRequest("hola beto"));

        ChatMessageDto received = betoInbox.poll(5, TimeUnit.SECONDS);
        assertThat(received).isNotNull();
        assertThat(received.username()).isEqualTo("ana-msg");
        assertThat(received.content()).isEqualTo("hola beto");
        assertThat(received.timestamp()).isNotNull();
        assertThat(messageService.history(200)).extracting(ChatMessageDto::content).contains("hola beto");
    }

    @Test
    void duplicateUsernameIsRejectedOnlyForTheOffendingSession() throws Exception {
        StompSession first = connect();
        StompSession second = connect();
        BlockingQueue<UserSessionDto> presence = subscribe(first, "/topic/presence", UserSessionDto.class);
        BlockingQueue<ErrorDto> errors = subscribe(second, "/user/queue/errors", ErrorDto.class);

        first.send("/app/chat.join", new JoinRequest("dup-user"));
        assertThat(presence.poll(5, TimeUnit.SECONDS).username()).isEqualTo("dup-user");
        second.send("/app/chat.join", new JoinRequest("dup-user"));

        ErrorDto error = errors.poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.message()).contains("dup-user");
        assertThat(presence.poll(500, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void sendingWithoutJoiningReturnsAnError() throws Exception {
        StompSession lurker = connect();
        BlockingQueue<ErrorDto> errors = subscribe(lurker, "/user/queue/errors", ErrorDto.class);

        lurker.send("/app/chat.send", new ChatMessageRequest("hola"));

        assertThat(errors.poll(5, TimeUnit.SECONDS)).isNotNull();
    }

    @Test
    void disconnectingPublishesPresenceAndUpdatesConnectedUsers() throws Exception {
        StompSession watcher = connect();
        StompSession leaver = connect();
        BlockingQueue<UserSessionDto> presence = subscribe(watcher, "/topic/presence", UserSessionDto.class);

        leaver.send("/app/chat.join", new JoinRequest("leaver"));
        assertThat(presence.poll(5, TimeUnit.SECONDS).status()).isEqualTo(ConnectionStatus.CONNECTED);

        leaver.disconnect();

        UserSessionDto left = presence.poll(5, TimeUnit.SECONDS);
        assertThat(left).isNotNull();
        assertThat(left.username()).isEqualTo("leaver");
        assertThat(left.status()).isEqualTo(ConnectionStatus.DISCONNECTED);
    }

    private StompSession connect() throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new JacksonJsonMessageConverter());
        clients.add(client);
        StompSession session = client.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() {
        }).get(5, TimeUnit.SECONDS);
        return session;
    }

    // The simple broker sends no SUBSCRIBE receipt, so give the subscription a moment to register.
    private <T> BlockingQueue<T> subscribe(StompSession session, String destination, Class<T> type) throws Exception {
        BlockingQueue<T> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return type;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((T) payload);
            }
        });
        Thread.sleep(300);
        return queue;
    }
}
