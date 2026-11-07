package com.markcode.rag.repository;

import com.markcode.rag.model.DocumentMetadata;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentMetadata, UUID> {
}
