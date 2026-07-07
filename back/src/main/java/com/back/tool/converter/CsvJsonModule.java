package com.back.tool.converter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Component
public class CsvJsonModule implements ToolModule {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    public String getId() { return "csv-json"; }

    @Override
    public String getName() { return "CSV ↔ JSON 변환"; }

    @Override
    public String getCategory() { return "converter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        String text = input.params().getOrDefault("input", "");
        String direction = input.params().getOrDefault("direction", "csv-to-json");
        try {
            if ("json-to-csv".equals(direction)) {
                return ToolResult.ofText(jsonToCsv(text));
            } else {
                return ToolResult.ofText(csvToJson(text));
            }
        } catch (Exception e) {
            throw new ToolProcessingException("변환 실패: " + e.getMessage(), e);
        }
    }

    private String csvToJson(String csv) throws Exception {
        CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .build()
                .parse(new StringReader(csv));

        List<Map<String, String>> rows = new ArrayList<>();
        for (CSVRecord record : parser) rows.add(record.toMap());
        return JSON.writerWithDefaultPrettyPrinter().writeValueAsString(rows);
    }

    private String jsonToCsv(String json) throws Exception {
        JsonNode array = JSON.readTree(json);
        if (!array.isArray() || !array.iterator().hasNext()) return "";

        List<String> headers = new ArrayList<>();
        array.get(0).fieldNames().forEachRemaining(headers::add);

        StringWriter sw = new StringWriter();
        CSVPrinter printer = CSVFormat.DEFAULT.builder()
                .setHeader(headers.toArray(new String[0]))
                .build()
                .print(sw);

        for (JsonNode row : array) {
            List<String> values = new ArrayList<>();
            for (String h : headers) {
                JsonNode val = row.get(h);
                values.add(val == null ? "" : val.asText());
            }
            printer.printRecord(values);
        }
        printer.flush();
        return sw.toString();
    }
}
