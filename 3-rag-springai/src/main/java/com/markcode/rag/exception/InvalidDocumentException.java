package com.markcode.rag.exception;

/** El archivo recibido no es un PDF válido o está vacío (HTTP 400). */
public class InvalidDocumentException extends RuntimeException {

    public InvalidDocumentException(String message) {
        super(message);
    }

    public InvalidDocumentException(String message, Throwable cause) {
        super(message, cause);
    }
}
