package com.markcode.rag.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Repository;

/** Acceso al almacén vectorial (pgvector). El VectorStore genera los embeddings con el EmbeddingModel configurado. */
@Repository
public class VectorStoreRepository {

    public static final String DOCUMENT_ID = "documentId";
    public static final String FILE_NAME = "fileName";
    public static final String PAGE = "page";
    public static final String SOURCE = "source";
    public static final String CHUNK_INDEX = "chunkIndex";

    private final VectorStore vectorStore;

    public VectorStoreRepository(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void saveAll(List<Document> chunks) {
        vectorStore.add(chunks);
    }

    public List<Document> similaritySearch(String query, int topK, double similarityThreshold) {
        return vectorStore.similaritySearch(SearchRequest.builder()
                .query(query)
                .topK(topK)
                .similarityThreshold(similarityThreshold)
                .build());
    }

    public void deleteByDocumentId(UUID documentId) {
        vectorStore.delete(new FilterExpressionBuilder().eq(DOCUMENT_ID, documentId.toString()).build());
    }
}
