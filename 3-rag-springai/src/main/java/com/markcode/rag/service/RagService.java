package com.markcode.rag.service;

import com.markcode.rag.config.RagProperties;
import com.markcode.rag.dto.AskResponse;
import com.markcode.rag.dto.SourceDto;
import com.markcode.rag.repository.VectorStoreRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

@Service
public class RagService {

    static final String NO_INFORMATION = "No encontré información relevante en los documentos indexados para responder la pregunta.";

    private static final Logger log = LoggerFactory.getLogger(RagService.class);
    private static final Pattern THINK_BLOCK = Pattern.compile("(?s)<think>.*?</think>");
    private static final int SNIPPET_LENGTH = 200;

    private static final String SYSTEM_PROMPT = """
            Eres un asistente legal especializado en litigios, arbitrajes y resolución de controversias.

            Tu única fuente de información es el contexto recuperado desde la base de datos RAG. Debes responder exclusivamente utilizando la información proporcionada en dicho contexto.

            Además de responder la consulta, debes sugerir una posible estrategia legal basada en la información recuperada, indicando claramente los elementos que sustentan dicha recomendación.

            Si el contexto recuperado no contiene información suficiente para responder con certeza, indícalo explícitamente. Nunca inventes hechos, argumentos, evidencias, normas, cláusulas contractuales ni conclusiones que no estén presentes en el contexto.

            Cuando sea posible, clasifica el caso en una de las siguientes categorías legales:

            - Arbitraje comercial
            - Arbitraje internacional
            - Litigio civil
            - Mediación
            - Incumplimiento contractual

            El formato de respuesta debe ser el siguiente:

            Categoría:
            [Categoría identificada o "No determinada"]

            Resumen:
            [Resumen de los hallazgos encontrados en el contexto]

            Análisis:
            [Análisis basado únicamente en el contexto recuperado]

            Estrategia sugerida:
            [Recomendaciones o estrategia sugerida sustentada en el contexto]

            Nivel de confianza:
            [Alto, Medio o Bajo]

            Fuentes utilizadas:
            [Listado de documentos o fragmentos recuperados]

            Si no existe información suficiente para determinar la categoría o formular una estrategia, indícalo claramente y explica qué información adicional sería necesaria.
            """;
            

    private final VectorStoreRepository vectorStoreRepository;
    private final ChatClient chatClient;
    private final RagProperties properties;

    public RagService(VectorStoreRepository vectorStoreRepository, ChatClient chatClient, RagProperties properties) {
        this.vectorStoreRepository = vectorStoreRepository;
        this.chatClient = chatClient;
        this.properties = properties;
    }

    public AskResponse ask(String question) {
        List<Document> relevant = vectorStoreRepository.similaritySearch(
                question, properties.topK(), properties.similarityThreshold());
        log.atInfo().addKeyValue("fragments", relevant.size()).log("Fragmentos recuperados");

        if (relevant.isEmpty()) {
            return new AskResponse(NO_INFORMATION, List.of());
        }

        String context = relevant.stream()
                .map(doc -> "[%s, p. %s]%n%s".formatted(
                        doc.getMetadata().get(VectorStoreRepository.FILE_NAME),
                        doc.getMetadata().getOrDefault(VectorStoreRepository.PAGE, "?"),
                        doc.getText()))
                .collect(Collectors.joining("\n\n---\n\n"));

        // "/no_think" desactiva el razonamiento de qwen3 (menor latencia); igualmente se limpia la salida.
        String userPrompt = "Contexto:\n" + context + "\n\nPregunta: " + question + "\n\n/no_think";

        String raw = chatClient.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .content();

        return new AskResponse(clean(raw), relevant.stream().map(this::toSource).toList());
    }

    static String clean(String raw) {
        if (raw == null) {
            return NO_INFORMATION;
        }
        String cleaned = THINK_BLOCK.matcher(raw).replaceAll("").strip();
        return cleaned.isEmpty() ? NO_INFORMATION : cleaned;
    }

    private SourceDto toSource(Document doc) {
        Object id = doc.getMetadata().get(VectorStoreRepository.DOCUMENT_ID);
        Object page = doc.getMetadata().get(VectorStoreRepository.PAGE);
        String text = Objects.requireNonNullElse(doc.getText(), "");
        String snippet = text.length() > SNIPPET_LENGTH ? text.substring(0, SNIPPET_LENGTH) + "…" : text;
        return new SourceDto(
                id == null ? null : UUID.fromString(id.toString()),
                Objects.toString(doc.getMetadata().get(VectorStoreRepository.FILE_NAME), null),
                page instanceof Number n ? n.intValue() : null,
                doc.getScore(),
                snippet);
    }
}
