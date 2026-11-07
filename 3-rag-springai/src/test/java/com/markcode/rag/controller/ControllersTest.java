package com.markcode.rag.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.markcode.rag.dto.AskResponse;
import com.markcode.rag.dto.DocumentResponse;
import com.markcode.rag.dto.SourceDto;
import com.markcode.rag.exception.GlobalExceptionHandler;
import com.markcode.rag.exception.InvalidDocumentException;
import com.markcode.rag.service.DocumentIngestionService;
import com.markcode.rag.service.RagService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({DocumentController.class, RagController.class})
@Import(GlobalExceptionHandler.class)
class ControllersTest {

    @Autowired
    MockMvc mvc;
    @MockitoBean
    DocumentIngestionService ingestionService;
    @MockitoBean
    RagService ragService;

    @Test
    void uploadReturns201WithMetadata() throws Exception {
        UUID id = UUID.randomUUID();
        when(ingestionService.ingest(any())).thenReturn(new DocumentResponse(id, "a.pdf", Instant.now(), 2, 100, 4));

        mvc.perform(multipart("/api/documents/upload")
                        .file(new MockMultipartFile("file", "a.pdf", "application/pdf", "%PDF-".getBytes())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.pageCount").value(2));
    }

    @Test
    void uploadWithoutFileReturns400() throws Exception {
        mvc.perform(multipart("/api/documents/upload")).andExpect(status().isBadRequest());
    }

    @Test
    void uploadInvalidPdfReturns400() throws Exception {
        when(ingestionService.ingest(any())).thenThrow(new InvalidDocumentException("no es PDF"));

        mvc.perform(multipart("/api/documents/upload")
                        .file(new MockMultipartFile("file", "a.pdf", "application/pdf", "x".getBytes())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("no es PDF"));
    }

    @Test
    void askReturnsAnswerAndSources() throws Exception {
        when(ragService.ask("hola")).thenReturn(new AskResponse("respuesta",
                List.of(new SourceDto(UUID.randomUUID(), "a.pdf", 1, 0.8, "snippet"))));

        mvc.perform(post("/api/rag/ask").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"hola\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("respuesta"))
                .andExpect(jsonPath("$.sources[0].fileName").value("a.pdf"));
    }

    @Test
    void askWithBlankQuestionReturns400() throws Exception {
        mvc.perform(post("/api/rag/ask").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0]").exists());
    }
}
