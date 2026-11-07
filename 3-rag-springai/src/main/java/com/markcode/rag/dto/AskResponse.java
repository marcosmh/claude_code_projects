package com.markcode.rag.dto;

import java.util.List;

public record AskResponse(String answer, List<SourceDto> sources) {
}
