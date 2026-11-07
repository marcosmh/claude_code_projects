package com.markcode.rag.mapper;

import com.markcode.rag.dto.DocumentResponse;
import com.markcode.rag.model.DocumentMetadata;
import org.springframework.stereotype.Component;

@Component
public class DocumentMapper {

    public DocumentResponse toResponse(DocumentMetadata entity) {
        return new DocumentResponse(entity.getId(), entity.getFileName(), entity.getUploadedAt(),
                entity.getPageCount(), entity.getSizeBytes(), entity.getChunkCount());
    }
}
