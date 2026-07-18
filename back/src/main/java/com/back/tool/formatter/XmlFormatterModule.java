package com.back.tool.formatter;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;

@Component
public class XmlFormatterModule implements ToolModule {

    @Override
    public String getId() { return "xml-formatter"; }

    @Override
    public String getName() { return "XML 포맷터"; }

    @Override
    public String getCategory() { return "formatter"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String xml = params.requireString("xml");
        boolean minify = params.getBool("minify", false);
        int indentWidth = params.getInt("indentWidth", 2, 1, 8);
        boolean declaration = params.getBool("declaration", false);
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // 이 모듈은 순수 포맷터라 DOCTYPE/DTD가 필요 없다 — 통째로 막아 XXE(외부 엔티티로 로컬 파일
            // 읽기)와 billion-laughs류 엔티티 확장 DoS를 함께 차단한다 (CodeQL java/xxe).
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

            if (minify) removeWhitespaceNodes(doc.getDocumentElement());
            doc.setXmlStandalone(true); // 선언 출력 시 standalone="no"가 붙지 않도록

            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            transformerFactory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_DTD, "");
            transformerFactory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
            Transformer transformer = transformerFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, declaration ? "no" : "yes");
            if (declaration) {
                transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            }
            if (!minify) {
                transformer.setOutputProperty(OutputKeys.INDENT, "yes");
                transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount",
                        String.valueOf(indentWidth));
            }

            StringWriter writer = new StringWriter();
            transformer.transform(new DOMSource(doc), new StreamResult(writer));
            String result = writer.toString().trim();
            if (declaration && !minify) {
                // JDK Transformer는 선언 뒤에 줄바꿈을 넣지 않으므로 보정
                result = result.replaceFirst("\\?>\\s*", "?>\n");
            }
            return ToolResult.ofText(result);
        } catch (ToolProcessingException e) {
            throw e;
        } catch (Exception e) {
            throw new ToolProcessingException("XML 처리 실패: " + e.getMessage(), e);
        }
    }

    private void removeWhitespaceNodes(Node node) {
        NodeList children = node.getChildNodes();
        for (int i = children.getLength() - 1; i >= 0; i--) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.TEXT_NODE && child.getTextContent().isBlank()) {
                node.removeChild(child);
            } else {
                removeWhitespaceNodes(child);
            }
        }
    }
}
