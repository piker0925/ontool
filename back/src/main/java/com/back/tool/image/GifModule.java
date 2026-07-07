package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.FileImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class GifModule implements ToolModule {

    @Override
    public String getId() { return "gif-create"; }

    @Override
    public String getName() { return "GIF 생성"; }

    @Override
    public String getCategory() { return "image"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        try {
            int delayMs = Integer.parseInt(input.params().getOrDefault("delay", "100"));
            int delayCs = delayMs / 10; // centiseconds

            Path output = Files.createTempFile("gif-", ".gif");
            ImageWriter writer = ImageIO.getImageWritersByFormatName("gif").next();

            try (FileImageOutputStream stream = new FileImageOutputStream(output.toFile())) {
                writer.setOutput(stream);
                writer.prepareWriteSequence(null);

                for (Path framePath : input.files()) {
                    BufferedImage frame = ImageIO.read(framePath.toFile());
                    IIOMetadata meta = buildFrameMetadata(writer, frame, delayCs);
                    writer.writeToSequence(new IIOImage(frame, null, meta), null);
                }
                writer.endWriteSequence();
            }
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("GIF 생성 실패: " + e.getMessage(), e);
        }
    }

    private IIOMetadata buildFrameMetadata(ImageWriter writer, BufferedImage frame, int delayCs) throws IOException {
        IIOMetadata meta = writer.getDefaultImageMetadata(
                ImageTypeSpecifier.createFromRenderedImage(frame), null);
        String format = meta.getNativeMetadataFormatName();
        IIOMetadataNode root = (IIOMetadataNode) meta.getAsTree(format);

        // Graphic Control Extension — frame delay + disposal
        IIOMetadataNode gce = getOrCreate(root, "GraphicControlExtension");
        gce.setAttribute("disposalMethod", "restoreToBackgroundColor");
        gce.setAttribute("userInputFlag", "FALSE");
        gce.setAttribute("transparentColorFlag", "FALSE");
        gce.setAttribute("delayTime", String.valueOf(delayCs));
        gce.setAttribute("transparentColorIndex", "0");

        // Application Extension — loop forever
        IIOMetadataNode appExts = getOrCreate(root, "ApplicationExtensions");
        IIOMetadataNode appExt = new IIOMetadataNode("ApplicationExtension");
        appExt.setAttribute("applicationID", "NETSCAPE");
        appExt.setAttribute("authenticationCode", "2.0");
        appExt.setUserObject(new byte[]{0x1, 0x0, 0x0}); // loop count = 0 (infinite)
        appExts.appendChild(appExt);

        meta.setFromTree(format, root);
        return meta;
    }

    private IIOMetadataNode getOrCreate(IIOMetadataNode root, String nodeName) {
        NodeList nodes = root.getElementsByTagName(nodeName);
        if (nodes.getLength() > 0) return (IIOMetadataNode) nodes.item(0);
        IIOMetadataNode node = new IIOMetadataNode(nodeName);
        root.appendChild(node);
        return node;
    }
}
