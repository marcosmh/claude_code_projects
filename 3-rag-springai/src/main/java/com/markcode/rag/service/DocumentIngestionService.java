package com.markcode.rag.service;

import com.markcode.rag.dto.DocumentResponse;
import com.markcode.rag.exception.DocumentProcessingException;
import com.markcode.rag.exception.InvalidDocumentException;
import com.markcode.rag.mapper.DocumentMapper;
import com.markcode.rag.model.DocumentMetadata;
import com.markcode.rag.repository.DocumentRepository;
import com.markcode.rag.repository.VectorStoreRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TextSplitter;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentIngestionService {

    private static final Logger log = LoggerFactory.getLogger(DocumentIngestionService.class);
    private static final int MAX_FILE_NAME_LENGTH = 255;
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes();

    private final TextSplitter textSplitter;
    private final VectorStoreRepository vectorStoreRepository;
    private final DocumentRepository documentRepository;
    private final DocumentMapper documentMapper;

    public DocumentIngestionService(TextSplitter textSplitter, VectorStoreRepository vectorStoreRepository,
                                    DocumentRepository documentRepository, DocumentMapper documentMapper) {
        this.textSplitter = textSplitter;
        this.vectorStoreRepository = vectorStoreRepository;
        this.documentRepository = documentRepository;
        this.documentMapper = documentMapper;
    }

    public DocumentResponse ingest(MultipartFile file) {
        byte[] bytes = readBytes(file);
        UUID documentId = UUID.randomUUID();
        String fileName = sanitizeFileName(file.getOriginalFilename(), documentId);
        Instant uploadedAt = Instant.now();

        int pageCount = countPages(bytes);
        List<Document> pages = readPages(bytes, fileName, documentId, uploadedAt);
        List<Document> chunks = textSplitter.apply(pages);
        if (chunks.isEmpty()) {
            throw new InvalidDocumentException("No se pudo extraer texto del PDF (¿es un documento escaneado?)");
        }
        for (int i = 0; i < chunks.size(); i++) {
            Map<String, Object> metadata = chunks.get(i).getMetadata();
            metadata.put(VectorStoreRepository.SOURCE, fileName);
            metadata.put(VectorStoreRepository.DOCUMENT_ID, documentId.toString());
            metadata.put(VectorStoreRepository.CHUNK_INDEX, i);
        }

        vectorStoreRepository.saveAll(chunks);
        try {
            DocumentMetadata saved = documentRepository.save(DocumentMetadata.builder()
                    .id(documentId)
                    .fileName(fileName)
                    .uploadedAt(uploadedAt)
                    .pageCount(pageCount)
                    .sizeBytes(bytes.length)
                    .chunkCount(chunks.size())
                    .build());
            log.atInfo()
                    .addKeyValue("documentId", documentId)
                    .addKeyValue("fileName", fileName)
                    .addKeyValue("pages", pageCount)
                    .addKeyValue("chunks", chunks.size())
                    .log("Documento indexado");
            return documentMapper.toResponse(saved);
        } catch (RuntimeException ex) {
            vectorStoreRepository.deleteByDocumentId(documentId);
            throw new DocumentProcessingException("No se pudo registrar el documento", ex);
        }
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidDocumentException("El archivo está vacío");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < PDF_MAGIC.length || !startsWithPdfMagic(bytes)) {
                throw new InvalidDocumentException("El archivo no es un PDF válido");
            }
            return bytes;
        } catch (IOException ex) {
            throw new DocumentProcessingException("No se pudo leer el archivo subido", ex);
        }
    }

    private boolean startsWithPdfMagic(byte[] bytes) {
        for (int i = 0; i < PDF_MAGIC.length; i++) {
            if (bytes[i] != PDF_MAGIC[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Valida y normaliza el nombre recibido: quita rutas (cliente Windows/Unix), caracteres de control y
     * espacios sobrantes. Si queda vacío usa {@code documento-<uuid>.pdf} para garantizar un nombre único.
     */
    static String sanitizeFileName(String originalFilename, UUID documentId) {
        String name = originalFilename == null ? "" : originalFilename;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("\\p{Cntrl}", "").replaceAll("\\s+", " ").strip();
        if (name.length() > MAX_FILE_NAME_LENGTH) {
            name = name.substring(0, MAX_FILE_NAME_LENGTH);
        }
        return name.isEmpty() ? "documento-" + documentId + ".pdf" : name;
    }

    private int countPages(byte[] bytes) {
        try (PDDocument pdf = Loader.loadPDF(bytes)) {
            return pdf.getNumberOfPages();
        } catch (IOException ex) {
            throw new InvalidDocumentException("El archivo no es un PDF válido", ex);
        }
    }

    private List<Document> readPages(byte[] bytes, String fileName, UUID documentId, Instant uploadedAt) {
        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };
        List<Document> pages;
        try {
            pages = new PagePdfDocumentReader(resource).get();
        } catch (RuntimeException ex) {
            throw new InvalidDocumentException("No se pudo leer el contenido del PDF", ex);
        }
        return pages.stream()
                .map(page -> toNormalizedPage(page, fileName, documentId, uploadedAt))
                .filter(page -> page.getText() != null && !page.getText().isBlank())
                .toList();
    }

    private Document toNormalizedPage(Document page, String fileName, UUID documentId, Instant uploadedAt) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put(VectorStoreRepository.DOCUMENT_ID, documentId.toString());
        metadata.put(VectorStoreRepository.FILE_NAME, fileName);
        Object pageNumber = page.getMetadata().get(PagePdfDocumentReader.METADATA_START_PAGE_NUMBER);
        if (pageNumber != null) {
            metadata.put(VectorStoreRepository.PAGE, pageNumber);
        }
        metadata.put("uploadedAt", uploadedAt.toString());
        return new Document(normalize(page.getText()), metadata);
    }

    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.replace('\u0000', ' ')
                .replaceAll("[ \\t\\x0B\\f]+", " ")
                .replaceAll("[ ]*\\n[ ]*", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .strip();
    }
}
