package com.back.tool.text;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class CaseConverterModule implements ToolModule {

    private static final Set<String> FORMATS = Set.of(
            "camel", "pascal", "snake", "kebab", "constant", "dot", "title"
    );

    @Override
    public String getId() { return "case-converter"; }

    @Override
    public String getName() { return "케이스 변환기"; }

    @Override
    public String getCategory() { return "text"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        String from = params.getString("from", "camel");
        String to = params.getString("to", "snake");

        if (!FORMATS.contains(from) || !FORMATS.contains(to)) {
            throw new ToolProcessingException("지원하지 않는 케이스 형식: from=" + from + " to=" + to);
        }
        return ToolResult.ofText(join(split(text, from), to));
    }

    /** from 형식 기준으로 소문자 단어 리스트로 분해한다. */
    private List<String> split(String text, String from) {
        if (text.isEmpty()) return List.of();
        return switch (from) {
            case "camel", "pascal" -> splitCamel(text);
            case "snake", "constant" -> lowerWords(text.split("_+"));
            case "kebab" -> lowerWords(text.split("-+"));
            case "dot" -> lowerWords(text.split("\\.+"));
            case "title" -> lowerWords(text.split("\\s+"));
            default -> throw new IllegalStateException("unreachable: " + from);
        };
    }

    private static List<String> splitCamel(String text) {
        List<String> words = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (Character.isUpperCase(c) && !current.isEmpty()) {
                words.add(current.toString().toLowerCase(Locale.ROOT));
                current.setLength(0);
            }
            current.append(c);
        }
        if (!current.isEmpty()) words.add(current.toString().toLowerCase(Locale.ROOT));
        return words;
    }

    private static List<String> lowerWords(String[] parts) {
        return Arrays.stream(parts)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .toList();
    }

    private String join(List<String> words, String to) {
        return switch (to) {
            case "camel" -> {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < words.size(); i++) {
                    sb.append(i == 0 ? words.get(i) : capitalize(words.get(i)));
                }
                yield sb.toString();
            }
            case "pascal" -> words.stream().map(CaseConverterModule::capitalize).collect(Collectors.joining());
            case "snake" -> String.join("_", words);
            case "kebab" -> String.join("-", words);
            case "constant" -> words.stream()
                    .map(w -> w.toUpperCase(Locale.ROOT))
                    .collect(Collectors.joining("_"));
            case "dot" -> String.join(".", words);
            case "title" -> words.stream().map(CaseConverterModule::capitalize).collect(Collectors.joining(" "));
            default -> throw new IllegalStateException("unreachable: " + to);
        };
    }

    private static String capitalize(String word) {
        if (word.isEmpty()) return word;
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }
}
