package com.cwriter.export;

import android.os.Environment;
import android.util.Log;

import com.alibaba.fastjson.JSONObject;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * 直接导出工具类 - 基于测试项目中已验证的代码实现
 * 避免uni-app插件机制的复杂性，提供最可靠的导出功能
 */
public class ExportUtils {
    
    private static final String TAG = "ExportUtils";
    
    /**
     * 导出PDF文件 - 基于测试项目已验证的实现
     */
    public static JSONObject exportToPDFDirect(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        PdfDocument pdfDocument = null;
        Document document = null;
        PdfFont chineseFont = null;
        FileOutputStream fos = null;
        
        try {
            if (options == null) {
                Log.e(TAG, "Error: options parameter is null");
                result.put("success", false);
                result.put("error", "Options parameter is null");
                return result;
            }
            
            String title = options.getString("title");
            String content = options.getString("content");
            String savePath = options.getString("savePath");
            
            if (title == null) title = "Untitled Document";
            if (content == null) content = "";
            if (savePath == null || savePath.isEmpty()) {
                File testFile = createFile("direct_pdf", ".pdf");
                savePath = testFile.getAbsolutePath();
            }
            
            Log.d(TAG, "开始导出PDF: " + savePath);
            Log.d(TAG, "标题: " + title);
            Log.d(TAG, "内容长度: " + (content != null ? content.length() : 0) + " 字符");
            
            // 确保目录存在并检查权限
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            
            Log.d(TAG, "ExportUtils - 目标文件路径: " + file.getAbsolutePath());
            Log.d(TAG, "ExportUtils - 父目录路径: " + (parentDir != null ? parentDir.getAbsolutePath() : "null"));
            Log.d(TAG, "ExportUtils - 父目录存在: " + (parentDir != null ? parentDir.exists() : "false"));
            
            // 检查是否是系统受限目录
            if (savePath.startsWith("/storage/emulated/0/Download/") || 
                savePath.startsWith("/storage/emulated/0/Documents/")) {
                Log.w(TAG, "ExportUtils - 尝试访问系统受限目录，可能需要特殊权限");
                
                // 尝试切换到应用私有目录
                try {
                    String appPrivateDir = android.os.Environment.getExternalStorageDirectory() + "/Android/data/com.example.cwriter/files/CwriterExports";
                    File fallbackDir = new File(appPrivateDir);
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "ExportUtils - 切换到应用私有目录: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "ExportUtils - 创建应用私有目录失败", e);
                }
            }
            
            if (parentDir != null && !parentDir.exists()) {
                Log.d(TAG, "ExportUtils - 尝试创建父目录: " + parentDir.getAbsolutePath());
                boolean dirCreated = parentDir.mkdirs();
                Log.d(TAG, "ExportUtils - 目录创建结果: " + dirCreated + ", 现在存在: " + parentDir.exists());
            }
            
            // 检查目录权限
            if (parentDir != null) {
                boolean canRead = parentDir.canRead();
                boolean canWrite = parentDir.canWrite();
                boolean canExecute = parentDir.canExecute();
                Log.d(TAG, "ExportUtils - 父目录权限 - 读取: " + canRead + ", 写入: " + canWrite + ", 执行: " + canExecute);
                
                if (!canWrite) {
                    Log.w(TAG, "ExportUtils - 警告: 目标目录不可写入! 尝试使用备用目录");
                    // 尝试使用应用私有目录作为备用
                    File fallbackDir = new File(android.os.Environment.getExternalStorageDirectory(), "CwriterExports");
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "ExportUtils - 切换到备用路径: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                        Log.d(TAG, "ExportUtils - 新父目录权限 - 读取: " + parentDir.canRead() + ", 写入: " + parentDir.canWrite());
                    }
                }
            }
            
            // 创建PDF文档（使用测试项目已验证的方法）
            Log.d(TAG, "ExportUtils - 开始创建PDF文档...");
            try {
                fos = new FileOutputStream(file);
                Log.d(TAG, "ExportUtils - FileOutputStream创建成功");
                pdfDocument = new PdfDocument(new PdfWriter(fos));
                Log.d(TAG, "ExportUtils - PdfDocument创建成功");
                document = new Document(pdfDocument);
                Log.d(TAG, "ExportUtils - Document创建成功");
            } catch (Exception fosError) {
                Log.e(TAG, "ExportUtils - 创建FileOutputStream失败", fosError);
                // 手动关闭流
                if (fos != null) {
                    try {
                        fos.close();
                    } catch (Exception closeError) {
                        Log.w(TAG, "关闭FileOutputStream失败", closeError);
                    }
                }
                throw fosError;
            }
            
            // 尝试加载中文字体
            try {
                // 使用标准字体（支持中文的字体）
                chineseFont = PdfFontFactory.createFont("STSong-Light", "UniGB-UCS2-H");
                Log.d(TAG, "中文字体加载成功");
            } catch (Exception fontError) {
                Log.w(TAG, "STSong-Light字体加载失败，尝试备用字体", fontError);
                
                // 尝试其他字体方案
                try {
                    // 尝试使用内置字体常量（避免资源文件问题）
                    chineseFont = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.TIMES_ROMAN);
                    Log.d(TAG, "Times-Roman字体作为备用字体加载成功");
                } catch (Exception fallbackError) {
                    Log.w(TAG, "Times-Roman加载失败，尝试Helvetica", fallbackError);
                    try {
                        // 使用内置字体常量，避免资源文件问题
                        chineseFont = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
                        Log.d(TAG, "Helvetica字体作为备用字体加载成功");
                    } catch (Exception e) {
                        Log.w(TAG, "所有字体加载失败，将使用默认", e);
                        chineseFont = null;
                    }
                }
            }
            
            document.setMargins(50, 50, 50, 50);
            
            // 添加标题 - 使用try-catch确保即使字体失败也能继续
            try {
                Paragraph titlePara = new Paragraph(title);
                if (chineseFont != null) {
                    titlePara.setFont(chineseFont);
                }
                titlePara.setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
                document.add(titlePara);
            } catch (Exception e) {
                Log.w(TAG, "添加标题段落失败，继续", e);
            }
            
            // 添加导出时间
            try {
                Paragraph timePara = new Paragraph("导出时间: " + getCurrentTime());
                if (chineseFont != null) {
                    timePara.setFont(chineseFont);
                }
                timePara.setFontSize(12)
                    .setMarginBottom(15);
                document.add(timePara);
            } catch (Exception e) {
                Log.w(TAG, "添加时间段落失败，继续", e);
            }
            
            // 添加内容（处理换行）
            String[] lines = content.split("\n");
            for (String line : lines) {
                try {
                    if (line.trim().length() > 0) {
                        Paragraph contentPara = new Paragraph(line);
                        if (chineseFont != null) {
                            contentPara.setFont(chineseFont);
                        }
                        contentPara.setFontSize(12)
                            .setMarginBottom(5);
                        document.add(contentPara);
                    } else {
                        // 空行
                        Paragraph emptyPara = new Paragraph(" ");
                        if (chineseFont != null) {
                            emptyPara.setFont(chineseFont);
                        }
                        emptyPara.setFontSize(12);
                        document.add(emptyPara);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "添加内容行失败，跳过: " + line, e);
                    // 继续处理下一行
                }
            }
            
            // 关闭文档（按正确顺序关闭）
            if (document != null) {
                document.close();
                Log.d(TAG, "ExportUtils - Document关闭成功");
            }
            if (pdfDocument != null) {
                pdfDocument.close();
                Log.d(TAG, "ExportUtils - PdfDocument关闭成功");
            }
            if (fos != null) {
                fos.close();
                Log.d(TAG, "ExportUtils - FileOutputStream关闭成功");
            }
            
            long endTime = System.currentTimeMillis();
            
            result.put("success", true);
            result.put("path", savePath);
            result.put("duration", endTime - startTime);
            
            Log.d(TAG, "PDF导出成功: " + savePath + ", 耗时: " + (endTime - startTime) + "ms");
            return result;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "PDF导出失败, 耗时: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", "PDF导出失败: " + e.getMessage());
            result.put("duration", endTime - startTime);
            
            // 确保资源正确关闭
            try {
                if (document != null) {
                    try {
                        document.close();
                        Log.d(TAG, "ExportUtils - Document异常关闭成功");
                    } catch (Exception closeError) {
                        Log.w(TAG, "Document关闭异常", closeError);
                    }
                }
                if (pdfDocument != null) {
                    try {
                        pdfDocument.close();
                        Log.d(TAG, "ExportUtils - PdfDocument异常关闭成功");
                    } catch (Exception closeError) {
                        Log.w(TAG, "PdfDocument关闭异常", closeError);
                    }
                }
                // 注意：FileOutputStream在前面的try块中处理，这里不需要关闭
            } catch (Exception closeError) {
                Log.w(TAG, "PDF资源关闭错误", closeError);
            }
            
            return result;
        }
    }
    
    /**
     * 导出DOCX文件 - 基于测试项目已验证的实现
     */
    public static JSONObject exportToDOCXDirect(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        XWPFDocument document = null;
        FileOutputStream out = null;
        
        try {
            if (options == null) {
                Log.e(TAG, "Error: options parameter is null");
                result.put("success", false);
                result.put("error", "Options parameter is null");
                return result;
            }
            
            String title = options.getString("title");
            String content = options.getString("content");
            String savePath = options.getString("savePath");
            
            if (title == null) title = "Untitled Document";
            if (content == null) content = "";
            if (savePath == null || savePath.isEmpty()) {
                File testFile = createFile("direct_docx", ".docx");
                savePath = testFile.getAbsolutePath();
            }
            
            Log.d(TAG, "开始导出DOCX: " + savePath);
            Log.d(TAG, "标题: " + title);
            Log.d(TAG, "内容长度: " + (content != null ? content.length() : 0) + " 字符");
            
            // 确保目录存在并检查权限
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            
            Log.d(TAG, "ExportUtils - DOCX目标文件路径: " + file.getAbsolutePath());
            Log.d(TAG, "ExportUtils - DOCX父目录路径: " + (parentDir != null ? parentDir.getAbsolutePath() : "null"));
            Log.d(TAG, "ExportUtils - DOCX父目录存在: " + (parentDir != null ? parentDir.exists() : "false"));
            
            // 检查是否是系统受限目录
            if (savePath.startsWith("/storage/emulated/0/Download/") || 
                savePath.startsWith("/storage/emulated/0/Documents/")) {
                Log.w(TAG, "ExportUtils - DOCX尝试访问系统受限目录，可能需要特殊权限");
                
                // 尝试切换到应用私有目录
                try {
                    String appPrivateDir = android.os.Environment.getExternalStorageDirectory() + "/Android/data/com.example.cwriter/files/CwriterExports";
                    File fallbackDir = new File(appPrivateDir);
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "ExportUtils - DOCX切换到应用私有目录: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "ExportUtils - DOCX创建应用私有目录失败", e);
                }
            }
            
            if (parentDir != null && !parentDir.exists()) {
                Log.d(TAG, "ExportUtils - DOCX尝试创建父目录: " + parentDir.getAbsolutePath());
                boolean dirCreated = parentDir.mkdirs();
                Log.d(TAG, "ExportUtils - DOCX目录创建结果: " + dirCreated + ", 现在存在: " + parentDir.exists());
            }
            
            // 检查目录权限
            if (parentDir != null) {
                boolean canRead = parentDir.canRead();
                boolean canWrite = parentDir.canWrite();
                boolean canExecute = parentDir.canExecute();
                Log.d(TAG, "ExportUtils - DOCX父目录权限 - 读取: " + canRead + ", 写入: " + canWrite + ", 执行: " + canExecute);
                
                if (!canWrite) {
                    Log.w(TAG, "ExportUtils - DOCX警告: 目标目录不可写入! 尝试使用备用目录");
                    // 尝试使用应用私有目录作为备用
                    File fallbackDir = new File(android.os.Environment.getExternalStorageDirectory(), "CwriterExports");
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "ExportUtils - DOCX切换到备用路径: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                        Log.d(TAG, "ExportUtils - DOCX新父目录权限 - 读取: " + parentDir.canRead() + ", 写入: " + parentDir.canWrite());
                    } else {
                        throw new IOException("Directory is not writable: " + parentDir.getAbsolutePath());
                    }
                }
            }
            
            // 创建DOCX文档（使用测试项目已验证的方法）
            document = new XWPFDocument();
            Log.d(TAG, "ExportUtils: XWPFDocument created successfully");
            
            // 添加标题
            XWPFParagraph titlePara = document.createParagraph();
            titlePara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(title);
            titleRun.setBold(true);
            titleRun.setFontSize(18);
            Log.d(TAG, "ExportUtils: Title paragraph added");
            
            // 添加空行
            document.createParagraph();
            
            // 添加导出时间
            XWPFParagraph timePara = document.createParagraph();
            XWPFRun timeRun = timePara.createRun();
            timeRun.setText("导出时间: " + getCurrentTime());
            timeRun.setFontSize(12);
            Log.d(TAG, "ExportUtils: Time paragraph added");
            
            // 添加空行
            document.createParagraph();
            
            // 添加内容
            String[] lines = content.split("\n");
            Log.d(TAG, "ExportUtils: Adding content, lines count: " + lines.length);
            for (String line : lines) {
                XWPFParagraph para = document.createParagraph();
                XWPFRun run = para.createRun();
                run.setText(line.length() > 0 ? line : " ");
                run.setFontSize(12);
            }
            Log.d(TAG, "ExportUtils: Content paragraphs added");
            
            // 保存文件
            Log.d(TAG, "ExportUtils: Opening FileOutputStream: " + file.getAbsolutePath());
            out = new FileOutputStream(file);
            Log.d(TAG, "ExportUtils: FileOutputStream opened, writing document...");
            document.write(out);
            Log.d(TAG, "ExportUtils: Document written to file");
            out.flush();
            Log.d(TAG, "ExportUtils: FileOutputStream flushed");
            
            long endTime = System.currentTimeMillis();
            
            result.put("success", true);
            result.put("path", savePath);
            result.put("duration", endTime - startTime);
            
            Log.d(TAG, "DOCX导出成功: " + savePath + ", 耗时: " + (endTime - startTime) + "ms");
            return result;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "ExportUtils: DOCX导出失败, 耗时: " + (endTime - startTime) + "ms", e);
            Log.e(TAG, "ExportUtils: Exception type: " + e.getClass().getName());
            Log.e(TAG, "ExportUtils: Exception message: " + e.getMessage());
            if (e.getCause() != null) {
                Log.e(TAG, "ExportUtils: Exception cause: " + e.getCause().getMessage());
            }
            e.printStackTrace();
            result.put("success", false);
            result.put("error", "DOCX导出失败: " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
            
        } finally {
            // 确保资源正确关闭
            try {
                if (out != null) {
                    out.close();
                }
                if (document != null) {
                    document.close();
                }
            } catch (Exception closeError) {
                Log.w(TAG, "DOCX资源关闭错误", closeError);
            }
        }
    }
    
    /**
     * 字符串版本导出PDF - 避免JSONObject创建问题
     */
    public static JSONObject exportToPDFWithString(String jsonString) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        
        try {
            Log.d(TAG, "字符串版本PDF导出调用");
            Log.d(TAG, "接收JSON字符串长度: " + (jsonString != null ? jsonString.length() : 0));
            
            if (jsonString == null || jsonString.trim().isEmpty()) {
                Log.e(TAG, "JSON字符串为空或null");
                result.put("success", false);
                result.put("error", "JSON字符串为空或null");
                return result;
            }
            
            // 解析JSON字符串
            JSONObject options = null;
            try {
                // 直接使用fastjson解析
                com.alibaba.fastjson.JSONObject fastJson = com.alibaba.fastjson.JSONObject.parseObject(jsonString);
                if (fastJson == null) {
                    throw new Exception("Fastjson解析返回null");
                }
                
                // 创建新的JSONObject并复制数据
                options = new JSONObject();
                options.put("title", fastJson.getString("title"));
                options.put("content", fastJson.getString("content"));
                options.put("savePath", fastJson.getString("savePath"));
                
                Log.d(TAG, "JSON字符串解析成功");
                Log.d(TAG, "解析选项 - 标题: " + options.getString("title"));
                Log.d(TAG, "解析选项 - 内容长度: " + (options.getString("content") != null ? options.getString("content").length() : 0));
                Log.d(TAG, "解析选项 - 保存路径: " + options.getString("savePath"));
            } catch (Exception parseError) {
                Log.e(TAG, "JSON字符串解析失败", parseError);
                result.put("success", false);
                result.put("error", "JSON字符串解析失败: " + parseError.getMessage());
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            if (options == null) {
                Log.e(TAG, "解析后选项为null");
                result.put("success", false);
                result.put("error", "解析后选项为null");
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            // 调用主导出方法
            Log.d(TAG, "调用主PDF导出方法");
            JSONObject exportResult = exportToPDFDirect(options);
            Log.d(TAG, "主PDF导出方法返回，成功: " + exportResult.getBoolean("success"));
            return exportResult;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "字符串版本PDF导出失败, 耗时: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", "字符串版本PDF导出失败: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }
    
    /**
     * 字符串版本导出DOCX - 避免JSONObject创建问题
     */
    public static JSONObject exportToDOCXWithString(String jsonString) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        
        try {
            Log.d(TAG, "字符串版本DOCX导出调用");
            Log.d(TAG, "接收JSON字符串长度: " + (jsonString != null ? jsonString.length() : 0));
            
            if (jsonString == null || jsonString.trim().isEmpty()) {
                Log.e(TAG, "JSON字符串为空或null");
                result.put("success", false);
                result.put("error", "JSON字符串为空或null");
                return result;
            }
            
            // 解析JSON字符串
            JSONObject options = null;
            try {
                // 直接使用fastjson解析
                com.alibaba.fastjson.JSONObject fastJson = com.alibaba.fastjson.JSONObject.parseObject(jsonString);
                if (fastJson == null) {
                    throw new Exception("Fastjson解析返回null");
                }
                
                // 创建新的JSONObject并复制数据
                options = new JSONObject();
                options.put("title", fastJson.getString("title"));
                options.put("content", fastJson.getString("content"));
                options.put("savePath", fastJson.getString("savePath"));
                
                Log.d(TAG, "JSON字符串解析成功");
                Log.d(TAG, "解析选项 - 标题: " + options.getString("title"));
                Log.d(TAG, "解析选项 - 内容长度: " + (options.getString("content") != null ? options.getString("content").length() : 0));
                Log.d(TAG, "解析选项 - 保存路径: " + options.getString("savePath"));
            } catch (Exception parseError) {
                Log.e(TAG, "JSON字符串解析失败", parseError);
                result.put("success", false);
                result.put("error", "JSON字符串解析失败: " + parseError.getMessage());
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            if (options == null) {
                Log.e(TAG, "解析后选项为null");
                result.put("success", false);
                result.put("error", "解析后选项为null");
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            // 调用主导出方法
            Log.d(TAG, "调用主DOCX导出方法");
            JSONObject exportResult = exportToDOCXDirect(options);
            Log.d(TAG, "主DOCX导出方法返回，成功: " + exportResult.getBoolean("success"));
            return exportResult;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "字符串版本DOCX导出失败, 耗时: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", "字符串版本DOCX导出失败: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }
    
    /**
     * 创建文件路径（参考测试项目的实现）
     */
    private static File createFile(String prefix, String extension) {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String fileName = prefix + "_" + timeStamp + extension;
        
        File directory;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            directory = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "CwriterExports");
        } else {
            directory = new File(Environment.getExternalStorageDirectory(), "CwriterExports");
        }
        
        if (!directory.exists()) {
            directory.mkdirs();
        }
        
        return new File(directory, fileName);
    }
    
    /**
     * 获取当前时间字符串
     */
    private static String getCurrentTime() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
    }
    
    /**
     * 插件专用方法 - 通过反射调用，避免分包问题
     * 直接返回JSONObject，避免参数传递问题
     */
    public static JSONObject exportToPDFForPlugin(String title, String content, String savePath) {
        JSONObject options = new JSONObject();
        options.put("title", title != null ? title : "未命名文档");
        options.put("content", content != null ? content : "");
        options.put("savePath", savePath != null ? savePath : createFile("plugin_pdf", ".pdf").getAbsolutePath());
        
        return exportToPDFDirect(options);
    }
    
    /**
     * 插件专用方法 - 通过反射调用，避免分包问题
     * 直接返回JSONObject，避免参数传递问题
     */
    public static JSONObject exportToDOCXForPlugin(String title, String content, String savePath) {
        JSONObject options = new JSONObject();
        options.put("title", title != null ? title : "未命名文档");
        options.put("content", content != null ? content : "");
        options.put("savePath", savePath != null ? savePath : createFile("plugin_docx", ".docx").getAbsolutePath());
        
        return exportToDOCXDirect(options);
    }
    
    /**
     * 获取安全的导出路径（自动选择有权限的路径）
     */
    public static String getSafeExportPath(String filename, String extension) {
        try {
            // 1. 优先使用应用外部私有目录（Android/data/包名/files）
            String externalFilesPath = android.os.Environment.getExternalStorageDirectory() + 
                "/Android/data/com.example.cwriter/files/CwriterExports";
            File externalDir = new File(externalFilesPath);
            if (externalDir.exists() || externalDir.mkdirs()) {
                File testFile = new File(externalDir, filename + extension);
                if (testFile.getParentFile().canWrite()) {
                    Log.d(TAG, "使用应用外部私有目录: " + testFile.getAbsolutePath());
                    return testFile.getAbsolutePath();
                }
            }
            
            // 2. 备用：使用标准外部存储的CwriterExports目录
            String standardPath = android.os.Environment.getExternalStorageDirectory() + "/CwriterExports";
            File standardDir = new File(standardPath);
            if (standardDir.exists() || standardDir.mkdirs()) {
                File testFile = new File(standardDir, filename + extension);
                if (testFile.getParentFile().canWrite()) {
                    Log.d(TAG, "使用标准外部存储目录: " + testFile.getAbsolutePath());
                    return testFile.getAbsolutePath();
                }
            }
            
            // 3. 最后备用：使用缓存目录（临时文件）
            String cachePath = android.os.Environment.getExternalStorageDirectory() + "/Android/data/com.example.cwriter/cache/CwriterExports";
            File cacheDir = new File(cachePath);
            if (cacheDir.exists() || cacheDir.mkdirs()) {
                File testFile = new File(cacheDir, filename + extension);
                Log.d(TAG, "使用缓存目录: " + testFile.getAbsolutePath());
                return testFile.getAbsolutePath();
            }
            
            // 4. 如果都失败，返回一个默认路径
            String fallbackPath = android.os.Environment.getExternalStorageDirectory() + "/Download/" + filename + extension;
            Log.w(TAG, "所有路径都失败，使用默认路径: " + fallbackPath);
            return fallbackPath;
            
        } catch (Exception e) {
            Log.e(TAG, "获取安全导出路径失败", e);
            return android.os.Environment.getExternalStorageDirectory() + "/Download/" + filename + extension;
        }
    }
    
    /**
     * 检查文件是否已存在并生成唯一文件名
     */
    public static String getUniqueFilePath(String basePath, String extension) {
        File file = new File(basePath);
        String nameWithoutExt = file.getName();
        if (nameWithoutExt.endsWith(extension)) {
            nameWithoutExt = nameWithoutExt.substring(0, nameWithoutExt.length() - extension.length());
        }
        
        File directory = file.getParentFile();
        String filePath = basePath;
        int counter = 1;
        
        while (new File(filePath).exists()) {
            String newName = nameWithoutExt + "_" + counter + extension;
            filePath = new File(directory, newName).getAbsolutePath();
            counter++;
        }
        
        Log.d(TAG, "生成唯一文件路径: " + filePath);
        return filePath;
    }
    
    /**
     * 获取可用的导出文件大小（检查存储空间）
     */
    public static boolean checkStorageSpace(long requiredBytes) {
        try {
            File externalStorage = android.os.Environment.getExternalStorageDirectory();
            long freeSpace = externalStorage.getFreeSpace();
            
            Log.d(TAG, "可用存储空间: " + (freeSpace / 1024 / 1024) + "MB, 需要: " + (requiredBytes / 1024 / 1024) + "MB");
            
            // 留出10MB的缓冲空间
            return freeSpace > (requiredBytes + 10 * 1024 * 1024);
            
        } catch (Exception e) {
            Log.e(TAG, "检查存储空间失败", e);
            return true; // 如果无法检查，假设有足够空间
        }
    }
    
    /**
     * 检查导出工具是否可用
     */
    public static boolean isExportAvailable() {
        try {
            // 检查关键依赖是否存在
            Class.forName("com.itextpdf.kernel.pdf.PdfDocument");
            Class.forName("org.apache.poi.xwpf.usermodel.XWPFDocument");
            
            // 检查基本的存储权限
            String testPath = getSafeExportPath("test", ".txt");
            File testFile = new File(testPath);
            File parentDir = testFile.getParentFile();
            
            boolean canWrite = parentDir != null && parentDir.canWrite();
            Log.d(TAG, "导出工具可用性检查 - 权限可用: " + canWrite);
            
            return canWrite;
            
        } catch (Exception e) {
            Log.e(TAG, "导出工具依赖检查失败", e);
            return false;
        }
    }
}