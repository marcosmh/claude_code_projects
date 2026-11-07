package com.markcode.rag.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.markcode.rag.PdfFixtures;
import com.markcode.rag.dto.DocumentResponse;
import com.markcode.rag.exception.DocumentProcessingException;
import com.markcode.rag.exception.InvalidDocumentException;
import com.markcode.rag.mapper.DocumentMapper;
import com.markcode.rag.model.DocumentMetadata;
import com.markcode.rag.repository.DocumentRepository;
import com.markcode.rag.repository.VectorStoreRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class DocumentIngestionServiceTest {

    @Mock
    VectorStoreRepository vectorStoreRepository;
    @Mock
    DocumentRepository documentRepository;
    @Captor
    ArgumentCaptor<List<Document>> chunksCaptor;

    DocumentIngestionService service;

    @BeforeEach
    void setUp() {
        service = new DocumentIngestionService(TokenTextSplitter.builder().withChunkSize(100).build(),
                vectorStoreRepository, documentRepository, new DocumentMapper());
    }

    @Test
    void ingestsPdfAndStoresChunksWithMetadata() {
        when(documentRepository.save(any(DocumentMetadata.class))).thenAnswer(inv -> inv.getArgument(0));
        byte[] pdf = PdfFixtures.pdf("Politica de vacaciones: 20 dias al año.", "Segunda pagina con mas texto.");
        MockMultipartFile file = new MockMultipartFile("file", "politicas.pdf", "application/pdf", pdf);

        DocumentResponse response = service.ingest(file);

        assertThat(response.fileName()).isEqualTo("politicas.pdf");
        assertThat(response.pageCount()).isEqualTo(2);
        assertThat(response.sizeBytes()).isEqualTo(pdf.length);
        assertThat(response.chunkCount()).isPositive();
        assertThat(response.id()).isNotNull();

        verify(vectorStoreRepository).saveAll(chunksCaptor.capture());
        assertThat(chunksCaptor.getValue()).allSatisfy(chunk -> {
            assertThat(chunk.getMetadata())
                    .containsEntry(VectorStoreRepository.DOCUMENT_ID, response.id().toString())
                    .containsEntry(VectorStoreRepository.FILE_NAME, "politicas.pdf");
            assertThat(chunk.getText()).isNotBlank();
        });
    }

    @Test
    void rejectsNonPdfContent() {
        MockMultipartFile file = new MockMultipartFile("file", "x.pdf", "application/pdf", "hola".getBytes());

        assertThatThrownBy(() -> service.ingest(file)).isInstanceOf(InvalidDocumentException.class);
        verify(vectorStoreRepository, never()).saveAll(any());
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "x.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.ingest(file)).isInstanceOf(InvalidDocumentException.class);
    }

    @Test
    void rejectsPdfWithoutText() {
        MockMultipartFile file = new MockMultipartFile("file", "blank.pdf", "application/pdf", PdfFixtures.pdf(" "));

        assertThatThrownBy(() -> service.ingest(file)).isInstanceOf(InvalidDocumentException.class);
        verify(vectorStoreRepository, never()).saveAll(any());
    }

    @Test
    void removesVectorsWhenMetadataPersistenceFails() {
        when(documentRepository.save(any(DocumentMetadata.class))).thenThrow(new IllegalStateException("db down"));
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", PdfFixtures.pdf("texto de prueba"));

        assertThatThrownBy(() -> service.ingest(file)).isInstanceOf(DocumentProcessingException.class);
        verify(vectorStoreRepository).deleteByDocumentId(any());
    }

    @Test
    void everyChunkCarriesValidatedSourceAndIndex() {
        when(documentRepository.save(any(DocumentMetadata.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile file = new MockMultipartFile("file", "C:\\docs\\ contrato  arbitraje.pdf ", "application/pdf",
                PdfFixtures.pdf("Clausula de arbitraje comercial.", "Segunda pagina."));

        DocumentResponse response = service.ingest(file);

        assertThat(response.fileName()).isEqualTo("contrato arbitraje.pdf");
        verify(vectorStoreRepository).saveAll(chunksCaptor.capture());
        List<Document> chunks = chunksCaptor.getValue();
        for (int i = 0; i < chunks.size(); i++) {
            assertThat(chunks.get(i).getMetadata())
                    .containsEntry("source", "contrato arbitraje.pdf")
                    .containsEntry("documentId", response.id().toString())
                    .containsEntry("chunkIndex", i);
        }
    }

    @Test
    void blankFileNameGetsUniqueDefault() {
        when(documentRepository.save(any(DocumentMetadata.class))).thenAnswer(inv -> inv.getArgument(0));
        MockMultipartFile file = new MockMultipartFile("file", "   ", "application/pdf", PdfFixtures.pdf("texto de prueba suficiente"));

        DocumentResponse response = service.ingest(file);

        assertThat(response.fileName()).isEqualTo("documento-" + response.id() + ".pdf");
    }

    @Test
    void sanitizeFileNameHandlesNullEmptyAndPaths() {
        java.util.UUID id = java.util.UUID.randomUUID();
        String fallback = "documento-" + id + ".pdf";
        assertThat(DocumentIngestionService.sanitizeFileName(null, id)).isEqualTo(fallback);
        assertThat(DocumentIngestionService.sanitizeFileName("", id)).isEqualTo(fallback);
        assertThat(DocumentIngestionService.sanitizeFileName(" \t ", id)).isEqualTo(fallback);
        assertThat(DocumentIngestionService.sanitizeFileName("../../etc/passwd.pdf", id)).isEqualTo("passwd.pdf");
        assertThat(DocumentIngestionService.sanitizeFileName("dir/", id)).isEqualTo(fallback);
    }

    @Test
    void normalizeCollapsesWhitespace() {
        assertThat(DocumentIngestionService.normalize("  a \t  b \n\n\n\n c  ")).isEqualTo("a b\n\nc");
    }
}
