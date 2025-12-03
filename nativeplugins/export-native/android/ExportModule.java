package com.cwriter.export;

import android.util.Log;
import com.alibaba.fastjson.JSONObject;
import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.bridge.UniJSCallback;
import io.dcloud.feature.uniapp.common.UniModule;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Export Module - Provide PDF and DOCX export functions
 * 
 * Use Apache PDFBox to generate PDF (open source free)
 * Use Apache POI to generate DOCX
 */
public class ExportModule extends UniModule {
    
    private static final String TAG = "ExportModule";
    
    /**
     * Internal method that actually executes PDF export logic
     * Reused for both asynchronous callback and synchronous call methods
     */
    private JSONObject doExportPDF(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        try {
            String title = options.getString("title");
            String content = options.getString("content");
            String savePath = options.getString("savePath");
            
            Log.d(TAG, "Start exporting PDF: " + savePath);
            Log.d(TAG, "Title: " + title);
            Log.d(TAG, "Content length: " + (content != null ? content.length() : 0) + " characters");
            
            // Validate parameters
            if (title == null) title = "Untitled Document";
            if (content == null) content = "";
            if (savePath == null || savePath.isEmpty()) {
                Log.e(TAG, "Save path is empty");
                result.put("success", false);
                result.put("error", "Save path cannot be empty");
                return result;
            }
            
            // Ensure directory exists
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            if (parentDir != null && !parentDir.exists()) {
                parentDir.mkdirs();
            }
            
            // Create PDF document
            PDDocument document = new PDDocument();
            PDPage page = new PDPage();
            document.addPage(page);
            
            // Create content stream
            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            
            // Set fonts - PDFBox standard fonts don't support Chinese, use English as alternative
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font contentFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            
            Log.d(TAG, "Font setup completed, starting content processing");
            
            // Page dimensions (A4)
            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float margin = 50;
            float yPosition = pageHeight - margin;
            float lineHeight = 20;
            float titleFontSize = 18;
            float contentFontSize = 12;
            
            // Add title
            contentStream.beginText();
            contentStream.setFont(titleFont, titleFontSize);
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText(title);
            contentStream.endText();
            yPosition -= (titleFontSize + 10);
            
            // Add content
            contentStream.setFont(contentFont, contentFontSize);
            String[] lines = content.split("\n");
            for (String line : lines) {
                // Check if new page is needed
                if (yPosition < margin + lineHeight) {
                    contentStream.close();
                    page = new PDPage();
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    contentStream.setFont(contentFont, contentFontSize);
                    yPosition = pageHeight - margin;
                }
                
                // Handle long lines (auto wrap)
                if (line.length() > 80) {
                    // Simple line wrapping
                    int maxWidth = 80;
                    for (int i = 0; i < line.length(); i += maxWidth) {
                        int end = Math.min(i + maxWidth, line.length());
                        String subLine = line.substring(i, end);
                        
                        if (yPosition < margin + lineHeight) {
                            contentStream.close();
                            page = new PDPage();
                            document.addPage(page);
                            contentStream = new PDPageContentStream(document, page);
                            contentStream.setFont(contentFont, contentFontSize);
                            yPosition = pageHeight - margin;
                        }
                        
                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, yPosition);
                        contentStream.showText(subLine);
                        contentStream.endText();
                        yPosition -= lineHeight;
                    }
                } else {
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText(line);
                    contentStream.endText();
                    yPosition -= lineHeight;
                }
            }
            
            contentStream.close();
            
            // Save file
            Log.d(TAG, "Starting PDF file save...");
            document.save(file);
            document.close();
            
            long endTime = System.currentTimeMillis();
            Log.d(TAG, "PDF export successful: " + savePath + ", time taken: " + (endTime - startTime) + "ms");
            
            // Return success
            result.put("success", true);
            result.put("path", savePath);
            result.put("duration", endTime - startTime);
            return result;
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "PDF export failed, time: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }

    /**
     * Export to PDF (Standard Uni plugin asynchronous callback method)
     *
     * @param options  JSON object containing title, content, savePath
     * @param callback Callback function
     */
    @UniJSMethod(uiThread = false)
    public void exportToPDF(JSONObject options, UniJSCallback callback) {
        JSONObject result = doExportPDF(options);
        if (callback != null) {
            callback.invoke(result);
        }
    }

    /**
     * Export to PDF - Synchronous version
     * For direct instance calls via plus.android.importClass
     *
     * @param options JSON object containing title, content, savePath
     * @return Result JSON object, structure consistent with async callback
     */
    @UniJSMethod(uiThread = false)
    public JSONObject exportToPDFSync(JSONObject options) {
        return doExportPDF(options);
    }
    
    /**
     * Internal method that actually executes DOCX export logic
     * Reused for both asynchronous callback and synchronous call methods
     */
    private JSONObject doExportDOCX(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        try {
            String title = options.getString("title");
            String content = options.getString("content");
            String savePath = options.getString("savePath");
            
            Log.d(TAG, "Start exporting DOCX: " + savePath);
            Log.d(TAG, "Title: " + title);
            Log.d(TAG, "Content length: " + (content != null ? content.length() : 0) + " characters");
            
            // Validate parameters
            if (title == null) title = "Untitled Document";
            if (content == null) content = "";
            if (savePath == null || savePath.isEmpty()) {
                result.put("success", false);
                result.put("error", "Save path cannot be empty");
                return result;
            }
            
            // Ensure directory exists
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            if (parentDir != null && !parentDir.exists()) {
                parentDir.mkdirs();
            }
            
            // Create DOCX document
            XWPFDocument document = new XWPFDocument();
            
            // Add title
            XWPFParagraph titlePara = document.createParagraph();
            titlePara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(title);
            titleRun.setBold(true);
            titleRun.setFontSize(18);
            
            // Add empty line
            document.createParagraph();
            
            // Add content
            String[] lines = content.split("\n");
            for (String line : lines) {
                XWPFParagraph para = document.createParagraph();
                XWPFRun run = para.createRun();
                run.setText(line);
                run.setFontSize(12);
            }
            
            // Save file
            Log.d(TAG, "Starting DOCX file save...");
            FileOutputStream out = new FileOutputStream(file);
            document.write(out);
            out.close();
            document.close();
            
            long endTime = System.currentTimeMillis();
            Log.d(TAG, "DOCX export successful: " + savePath + ", time taken: " + (endTime - startTime) + "ms");
            
            // Return success
            result.put("success", true);
            result.put("path", savePath);
            result.put("duration", endTime - startTime);
            return result;
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "DOCX export failed, time: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }

    /**
     * Export to DOCX (Standard Uni plugin asynchronous callback method)
     *
     * @param options  JSON object containing title, content, savePath
     * @param callback Callback function
     */
    @UniJSMethod(uiThread = false)
    public void exportToDOCX(JSONObject options, UniJSCallback callback) {
        JSONObject result = doExportDOCX(options);
        if (callback != null) {
            callback.invoke(result);
        }
    }

    /**
     * Export to DOCX - Synchronous version
     * For direct instance calls via plus.android.importClass
     *
     * @param options JSON object containing title, content, savePath
     * @return Result JSON object, structure consistent with async callback
     */
    @UniJSMethod(uiThread = false)
    public JSONObject exportToDOCXSync(JSONObject options) {
        return doExportDOCX(options);
    }
}




