package com.markcode.rag.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Registro de un documento indexado. Los vectores viven en la tabla {@code vector_store}. */
@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentMetadata {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private Instant uploadedAt;

    @Column(nullable = false)
    private int pageCount;

    @Column(nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private int chunkCount;

    @Builder
    private DocumentMetadata(UUID id, String fileName, Instant uploadedAt, int pageCount, long sizeBytes, int chunkCount) {
        this.id = id;
        this.fileName = fileName;
        this.uploadedAt = uploadedAt;
        this.pageCount = pageCount;
        this.sizeBytes = sizeBytes;
        this.chunkCount = chunkCount;
    }
}
