package com.markcode.rag.exception;

/** Fallo interno al procesar o indexar un documento (HTTP 500). */
public class DocumentProcessingException extends RuntimeException {

    public DocumentProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
