package com.cwriter.export;

import android.util.Log;

import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.JSONArray;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.layout.element.Text;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.bridge.UniJSCallback;
import io.dcloud.feature.uniapp.common.UniModule;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;

/**
 * Export Module - Provide PDF and DOCX export functions
 *
 * Use iText to generate PDF (Android compatible)
 * Use Apache POI to generate DOCX
 */
public class ExportModule extends UniModule {

    private static final String TAG = "ExportModule";
    private static final int REQUEST_WRITE_EXTERNAL_STORAGE = 1001;
    private static final int REQUEST_PICK_DOCX_FILE = 1002;
    
    // 保存Context引用
    private android.content.Context mContext;
    
    /**
     * 初始化方法 - 获取Context
     */
    public void onInit() {
        mContext = mUniSDKInstance.getContext();
    }
    
    /**
     * 获取Context的安全方法
     */
    private android.content.Context getSafeContext() {
        if (mContext != null) {
            return mContext;
        } else if (mUniSDKInstance != null) {
            return mUniSDKInstance.getContext();
        }
        return null;
    }
    
    /**
     * 检查并请求存储权限
     */
    private boolean checkStoragePermission() {
        try {
            android.content.Context context = getSafeContext();
            if (context == null) {
                Log.w(TAG, "Context is null, cannot check permissions");
                return false;
            }
            
            // Android 6.0+ 需要动态请求权限
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // 检查是否有写外部存储权限
                int permission = ContextCompat.checkSelfPermission(context, 
                    android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
                
                Log.d(TAG, "WRITE_EXTERNAL_STORAGE permission check result: " + permission);
                
                if (permission != PackageManager.PERMISSION_GRANTED) {
                    // 没有权限，记录详细信息
                    Log.w(TAG, "没有写外部存储权限!");
                    
                    // 检查是否应该显示权限说明
                    if (context instanceof android.app.Activity) {
                        android.app.Activity activity = (android.app.Activity) context;
                        if (ActivityCompat.shouldShowRequestPermissionRationale(activity, 
                            android.Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                            Log.d(TAG, "应该显示权限说明");
                        }
                        
                        // 尝试请求权限（注意：在UniModule中可能无法直接显示权限对话框）
                        try {
                            ActivityCompat.requestPermissions(activity, 
                                new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 
                                REQUEST_WRITE_EXTERNAL_STORAGE);
                            Log.d(TAG, "已请求写外部存储权限");
                        } catch (Exception e) {
                            Log.e(TAG, "请求权限失败", e);
                        }
                    }
                    
                    return false;
                }
                
                // 检查Android 11+的存储访问权限
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Log.d(TAG, "Android 11+ 检查MANAGE_EXTERNAL_STORAGE权限");
                    
                    // 检查是否有管理所有文件权限
                    int managePermission = ContextCompat.checkSelfPermission(context, 
                        android.Manifest.permission.MANAGE_EXTERNAL_STORAGE);
                    
                    Log.d(TAG, "MANAGE_EXTERNAL_STORAGE permission check result: " + managePermission);
                    
                    if (managePermission != PackageManager.PERMISSION_GRANTED) {
                        Log.w(TAG, "没有MANAGE_EXTERNAL_STORAGE权限!");
                        return false;
                    }
                }
            }
            
            Log.d(TAG, "存储权限检查通过");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "权限检查过程中发生错误", e);
            return false;
        }
    }
    
    /**
     * 获取可用的导出目录（自动选择有权限的目录）
     */
    private String getAvailableExportDirectory() {
        try {
            android.content.Context context = getSafeContext();
            if (context == null) {
                Log.w(TAG, "Context is null, using fallback directory");
                return android.os.Environment.getExternalStorageDirectory().getAbsolutePath();
            }
            
            // 优先使用应用私有外部目录（不需要权限）
            java.io.File externalFilesDir = context.getExternalFilesDir("CwriterExports");
            if (externalFilesDir != null) {
                String path = externalFilesDir.getAbsolutePath();
                Log.d(TAG, "使用应用外部文件目录: " + path);
                
                // 确保目录存在
                if (!externalFilesDir.exists()) {
                    boolean created = externalFilesDir.mkdirs();
                    Log.d(TAG, "目录创建结果: " + created);
                }
                
                return path;
            }
            
            // 备用：使用应用内部目录（绝对不需要权限）
            java.io.File internalDir = new java.io.File(context.getFilesDir(), "CwriterExports");
            if (internalDir.exists() || internalDir.mkdirs()) {
                String path = internalDir.getAbsolutePath();
                Log.d(TAG, "使用应用内部目录: " + path);
                return path;
            }
            
            // 最后备用：使用标准外部存储
            String externalStorage = android.os.Environment.getExternalStorageDirectory().getAbsolutePath();
            Log.d(TAG, "使用标准外部存储: " + externalStorage);
            return externalStorage;
            
        } catch (Exception e) {
            Log.e(TAG, "获取可用导出目录失败", e);
            return android.os.Environment.getExternalStorageDirectory().getAbsolutePath();
        }
    }

    /**
     * Internal method that actually executes PDF export logic
     * Reused for both asynchronous callback and synchronous call methods
     */
    private JSONObject doExportPDF(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        PdfDocument pdfDocument = null;
        Document document = null;
        PdfFont chineseFont = null;
        
        try {
            // 检查参数是否为null
            if (options == null) {
                Log.e(TAG, "Error: options parameter is null");
                result.put("success", false);
                result.put("error", "Options parameter is null");
                return result;
            }
            
            Log.d(TAG, "Options received: " + options.toString());
            
            // 获取结构化数据
            String title = options.getString("title");
            String description = options.getString("description");
            JSONArray chapters = options.getJSONArray("chapters");
            String savePath = options.getString("savePath");
            JSONObject format = options.getJSONObject("format");
            
            Log.d(TAG, "Start exporting PDF: " + savePath);
            Log.d(TAG, "Title: " + title);
            Log.d(TAG, "Description: " + (description != null ? description.substring(0, Math.min(100, description.length())) : "null"));
            Log.d(TAG, "Chapters count: " + (chapters != null ? chapters.size() : 0));

            // Validate parameters
            if (title == null) title = "未命名作品";
            if (description == null) description = "";
            if (chapters == null) chapters = new JSONArray();
            
            // 如果没有提供保存路径，使用默认路径
            if (savePath == null || savePath.isEmpty()) {
                savePath = createDefaultFilePath(title, ".pdf");
                Log.d(TAG, "Using default save path: " + savePath);
            }

            // 确保目录存在
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            
            // 添加详细的目录和权限检查日志
            Log.d(TAG, "目标文件路径: " + file.getAbsolutePath());
            Log.d(TAG, "父目录路径: " + (parentDir != null ? parentDir.getAbsolutePath() : "null"));
            Log.d(TAG, "父目录存在: " + (parentDir != null ? parentDir.exists() : "false"));
            Log.d(TAG, "文件名: " + file.getName());
            Log.d(TAG, "当前工作目录: " + System.getProperty("user.dir"));
            Log.d(TAG, "Android版本: " + android.os.Build.VERSION.RELEASE + " (API " + android.os.Build.VERSION.SDK_INT + ")");
            
            // 检查应用包名和权限状态
            try {
                android.content.Context context = getSafeContext();
                if (context != null) {
                    Log.d(TAG, "应用包名: " + context.getPackageName());
                    Log.d(TAG, "应用数据目录: " + context.getFilesDir().getAbsolutePath());
                    Log.d(TAG, "外部缓存目录: " + (context.getExternalCacheDir() != null ? context.getExternalCacheDir().getAbsolutePath() : "null"));
                    Log.d(TAG, "外部文件目录: " + (context.getExternalFilesDir(null) != null ? context.getExternalFilesDir(null).getAbsolutePath() : "null"));
                    
                    // 检查权限
                    boolean hasPermission = checkStoragePermission();
                    Log.d(TAG, "存储权限检查结果: " + hasPermission);
                    
                    if (!hasPermission) {
                        Log.w(TAG, "没有存储权限，使用应用私有目录");
                        String availableDir = getAvailableExportDirectory();
                        if (!savePath.contains(availableDir)) {
                            String fileName = file.getName();
                            savePath = new java.io.File(availableDir, fileName).getAbsolutePath();
                            file = new java.io.File(savePath);
                            parentDir = file.getParentFile();
                            Log.d(TAG, "切换到应用私有目录: " + savePath);
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "获取应用上下文信息失败", e);
            }
            
            if (parentDir != null && !parentDir.exists()) {
                Log.d(TAG, "尝试创建父目录: " + parentDir.getAbsolutePath());
                boolean dirCreated = parentDir.mkdirs();
                Log.d(TAG, "目录创建结果: " + dirCreated + ", 现在存在: " + parentDir.exists());
            }
            
            // 检查目录权限
            if (parentDir != null) {
                boolean canRead = parentDir.canRead();
                boolean canWrite = parentDir.canWrite();
                boolean canExecute = parentDir.canExecute();
                Log.d(TAG, "父目录权限 - 读取: " + canRead + ", 写入: " + canWrite + ", 执行: " + canExecute);
                
                if (!canWrite) {
                    Log.w(TAG, "警告: 目标目录不可写入!");
                    // 尝试使用应用私有目录作为备用
                    File fallbackDir = new File(android.os.Environment.getExternalStorageDirectory(), "CwriterExports");
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "切换到备用路径: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                        Log.d(TAG, "新父目录权限 - 读取: " + parentDir.canRead() + ", 写入: " + parentDir.canWrite() + ", 执行: " + parentDir.canExecute());
                    }
                }
            }

            Log.d(TAG, "Creating PDF document with iText...");
            
            // 创建PDF文档（修复流式关闭问题）
            Log.d(TAG, "开始创建FileOutputStream...");
            FileOutputStream fos = null;
            try {
                fos = new FileOutputStream(file);
                Log.d(TAG, "FileOutputStream创建成功，开始创建PdfDocument...");
                pdfDocument = new PdfDocument(new PdfWriter(fos));
                Log.d(TAG, "PdfDocument创建成功，开始创建Document...");
                document = new Document(pdfDocument);
                Log.d(TAG, "Document创建成功");
                
                // 不再让fos自动关闭，因为PdfDocument会管理它
                fos = null; // 防止重复关闭
            } catch (Exception fosError) {
                Log.e(TAG, "创建PDF文档失败", fosError);
                // 确保fos被正确关闭
                if (fos != null) {
                    try {
                        fos.close();
                    } catch (Exception e) {
                        Log.w(TAG, "关闭FileOutputStream失败", e);
                    }
                }
                throw fosError;
            }
            
            // 尝试加载中文字体
            try {
                // 使用标准字体（支持中文的字体）- 修正参数签名
                chineseFont = PdfFontFactory.createFont("STSong-Light", "UniGB-UCS2-H");
                Log.d(TAG, "Chinese font loaded successfully");
            } catch (Exception fontError) {
                Log.w(TAG, "Failed to load STSong-Light font, trying fallback fonts", fontError);
                
                // 尝试其他字体方案
                try {
                    // 尝试使用内置字体常量（避免资源文件问题）
                    chineseFont = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.TIMES_ROMAN);
                    Log.d(TAG, "Times-Roman font loaded as fallback");
                } catch (Exception fallbackError) {
                    Log.w(TAG, "Failed to load fallback font, using StandardFonts.HELVETICA", fallbackError);
                    try {
                        // 使用内置字体常量，避免资源文件问题
                        chineseFont = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
                        Log.d(TAG, "Helvetica font loaded as fallback");
                    } catch (Exception e) {
                        Log.w(TAG, "All font loading failed, will use default", e);
                        chineseFont = null;
                    }
                }
            }
            
            // 设置页边距
            document.setMargins(50, 50, 50, 50);

            // 添加标题 - 根据格式要求：宋体二号，加粗，居中
            try {
                Paragraph titlePara = new Paragraph(title);
                if (chineseFont != null) {
                    titlePara.setFont(chineseFont);
                }
                // 使用格式配置或默认值
                int titleSize = format != null ? format.getIntValue("titleSize") : 22; // 二号字体
                titlePara.setFontSize(titleSize)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
                document.add(titlePara);
                Log.d(TAG, "Title added with size: " + titleSize);
            } catch (Exception e) {
                Log.w(TAG, "Failed to add title paragraph, continuing", e);
            }

            // 添加简介（如果存在）- 根据格式要求：宋体三号，加粗，靠左
            if (description != null && !description.trim().isEmpty()) {
                try {
                    // 简介标题
                    Paragraph descTitlePara = new Paragraph("简介");
                    if (chineseFont != null) {
                        descTitlePara.setFont(chineseFont);
                    }
                    int headingSize = format != null ? format.getIntValue("headingSize") : 16; // 三号字体
                    descTitlePara.setFontSize(headingSize)
                        .setBold()
                        .setTextAlignment(TextAlignment.LEFT)
                        .setMarginTop(15)
                        .setMarginBottom(8);
                    document.add(descTitlePara);
                    
                    // 简介内容 - 根据格式要求：宋体四号
                    Paragraph descPara = new Paragraph(description);
                    if (chineseFont != null) {
                        descPara.setFont(chineseFont);
                    }
                    int bodySize = format != null ? format.getIntValue("bodySize") : 14; // 四号字体
                    descPara.setFontSize(bodySize)
                        .setTextAlignment(TextAlignment.LEFT)
                        .setMarginBottom(15);
                    
                    // 设置行距（1.5倍）
                    float lineSpacing = format != null && format.containsKey("lineSpacing") ? format.getFloatValue("lineSpacing") : 1.5f;
                    descPara.setMultipliedLeading(lineSpacing);
                    
                    document.add(descPara);
                    Log.d(TAG, "Description added with heading size: " + headingSize + ", body size: " + bodySize);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to add description, continuing", e);
                }
            }

            // 添加章节内容
            if (chapters != null) {
                float lineSpacing = format != null && format.containsKey("lineSpacing") ? format.getFloatValue("lineSpacing") : 1.5f;
                int headingSize = format != null && format.containsKey("headingSize") ? format.getIntValue("headingSize") : 16;
                int bodySize = format != null && format.containsKey("bodySize") ? format.getIntValue("bodySize") : 14;
                
                for (int i = 0; i < chapters.size(); i++) {
                    try {
                        JSONObject chapter = chapters.getJSONObject(i);
                        String chapterTitle = chapter.getString("title") != null ? chapter.getString("title") : "第" + (i + 1) + "章";
                        String chapterContent = chapter.getString("content") != null ? chapter.getString("content") : "";
                        
                        // 章节标题 - 根据格式要求：宋体三号，加粗，靠左
                        Paragraph chapterTitlePara = new Paragraph("第" + (i + 1) + "章 " + chapterTitle);
                        if (chineseFont != null) {
                            chapterTitlePara.setFont(chineseFont);
                        }
                        chapterTitlePara.setFontSize(headingSize)
                            .setBold()
                            .setTextAlignment(TextAlignment.LEFT)
                            .setMarginTop(15)
                            .setMarginBottom(10);
                        document.add(chapterTitlePara);
                        
                        // 章节内容 - 根据格式要求：宋体四号，1.5倍行距
                        if (!chapterContent.trim().isEmpty()) {
                            String[] contentLines = chapterContent.split("\n");
                            for (String line : contentLines) {
                                if (line.trim().length() > 0) {
                                    Paragraph contentPara = new Paragraph(line.trim());
                                    if (chineseFont != null) {
                                        contentPara.setFont(chineseFont);
                                    }
                                    contentPara.setFontSize(bodySize)
                                        .setTextAlignment(TextAlignment.LEFT)
                                        .setMarginBottom(5)
                                        .setMultipliedLeading(lineSpacing); // 1.5倍行距
                                    document.add(contentPara);
                                }
                            }
                        }
                        
                        Log.d(TAG, "Chapter " + (i + 1) + " added: " + chapterTitle);
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to add chapter " + (i + 1) + ", continuing", e);
                    }
                }
            }

            // 关闭文档
            document.close();
            pdfDocument.close();

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
            result.put("error", "PDF导出失败: " + e.getMessage());
            result.put("duration", endTime - startTime);
            
            // 确保资源正确关闭（避免重复关闭）
            try {
                // 只关闭尚未关闭的资源
                if (document != null) {
                    try {
                        document.close();
                    } catch (Exception docCloseError) {
                        Log.w(TAG, "Document already closed or error closing", docCloseError);
                    }
                }
                if (pdfDocument != null) {
                    try {
                        pdfDocument.close();
                    } catch (Exception pdfCloseError) {
                        Log.w(TAG, "PdfDocument already closed or error closing", pdfCloseError);
                    }
                }
            } catch (Exception closeError) {
                Log.w(TAG, "Error closing PDF resources", closeError);
            }
            
            return result;
        }
    }

    /**
     * Internal method that actually executes DOCX export logic
     * Reused for both asynchronous callback and synchronous call methods
     */
    private JSONObject doExportDOCX(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        XWPFDocument document = null;
        FileOutputStream out = null;
        
        try {
            // 检查参数是否为null
            if (options == null) {
                Log.e(TAG, "Error: options parameter is null");
                result.put("success", false);
                result.put("error", "Options parameter is null");
                return result;
            }
            
            Log.d(TAG, "Options received: " + options.toString());
            
            // 获取结构化数据
            String title = options.getString("title");
            String description = options.getString("description");
            JSONArray chapters = options.getJSONArray("chapters");
            String savePath = options.getString("savePath");
            JSONObject format = options.getJSONObject("format");
            
            Log.d(TAG, "Start exporting DOCX: " + savePath);
            Log.d(TAG, "Title: " + title);
            Log.d(TAG, "Description: " + (description != null ? description.substring(0, Math.min(100, description.length())) : "null"));
            Log.d(TAG, "Chapters count: " + (chapters != null ? chapters.size() : 0));

            // Validate parameters
            if (title == null) title = "未命名作品";
            if (description == null) description = "";
            if (chapters == null) chapters = new JSONArray();
            
            // 如果没有提供保存路径，使用默认路径
            if (savePath == null || savePath.isEmpty()) {
                savePath = createDefaultFilePath(title, ".docx");
                Log.d(TAG, "Using default save path: " + savePath);
            }

            // 确保目录存在
            File file = new File(savePath);
            File parentDir = file.getParentFile();
            
            // 添加详细的目录和权限检查日志
            Log.d(TAG, "目标文件路径: " + file.getAbsolutePath());
            Log.d(TAG, "父目录路径: " + (parentDir != null ? parentDir.getAbsolutePath() : "null"));
            Log.d(TAG, "父目录存在: " + (parentDir != null ? parentDir.exists() : "false"));
            Log.d(TAG, "文件名: " + file.getName());
            Log.d(TAG, "当前工作目录: " + System.getProperty("user.dir"));
            Log.d(TAG, "Android版本: " + android.os.Build.VERSION.RELEASE + " (API " + android.os.Build.VERSION.SDK_INT + ")");
            
            // 检查应用包名和权限状态
            try {
                android.content.Context context = getSafeContext();
                if (context != null) {
                    Log.d(TAG, "应用包名: " + context.getPackageName());
                    Log.d(TAG, "应用数据目录: " + context.getFilesDir().getAbsolutePath());
                    Log.d(TAG, "外部缓存目录: " + (context.getExternalCacheDir() != null ? context.getExternalCacheDir().getAbsolutePath() : "null"));
                    Log.d(TAG, "外部文件目录: " + (context.getExternalFilesDir(null) != null ? context.getExternalFilesDir(null).getAbsolutePath() : "null"));
                    
                    // 检查权限
                    boolean hasPermission = checkStoragePermission();
                    Log.d(TAG, "存储权限检查结果: " + hasPermission);
                    
                    if (!hasPermission) {
                        Log.w(TAG, "没有存储权限，使用应用私有目录");
                        String availableDir = getAvailableExportDirectory();
                        if (!savePath.contains(availableDir)) {
                            String fileName = file.getName();
                            savePath = new java.io.File(availableDir, fileName).getAbsolutePath();
                            file = new java.io.File(savePath);
                            parentDir = file.getParentFile();
                            Log.d(TAG, "切换到应用私有目录: " + savePath);
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "获取应用上下文信息失败", e);
            }
            
            if (parentDir != null && !parentDir.exists()) {
                Log.d(TAG, "尝试创建父目录: " + parentDir.getAbsolutePath());
                boolean dirCreated = parentDir.mkdirs();
                Log.d(TAG, "目录创建结果: " + dirCreated + ", 现在存在: " + parentDir.exists());
            }
            
            // 检查目录权限
            if (parentDir != null) {
                boolean canRead = parentDir.canRead();
                boolean canWrite = parentDir.canWrite();
                boolean canExecute = parentDir.canExecute();
                Log.d(TAG, "父目录权限 - 读取: " + canRead + ", 写入: " + canWrite + ", 执行: " + canExecute);
                
                if (!canWrite) {
                    Log.w(TAG, "警告: 目标目录不可写入!");
                    // 尝试使用应用私有目录作为备用
                    File fallbackDir = new File(android.os.Environment.getExternalStorageDirectory(), "CwriterExports");
                    if (fallbackDir.exists() || fallbackDir.mkdirs()) {
                        File fallbackFile = new File(fallbackDir, file.getName());
                        savePath = fallbackFile.getAbsolutePath();
                        Log.d(TAG, "切换到备用路径: " + savePath);
                        file = new File(savePath);
                        parentDir = file.getParentFile();
                        Log.d(TAG, "新父目录权限 - 读取: " + parentDir.canRead() + ", 写入: " + parentDir.canWrite() + ", 执行: " + parentDir.canExecute());
                    }
                }
            }

            Log.d(TAG, "Creating DOCX document with Apache POI...");
            Log.d(TAG, "File path: " + file.getAbsolutePath());
            Log.d(TAG, "Parent directory: " + (file.getParentFile() != null ? file.getParentFile().getAbsolutePath() : "null"));
            
            // 检查文件是否可写（添加详细日志）
            try {
                if (file.getParentFile() != null) {
                    Log.d(TAG, "Checking directory write permission...");
                    boolean canWrite = file.getParentFile().canWrite();
                    Log.d(TAG, "Directory writable: " + canWrite);
                    if (!canWrite) {
                        throw new IOException("Directory is not writable: " + file.getParentFile().getAbsolutePath());
                    }
                } else {
                    Log.w(TAG, "Parent directory is null, skipping write check");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking directory permissions", e);
                throw e;
            }
            
            // 检查POI类是否可用
            Log.d(TAG, "Checking XWPFDocument class availability...");
            try {
                Class<?> xwpfClass = Class.forName("org.apache.poi.xwpf.usermodel.XWPFDocument");
                Log.d(TAG, "XWPFDocument class found: " + xwpfClass.getName());
            } catch (ClassNotFoundException e) {
                Log.e(TAG, "XWPFDocument class not found!", e);
                throw new RuntimeException("Apache POI XWPFDocument class not found. Check dependencies.", e);
            }
            
            // Create DOCX document using Apache POI (参考测试项目的实现)
            Log.d(TAG, "Instantiating XWPFDocument...");
            Log.d(TAG, "Current thread: " + Thread.currentThread().getName());
            Log.d(TAG, "Free memory: " + (Runtime.getRuntime().freeMemory() / 1024 / 1024) + " MB");
            
            try {
                // 尝试创建文档，添加超时保护
                long docStartTime = System.currentTimeMillis();
                document = new XWPFDocument();
                long docEndTime = System.currentTimeMillis();
                Log.d(TAG, "XWPFDocument created successfully in " + (docEndTime - docStartTime) + "ms");
            } catch (OutOfMemoryError e) {
                Log.e(TAG, "OutOfMemoryError creating XWPFDocument", e);
                throw new RuntimeException("Out of memory creating XWPFDocument", e);
            } catch (NoClassDefFoundError e) {
                Log.e(TAG, "NoClassDefFoundError creating XWPFDocument", e);
                Log.e(TAG, "Missing class: " + e.getMessage());
                throw new RuntimeException("Missing class definition: " + e.getMessage(), e);
            } catch (ExceptionInInitializerError e) {
                Log.e(TAG, "ExceptionInInitializerError creating XWPFDocument", e);
                if (e.getCause() != null) {
                    Log.e(TAG, "Initialization error cause: " + e.getCause().getMessage());
                }
                throw new RuntimeException("Initialization error: " + e.getMessage(), e);
            } catch (LinkageError e) {
                Log.e(TAG, "LinkageError creating XWPFDocument", e);
                Log.e(TAG, "Linkage error: " + e.getMessage());
                throw new RuntimeException("Linkage error (possibly missing dependency): " + e.getMessage(), e);
            } catch (Exception e) {
                Log.e(TAG, "Failed to create XWPFDocument", e);
                Log.e(TAG, "Exception type: " + e.getClass().getName());
                Log.e(TAG, "Exception message: " + e.getMessage());
                if (e.getCause() != null) {
                    Log.e(TAG, "Exception cause: " + e.getCause().getMessage());
                }
                e.printStackTrace();
                throw new RuntimeException("Failed to create XWPFDocument: " + e.getMessage(), e);
            }
            
            // 添加标题 - 根据格式要求：宋体二号，加粗，居中
            XWPFParagraph titlePara = document.createParagraph();
            titlePara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER);
            titlePara.setSpacingAfter(200); // 20磅间距
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(title);
            titleRun.setBold(true);
            titleRun.setFontFamily("宋体");
            int titleSize = format != null && format.containsKey("titleSize") ? format.getIntValue("titleSize") : 22; // 二号字体
            titleRun.setFontSize(titleSize);
            Log.d(TAG, "Title paragraph added with size: " + titleSize);

            // 添加简介（如果存在）- 根据格式要求：宋体三号，加粗，靠左
            if (description != null && !description.trim().isEmpty()) {
                // 简介标题
                XWPFParagraph descTitlePara = document.createParagraph();
                descTitlePara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.LEFT);
                descTitlePara.setSpacingBefore(100);
                descTitlePara.setSpacingAfter(80);
                XWPFRun descTitleRun = descTitlePara.createRun();
                descTitleRun.setText("简介");
                descTitleRun.setBold(true);
                descTitleRun.setFontFamily("宋体");
                int headingSize = format != null && format.containsKey("headingSize") ? format.getIntValue("headingSize") : 16; // 三号字体
                descTitleRun.setFontSize(headingSize);
                
                // 简介内容 - 根据格式要求：宋体四号
                XWPFParagraph descPara = document.createParagraph();
                descPara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.LEFT);
                descPara.setSpacingAfter(150);
                XWPFRun descRun = descPara.createRun();
                descRun.setText(description);
                descRun.setFontFamily("宋体");
                int bodySize = format != null && format.containsKey("bodySize") ? format.getIntValue("bodySize") : 14; // 四号字体
                descRun.setFontSize(bodySize);
                
                Log.d(TAG, "Description added with heading size: " + headingSize + ", body size: " + bodySize);
            }

            // 添加章节内容
            if (chapters != null) {
                int headingSize = format != null && format.containsKey("headingSize") ? format.getIntValue("headingSize") : 16;
                int bodySize = format != null && format.containsKey("bodySize") ? format.getIntValue("bodySize") : 14;
                double lineSpacing = format != null && format.containsKey("lineSpacing") ? format.getDoubleValue("lineSpacing") : 1.5;
                
                for (int i = 0; i < chapters.size(); i++) {
                    try {
                        JSONObject chapter = chapters.getJSONObject(i);
                        String chapterTitle = chapter.getString("title") != null ? chapter.getString("title") : "第" + (i + 1) + "章";
                        String chapterContent = chapter.getString("content") != null ? chapter.getString("content") : "";
                        
                        // 章节标题 - 根据格式要求：宋体三号，加粗，靠左
                        XWPFParagraph chapterTitlePara = document.createParagraph();
                        chapterTitlePara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.LEFT);
                        chapterTitlePara.setSpacingBefore(150);
                        chapterTitlePara.setSpacingAfter(100);
                        XWPFRun chapterTitleRun = chapterTitlePara.createRun();
                        chapterTitleRun.setText("第" + (i + 1) + "章 " + chapterTitle);
                        chapterTitleRun.setBold(true);
                        chapterTitleRun.setFontFamily("宋体");
                        chapterTitleRun.setFontSize(headingSize);
                        
                        // 章节内容 - 根据格式要求：宋体四号，1.5倍行距
                        if (!chapterContent.trim().isEmpty()) {
                            String[] contentLines = chapterContent.split("\n");
                            for (String line : contentLines) {
                                if (line.trim().length() > 0) {
                                    XWPFParagraph contentPara = document.createParagraph();
                                    contentPara.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.LEFT);
                                    contentPara.setSpacingAfter(150);
                                    contentPara.setSpacingBetween(lineSpacing); // 1.5倍行距
                                    XWPFRun contentRun = contentPara.createRun();
                                    contentRun.setText(line.trim());
                                    contentRun.setFontFamily("宋体");
                                    contentRun.setFontSize(bodySize);
                                }
                            }
                        }
                        
                        Log.d(TAG, "Chapter " + (i + 1) + " added: " + chapterTitle);
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to add chapter " + (i + 1) + ", continuing", e);
                    }
                }
            }
            Log.d(TAG, "All chapters and content added");
            
            // 保存文件
            Log.d(TAG, "Opening FileOutputStream: " + file.getAbsolutePath());
            out = new FileOutputStream(file);
            Log.d(TAG, "FileOutputStream opened, writing document...");
            document.write(out);
            Log.d(TAG, "Document written to file");
            out.flush();
            Log.d(TAG, "FileOutputStream flushed");

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
            Log.e(TAG, "Exception type: " + e.getClass().getName());
            Log.e(TAG, "Exception message: " + e.getMessage());
            if (e.getCause() != null) {
                Log.e(TAG, "Exception cause: " + e.getCause().getMessage());
            }
            e.printStackTrace();
            result.put("success", false);
            result.put("error", "DOCX导出失败: " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result; // 立即返回，避免继续执行
            
        } finally {
            // 确保资源正确关闭
            try {
                if (out != null) {
                    try {
                        out.flush();
                    } catch (Exception e) {
                        Log.w(TAG, "Error flushing output stream", e);
                    }
                    try {
                        out.close();
                    } catch (Exception e) {
                        Log.w(TAG, "Error closing output stream", e);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Error in output stream cleanup", e);
            }
            
            try {
                if (document != null) {
                    document.close();
                }
            } catch (Exception closeError) {
                Log.w(TAG, "Error closing DOCX document", closeError);
            }
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
        Log.d(TAG, "exportToPDFSync called");
        if (options == null) {
            Log.e(TAG, "exportToPDFSync: options parameter is null");
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", "Options parameter is null in exportToPDFSync");
            return result;
        }
        Log.d(TAG, "exportToPDFSync: options received, type: " + options.getClass().getName());
        Log.d(TAG, "exportToPDFSync: options content: " + options.toString());
        
        // 使用ExportUtils工具类，避免参数传递问题
        try {
            // 通过反射调用ExportUtils的静态方法，解决分包问题
            Class<?> exportUtilsClass = Class.forName("com.cwriter.export.ExportUtils");
            java.lang.reflect.Method method = exportUtilsClass.getMethod("exportToPDFDirect", JSONObject.class);
            Object result = method.invoke(null, options);
            
            if (result instanceof JSONObject) {
                return (JSONObject) result;
            } else {
                Log.e(TAG, "ExportUtils返回类型错误: " + (result != null ? result.getClass().getName() : "null"));
                return doExportPDF(options); // 降级到原始实现
            }
        } catch (Exception e) {
            Log.e(TAG, "使用ExportUtils失败，降级到原始实现", e);
            return doExportPDF(options); // 降级到原始实现
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
        JSONObject result = null;
        try {
            Log.d(TAG, "exportToDOCX called, starting export...");
            result = doExportDOCX(options);
            Log.d(TAG, "exportToDOCX completed, result success: " + (result != null ? result.getBoolean("success") : "null"));
        } catch (Exception e) {
            Log.e(TAG, "exportToDOCX exception caught", e);
            result = new JSONObject();
            result.put("success", false);
            result.put("error", "DOCX导出异常: " + e.getMessage());
        } finally {
            // 确保回调总是被调用
            if (callback != null) {
                try {
                    if (result == null) {
                        result = new JSONObject();
                        result.put("success", false);
                        result.put("error", "导出结果为空");
                    }
                    Log.d(TAG, "Invoking callback with result: " + result.toString());
                    callback.invoke(result);
                    Log.d(TAG, "Callback invoked successfully");
                } catch (Exception callbackError) {
                    Log.e(TAG, "Failed to invoke callback", callbackError);
                }
            } else {
                Log.w(TAG, "exportToDOCX: callback is null, result not returned");
            }
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
        Log.d(TAG, "exportToDOCXSync called");
        if (options == null) {
            Log.e(TAG, "exportToDOCXSync: options parameter is null");
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", "Options parameter is null in exportToDOCXSync");
            return result;
        }
        Log.d(TAG, "exportToDOCXSync: options received, type: " + options.getClass().getName());
        Log.d(TAG, "exportToDOCXSync: options content: " + options.toString());
        
        // 使用ExportUtils工具类，避免参数传递问题
        try {
            // 通过反射调用ExportUtils的静态方法，解决分包问题
            Class<?> exportUtilsClass = Class.forName("com.cwriter.export.ExportUtils");
            java.lang.reflect.Method method = exportUtilsClass.getMethod("exportToDOCXDirect", JSONObject.class);
            Object result = method.invoke(null, options);
            
            if (result instanceof JSONObject) {
                return (JSONObject) result;
            } else {
                Log.e(TAG, "ExportUtils返回类型错误: " + (result != null ? result.getClass().getName() : "null"));
                return doExportDOCX(options); // 降级到原始实现
            }
        } catch (Exception e) {
            Log.e(TAG, "使用ExportUtils失败，降级到原始实现", e);
            return doExportDOCX(options); // 降级到原始实现
        }
    }
    
    /**
     * Export to DOCX - String parameter version
     * Backup method when JSONObject creation fails in JavaScript
     *
     * @param jsonString JSON string containing title, content, savePath
     * @return Result JSON object, structure consistent with async callback
     */
    @UniJSMethod(uiThread = false)
    public JSONObject exportToDOCXSyncWithString(String jsonString) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        
        try {
            Log.d(TAG, "exportToDOCXSyncWithString called");
            Log.d(TAG, "Received JSON string length: " + (jsonString != null ? jsonString.length() : 0));
            
            if (jsonString == null || jsonString.trim().isEmpty()) {
                Log.e(TAG, "JSON string is null or empty");
                result.put("success", false);
                result.put("error", "JSON string is null or empty");
                return result;
            }
            
            // Parse JSON string directly using fastjson
            JSONObject options = null;
            try {
                // 直接使用fastjson解析，然后转换为JSONObject
                com.alibaba.fastjson.JSONObject fastJson = com.alibaba.fastjson.JSONObject.parseObject(jsonString);
                if (fastJson == null) {
                    throw new Exception("Fastjson parse returned null");
                }
                
                // 创建新的JSONObject并复制数据
                options = new JSONObject();
                options.put("title", fastJson.getString("title"));
                options.put("content", fastJson.getString("content"));
                options.put("savePath", fastJson.getString("savePath"));
                
                Log.d(TAG, "JSON string parsed successfully");
                Log.d(TAG, "Parsed options - title: " + options.getString("title"));
                Log.d(TAG, "Parsed options - content length: " + (options.getString("content") != null ? options.getString("content").length() : 0));
                Log.d(TAG, "Parsed options - savePath: " + options.getString("savePath"));
            } catch (Exception parseError) {
                Log.e(TAG, "Failed to parse JSON string", parseError);
                Log.e(TAG, "Parse error type: " + parseError.getClass().getName());
                Log.e(TAG, "Parse error message: " + parseError.getMessage());
                if (parseError.getCause() != null) {
                    Log.e(TAG, "Parse error cause: " + parseError.getCause().getMessage());
                }
                result.put("success", false);
                result.put("error", "Failed to parse JSON string: " + parseError.getMessage());
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            if (options == null) {
                Log.e(TAG, "Options is null after parsing");
                result.put("success", false);
                result.put("error", "Options is null after parsing");
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            // Call the main export method
            Log.d(TAG, "Calling doExportDOCX with parsed options");
            JSONObject exportResult = doExportDOCX(options);
            Log.d(TAG, "doExportDOCX returned, success: " + exportResult.getBoolean("success"));
            return exportResult;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "String version export failed, time: " + (endTime - startTime) + "ms", e);
            Log.e(TAG, "Exception type: " + e.getClass().getName());
            Log.e(TAG, "Exception message: " + e.getMessage());
            if (e.getCause() != null) {
                Log.e(TAG, "Exception cause: " + e.getCause().getMessage());
            }
            e.printStackTrace();
            result.put("success", false);
            result.put("error", "String version export failed: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }

    @UniJSMethod(uiThread = false)
    public JSONObject exportToPDFSyncWithString(String jsonString) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        
        try {
            Log.d(TAG, "exportToPDFSyncWithString called");
            Log.d(TAG, "Received JSON string length: " + (jsonString != null ? jsonString.length() : 0));
            
            if (jsonString == null || jsonString.trim().isEmpty()) {
                Log.e(TAG, "PDF JSON string is null or empty");
                result.put("success", false);
                result.put("error", "PDF JSON string is null or empty");
                return result;
            }
            
            Log.d(TAG, "PDF JSON string content: " + jsonString.substring(0, Math.min(100, jsonString.length())) + "...");
            
            // Parse JSON string directly using fastjson
            JSONObject options = null;
            try {
                // 直接使用fastjson解析，然后转换为JSONObject
                com.alibaba.fastjson.JSONObject fastJson = com.alibaba.fastjson.JSONObject.parseObject(jsonString);
                if (fastJson == null) {
                    throw new Exception("Fastjson parse returned null");
                }
                
                // 创建新的JSONObject并复制数据
                options = new JSONObject();
                if (fastJson.containsKey("title")) {
                    options.put("title", fastJson.getString("title"));
                }
                if (fastJson.containsKey("content")) {
                    options.put("content", fastJson.getString("content"));
                }
                if (fastJson.containsKey("savePath")) {
                    options.put("savePath", fastJson.getString("savePath"));
                }
                
                Log.d(TAG, "PDF JSON string parsed successfully");
                Log.d(TAG, "Parsed options - title: " + options.getString("title"));
                Log.d(TAG, "Parsed options - content length: " + (options.getString("content") != null ? options.getString("content").length() : 0));
                Log.d(TAG, "Parsed options - savePath: " + options.getString("savePath"));
            } catch (Exception parseError) {
                Log.e(TAG, "Failed to parse PDF JSON string", parseError);
                Log.e(TAG, "Parse error type: " + parseError.getClass().getName());
                Log.e(TAG, "Parse error message: " + parseError.getMessage());
                if (parseError.getCause() != null) {
                    Log.e(TAG, "Parse error cause: " + parseError.getCause().getMessage());
                }
                result.put("success", false);
                result.put("error", "Failed to parse PDF JSON string: " + parseError.getMessage());
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            if (options == null) {
                Log.e(TAG, "Options is null after parsing");
                result.put("success", false);
                result.put("error", "Options is null after parsing");
                result.put("duration", System.currentTimeMillis() - startTime);
                return result;
            }
            
            // Call main export method
            Log.d(TAG, "Calling doExportPDF with parsed options");
            JSONObject exportResult = doExportPDF(options);
            Log.d(TAG, "doExportPDF returned, success: " + exportResult.getBoolean("success"));
            return exportResult;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "PDF String version export failed, time: " + (endTime - startTime) + "ms", e);
            Log.e(TAG, "Exception type: " + e.getClass().getName());
            Log.e(TAG, "Exception message: " + e.getMessage());
            if (e.getCause() != null) {
                Log.e(TAG, "Exception cause: " + e.getCause().getMessage());
            }
            e.printStackTrace();
            result.put("success", false);
            result.put("error", "PDF String version export failed: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        }
    }
    
    /**
     * 创建默认文件路径（参考测试项目的实现）
     */
    private String createDefaultFilePath(String title, String extension) {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String cleanTitle = title.replaceAll("[^a-zA-Z0-9\\u4e00-\\u9fa5]", "_"); // 清理文件名，只保留中英文和数字
        String fileName = cleanTitle + "_" + timeStamp + extension;
        
        // 根据Android版本选择目录
        File directory;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            // Android 11+ 使用Documents目录
            directory = new File(android.os.Environment.getExternalStoragePublicDirectory(
                android.os.Environment.DIRECTORY_DOCUMENTS), "CwriterExports");
        } else {
            // Android 10及以下使用根目录下的CwriterExports
            directory = new File(android.os.Environment.getExternalStorageDirectory(), "CwriterExports");
        }
        
        if (!directory.exists()) {
            directory.mkdirs();
        }
        
        return new File(directory, fileName).getAbsolutePath();
    }
    
    /**
     * 获取当前时间字符串
     */
    private String getCurrentTime() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
    }
    
    /**
     * 内部方法：实际执行DOCX导入逻辑
     * @param options JSON对象，包含filePath和styleConfig
     * @return 解析结果JSON对象
     */
    private JSONObject doImportDOCX(JSONObject options) {
        long startTime = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        XWPFDocument document = null;
        FileInputStream fis = null;
        
        try {
            // 检查参数
            if (options == null) {
                Log.e(TAG, "Error: options parameter is null");
                result.put("success", false);
                result.put("error", "Options parameter is null");
                return result;
            }
            
            Log.d(TAG, "Options received: " + options.toString());
            
            // 获取文件路径
            String filePath = options.getString("filePath");
            JSONObject styleConfig = options.getJSONObject("styleConfig");
            
            if (filePath == null || filePath.isEmpty()) {
                result.put("success", false);
                result.put("error", "文件路径无效");
                return result;
            }
            
            Log.d(TAG, "Start importing DOCX: " + filePath);
            
            // 读取文件
            File file = new File(filePath);
            if (!file.exists()) {
                result.put("success", false);
                result.put("error", "文件不存在: " + filePath);
                return result;
            }
            
            // 添加详细的权限和文件访问日志
            Log.d(TAG, "目标文件路径: " + file.getAbsolutePath());
            Log.d(TAG, "文件存在: " + file.exists());
            Log.d(TAG, "文件可读: " + file.canRead());
            Log.d(TAG, "父目录路径: " + (file.getParentFile() != null ? file.getParentFile().getAbsolutePath() : "null"));
            
            // 检查应用包名和权限状态
            try {
                android.content.Context context = getSafeContext();
                if (context != null) {
                    Log.d(TAG, "应用包名: " + context.getPackageName());
                    Log.d(TAG, "应用数据目录: " + context.getFilesDir().getAbsolutePath());
                    Log.d(TAG, "外部缓存目录: " + (context.getExternalCacheDir() != null ? context.getExternalCacheDir().getAbsolutePath() : "null"));
                    Log.d(TAG, "外部文件目录: " + (context.getExternalFilesDir(null) != null ? context.getExternalFilesDir(null).getAbsolutePath() : "null"));
                    
                    // 检查是否为应用私有目录 - 私有目录不需要特殊权限
                    String appPrivatePath = context.getExternalFilesDir(null).getAbsolutePath();
                    String appInternalPath = context.getFilesDir().getAbsolutePath();
                    boolean isAppPrivateFile = filePath.startsWith(appPrivatePath) || filePath.startsWith(appInternalPath);
                    
                    Log.d(TAG, "文件路径: " + filePath);
                    Log.d(TAG, "应用私有目录: " + appPrivatePath);
                    Log.d(TAG, "应用内部目录: " + appInternalPath);
                    Log.d(TAG, "文件路径是否以私有目录开头: " + filePath.startsWith(appPrivatePath));
                    Log.d(TAG, "文件路径是否以内部目录开头: " + filePath.startsWith(appInternalPath));
                    Log.d(TAG, "是否为应用私有文件: " + isAppPrivateFile);
                    
                    if (!isAppPrivateFile) {
                        // 非私有目录需要检查存储权限
                        boolean hasPermission = checkStoragePermission();
                        Log.d(TAG, "存储权限检查结果: " + hasPermission);
                        
                        if (!hasPermission) {
                            Log.w(TAG, "没有存储权限，尝试使用ContentResolver或文件选择器");
                            // 对于导入，我们需要提示用户使用ContentResolver或者文件选择器
                            String availableDir = getAvailableExportDirectory();
                            result.put("success", false);
                            result.put("error", "存储权限不足，请使用系统文件选择器选择文件，或将文件复制到应用私有目录：" + availableDir);
                            result.put("suggestedPath", availableDir);
                            result.put("permissionRequired", true);
                            return result;
                        }
                    } else {
                        Log.d(TAG, "应用私有文件，跳过权限检查");
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "获取应用上下文信息失败", e);
            }
            
            // 再次检查文件可读性
            if (!file.canRead()) {
                Log.w(TAG, "文件不可读: " + filePath);
                result.put("success", false);
                result.put("error", "文件不可读，请检查权限或将文件复制到应用可访问的目录");
                return result;
            }
            
            Log.d(TAG, "开始创建FileInputStream...");
            fis = new FileInputStream(file);
            Log.d(TAG, "FileInputStream创建成功，开始创建XWPFDocument...");
            document = new XWPFDocument(fis);
            Log.d(TAG, "XWPFDocument创建成功");
            
            // 默认样式配置
            JSONObject defaultStyle = new JSONObject();
            defaultStyle.put("title", createStyleConfig("宋体", 22, true));
            defaultStyle.put("descriptionTitle", createStyleConfig("宋体", 16, true));
            defaultStyle.put("descriptionContent", createStyleConfig("宋体", 14, false));
            defaultStyle.put("chapterTitle", createStyleConfig("宋体", 16, true));
            defaultStyle.put("chapterContent", createStyleConfig("宋体", 14, false));
            
            // 如果提供了样式配置，合并到默认配置中
            JSONObject finalStyleConfig = defaultStyle;
            if (styleConfig != null) {
                mergeStyleConfig(finalStyleConfig, styleConfig);
            }
            
            // 解析文档
            String title = "";
            String description = "";
            JSONArray chapters = new JSONArray();
            
            boolean foundTitle = false;
            boolean foundDescription = false;
            boolean inDescription = false;
            String currentChapterTitle = "";
            StringBuilder currentChapterContent = new StringBuilder();
            
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                String text = paragraph.getText();
                if (text == null || text.trim().isEmpty()) {
                    continue;
                }
                
                // 获取段落样式
                JSONObject paraStyle = getParagraphStyle(paragraph);
                
                // 检测标题（第一个匹配标题样式的段落）
                if (!foundTitle && matchesStyle(paraStyle, finalStyleConfig.getJSONObject("title"))) {
                    title = text.trim();
                    foundTitle = true;
                    Log.d(TAG, "Found title: " + title);
                    continue;
                }
                
                // 检测简介标题
                if (!foundDescription && text.trim().equals("简介") && 
                    matchesStyle(paraStyle, finalStyleConfig.getJSONObject("descriptionTitle"))) {
                    foundDescription = true;
                    inDescription = true;
                    Log.d(TAG, "Found description title");
                    continue;
                }
                
                // 检测简介内容
                if (inDescription && matchesStyle(paraStyle, finalStyleConfig.getJSONObject("descriptionContent"))) {
                    description = text.trim();
                    inDescription = false;
                    Log.d(TAG, "Found description: " + description.substring(0, Math.min(50, description.length())));
                    continue;
                }
                
                // 检测章节标题
                if (matchesStyle(paraStyle, finalStyleConfig.getJSONObject("chapterTitle"))) {
                    // 保存上一个章节
                    if (currentChapterTitle != null && !currentChapterTitle.isEmpty()) {
                        JSONObject chapter = new JSONObject();
                        chapter.put("title", currentChapterTitle);
                        chapter.put("content", currentChapterContent.toString());
                        chapters.add(chapter);
                        Log.d(TAG, "Added chapter: " + currentChapterTitle);
                    }
                    
                    // 开始新章节
                    currentChapterTitle = text.trim();
                    currentChapterContent = new StringBuilder();
                    Log.d(TAG, "Found chapter title: " + currentChapterTitle);
                    continue;
                }
                
                // 检测章节正文
                if (matchesStyle(paraStyle, finalStyleConfig.getJSONObject("chapterContent"))) {
                    // 获取缩进
                    String indent = getParagraphIndent(paragraph);
                    if (currentChapterContent.length() > 0) {
                        currentChapterContent.append("\n");
                    }
                    currentChapterContent.append(indent).append(text.trim());
                    continue;
                }
            }
            
            // 保存最后一个章节
            if (currentChapterTitle != null && !currentChapterTitle.isEmpty()) {
                JSONObject chapter = new JSONObject();
                chapter.put("title", currentChapterTitle);
                chapter.put("content", currentChapterContent.toString());
                chapters.add(chapter);
                Log.d(TAG, "Added last chapter: " + currentChapterTitle);
            }
            
            // 如果没有找到标题，使用文件名
            if (title == null || title.isEmpty()) {
                String fileName = file.getName();
                title = fileName.replaceAll("\\.docx$", "").replaceAll("\\.DOCX$", "");
                Log.d(TAG, "Using filename as title: " + title);
            }
            
            // 构建返回数据
            JSONObject data = new JSONObject();
            data.put("title", title);
            data.put("description", description != null ? description : "");
            data.put("chapters", chapters);
            
            result.put("success", true);
            result.put("data", data);
            result.put("duration", System.currentTimeMillis() - startTime);
            
            Log.d(TAG, "DOCX import successful, chapters: " + chapters.size());
            return result;
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            Log.e(TAG, "DOCX import failed, time: " + (endTime - startTime) + "ms", e);
            result.put("success", false);
            result.put("error", "DOCX导入失败: " + e.getMessage());
            result.put("duration", endTime - startTime);
            return result;
        } finally {
            // 确保资源正确关闭
            try {
                if (fis != null) {
                    fis.close();
                }
            } catch (Exception e) {
                Log.w(TAG, "Error closing file input stream", e);
            }
            
            try {
                if (document != null) {
                    document.close();
                }
            } catch (Exception e) {
                Log.w(TAG, "Error closing DOCX document", e);
            }
        }
    }
    
    /**
     * 创建样式配置对象
     */
    private JSONObject createStyleConfig(String font, int size, boolean bold) {
        JSONObject style = new JSONObject();
        style.put("font", font);
        style.put("size", size);
        style.put("bold", bold);
        return style;
    }
    
    /**
     * 合并样式配置
     */
    private void mergeStyleConfig(JSONObject target, JSONObject source) {
        if (source.containsKey("title")) {
            target.put("title", source.getJSONObject("title"));
        }
        if (source.containsKey("descriptionTitle")) {
            target.put("descriptionTitle", source.getJSONObject("descriptionTitle"));
        }
        if (source.containsKey("descriptionContent")) {
            target.put("descriptionContent", source.getJSONObject("descriptionContent"));
        }
        if (source.containsKey("chapterTitle")) {
            target.put("chapterTitle", source.getJSONObject("chapterTitle"));
        }
        if (source.containsKey("chapterContent")) {
            target.put("chapterContent", source.getJSONObject("chapterContent"));
        }
    }
    
    /**
     * 获取段落样式
     */
    private JSONObject getParagraphStyle(XWPFParagraph paragraph) {
        JSONObject style = new JSONObject();
        
        // 获取第一个Run的样式（通常段落中所有Run的样式相同）
        if (paragraph.getRuns() != null && paragraph.getRuns().size() > 0) {
            XWPFRun run = paragraph.getRuns().get(0);
            
            // 字体
            String fontFamily = run.getFontFamily();
            if (fontFamily == null || fontFamily.isEmpty()) {
                fontFamily = "宋体"; // 默认字体
            }
            style.put("font", fontFamily);
            
            // 字号
            int fontSize = run.getFontSize();
            if (fontSize == -1) {
                fontSize = 14; // 默认字号
            }
            style.put("size", fontSize);
            
            // 加粗
            boolean isBold = run.isBold();
            style.put("bold", isBold);
        } else {
            // 如果没有Run，使用默认值
            style.put("font", "宋体");
            style.put("size", 14);
            style.put("bold", false);
        }
        
        return style;
    }
    
    /**
     * 检查样式是否匹配
     */
    private boolean matchesStyle(JSONObject paraStyle, JSONObject targetStyle) {
        if (paraStyle == null || targetStyle == null) {
            return false;
        }
        
        // 检查字体（允许部分匹配，因为可能包含字体族信息）
        String paraFont = paraStyle.getString("font");
        String targetFont = targetStyle.getString("font");
        if (targetFont != null && paraFont != null) {
            if (!paraFont.contains(targetFont) && !targetFont.contains(paraFont)) {
                return false;
            }
        }
        
        // 检查字号（允许±1的误差）
        int paraSize = paraStyle.getIntValue("size");
        int targetSize = targetStyle.getIntValue("size");
        if (Math.abs(paraSize - targetSize) > 1) {
            return false;
        }
        
        // 检查加粗
        boolean paraBold = paraStyle.getBooleanValue("bold");
        boolean targetBold = targetStyle.getBooleanValue("bold");
        if (paraBold != targetBold) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取段落缩进
     */
    private String getParagraphIndent(XWPFParagraph paragraph) {
        try {
            // 使用反射或直接访问CTP来获取缩进信息
            // 由于CTPPr和CTInd可能不在标准POI包中，我们使用更安全的方式
            org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPPr ppr = 
                paragraph.getCTP().getPPr();
            if (ppr != null && ppr.getInd() != null) {
                org.openxmlformats.schemas.wordprocessingml.x2006.main.CTInd ind = ppr.getInd();
                // 获取首行缩进（以字符为单位）
                if (ind.getFirstLine() != null) {
                    Object firstLineObj = ind.getFirstLine();
                    long firstLine = 0;
                    if (firstLineObj instanceof Number) {
                        firstLine = ((Number) firstLineObj).longValue();
                    } else if (firstLineObj instanceof String) {
                        try {
                            firstLine = Long.parseLong((String) firstLineObj);
                        } catch (Exception e) {
                            firstLine = 0;
                        }
                    }
                    // 转换为空格（假设一个字符约等于2个空格）
                    // Word的缩进单位是twips（1/20 point），200 twips ≈ 1字符
                    int spaces = (int) (firstLine / 200);
                    if (spaces > 0) {
                        // 使用StringBuilder构建空格字符串（兼容Java 8+）
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < spaces; i++) {
                            sb.append(" ");
                        }
                        return sb.toString();
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error getting paragraph indent", e);
        }
        return "";
    }
    
    /**
     * 从DOCX文件导入作品（异步回调版本）
     * @param options JSON对象，包含filePath和styleConfig
     * @param callback 回调函数
     */
    @UniJSMethod(uiThread = false)
    public void importFromDOCX(JSONObject options, UniJSCallback callback) {
        JSONObject result = null;
        try {
            Log.d(TAG, "importFromDOCX called, starting import...");
            result = doImportDOCX(options);
            Log.d(TAG, "importFromDOCX completed, result success: " + (result != null ? result.getBoolean("success") : "null"));
        } catch (Exception e) {
            Log.e(TAG, "importFromDOCX exception caught", e);
            result = new JSONObject();
            result.put("success", false);
            result.put("error", "DOCX导入异常: " + e.getMessage());
        } finally {
            // 确保回调总是被调用
            if (callback != null) {
                try {
                    if (result == null) {
                        result = new JSONObject();
                        result.put("success", false);
                        result.put("error", "导入结果为空");
                    }
                    Log.d(TAG, "Invoking callback with result: " + result.toString());
                    callback.invoke(result);
                    Log.d(TAG, "Callback invoked successfully");
                } catch (Exception callbackError) {
                    Log.e(TAG, "Failed to invoke callback", callbackError);
                }
            } else {
                Log.w(TAG, "importFromDOCX: callback is null, result not returned");
            }
        }
    }
    
    /**
     * 从DOCX文件导入作品（同步版本）
     * @param options JSON对象，包含filePath和styleConfig
     * @return 解析结果JSON对象
     */
    @UniJSMethod(uiThread = false)
    public JSONObject importFromDOCXSync(JSONObject options) {
        Log.d(TAG, "importFromDOCXSync called");
        if (options == null) {
            Log.e(TAG, "importFromDOCXSync: options parameter is null");
            JSONObject result = new JSONObject();
            result.put("success", false);
            result.put("error", "Options parameter is null in importFromDOCXSync");
            return result;
        }
        Log.d(TAG, "importFromDOCXSync: options received, type: " + options.getClass().getName());
        Log.d(TAG, "importFromDOCXSync: options content: " + options.toString());
        
        return doImportDOCX(options);
    }
    
    /**
     * 打开文件选择器选择DOCX文件导入
     * @param callback 返回选中的文件路径
     */
    @UniJSMethod(uiThread = true)
    public void pickDOCXFileToImport(UniJSCallback callback) {
        try {
            android.content.Context context = getSafeContext();
            if (context == null) {
                Log.e(TAG, "Context is null, cannot open file picker");
                if (callback != null) {
                    JSONObject result = new JSONObject();
                    result.put("success", false);
                    result.put("error", "无法获取上下文");
                    callback.invoke(result);
                }
                return;
            }
            
            if (!(context instanceof android.app.Activity)) {
                Log.e(TAG, "Context is not an Activity, cannot open file picker");
                if (callback != null) {
                    JSONObject result = new JSONObject();
                    result.put("success", false);
                    result.put("error", "需要Activity上下文才能打开文件选择器");
                    callback.invoke(result);
                }
                return;
            }
            
            android.app.Activity activity = (android.app.Activity) context;
            
            // 创建Intent选择DOCX文件
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.putExtra(Intent.EXTRA_TITLE, "选择要导入的DOCX文件");
            
            // 尝试启动文件选择器
            try {
                activity.startActivityForResult(Intent.createChooser(intent, "选择DOCX文件"), REQUEST_PICK_DOCX_FILE);
                
                // 保存回调以在结果处理中使用（需要全局变量）
                // 注意：这里简化处理，实际应用中可能需要更复杂的回调管理
                if (callback != null) {
                    JSONObject result = new JSONObject();
                    result.put("success", true);
                    result.put("message", "文件选择器已打开，请在onActivityResult中处理结果");
                    callback.invoke(result);
                }
                
            } catch (android.content.ActivityNotFoundException e) {
                Log.e(TAG, "找不到可以处理DOCX文件的应用", e);
                if (callback != null) {
                    JSONObject result = new JSONObject();
                    result.put("success", false);
                    result.put("error", "找不到可以处理DOCX文件的应用");
                    callback.invoke(result);
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "打开文件选择器失败", e);
            if (callback != null) {
                JSONObject result = new JSONObject();
                result.put("success", false);
                result.put("error", "打开文件选择器失败: " + e.getMessage());
                callback.invoke(result);
            }
        }
    }
    
    /**
     * 从Uri导入DOCX文件
     * @param uriString 文件URI字符串
     * @param callback 回调函数
     */
    @UniJSMethod(uiThread = false)
    public void importFromDOCXUri(String uriString, UniJSCallback callback) {
        JSONObject result = new JSONObject();
        
        try {
            Log.d(TAG, "importFromDOCXUri called with URI: " + uriString);
            
            if (uriString == null || uriString.isEmpty()) {
                result.put("success", false);
                result.put("error", "URI为空");
                if (callback != null) callback.invoke(result);
                return;
            }
            
            android.content.Context context = getSafeContext();
            if (context == null) {
                result.put("success", false);
                result.put("error", "无法获取上下文");
                if (callback != null) callback.invoke(result);
                return;
            }
            
            // 解析URI获取文件路径
            String filePath = getFilePathFromUri(context, Uri.parse(uriString));
            if (filePath == null) {
                result.put("success", false);
                result.put("error", "无法从URI获取文件路径");
                if (callback != null) callback.invoke(result);
                return;
            }
            
            // 调用标准导入方法
            JSONObject options = new JSONObject();
            options.put("filePath", filePath);
            // 使用默认样式配置
            JSONObject styleConfig = new JSONObject();
            options.put("styleConfig", styleConfig);
            
            result = doImportDOCX(options);
            
        } catch (Exception e) {
            Log.e(TAG, "从URI导入DOCX失败", e);
            result.put("success", false);
            result.put("error", "从URI导入失败: " + e.getMessage());
        }
        
        if (callback != null) {
            callback.invoke(result);
        }
    }
    
    /**
     * 从URI获取文件路径
     */
    private String getFilePathFromUri(android.content.Context context, Uri uri) {
        try {
            // 处理file:// URI
            if ("file".equals(uri.getScheme())) {
                return uri.getPath();
            }
            
            // 处理content:// URI
            if ("content".equals(uri.getScheme())) {
                String[] projection = {android.provider.OpenableColumns.DISPLAY_NAME};
                try (android.database.Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        int columnIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                        if (columnIndex != -1) {
                            String fileName = cursor.getString(columnIndex);
                            // 创建临时文件
                            java.io.File tempFile = new java.io.File(context.getCacheDir(), fileName);
                            try (java.io.InputStream inputStream = context.getContentResolver().openInputStream(uri);
                                 java.io.FileOutputStream outputStream = new java.io.FileOutputStream(tempFile)) {
                                byte[] buffer = new byte[4096];
                                int bytesRead;
                                while ((bytesRead = inputStream.read(buffer)) != -1) {
                                    outputStream.write(buffer, 0, bytesRead);
                                }
                                return tempFile.getAbsolutePath();
                            }
                        }
                    }
                }
            }
            
            // 如果无法获取路径，尝试直接打开URI
            return openUriToTempFile(context, uri);
            
        } catch (Exception e) {
            Log.e(TAG, "从URI获取文件路径失败", e);
            return null;
        }
    }
    
    /**
     * 将URI内容复制到临时文件
     */
    private String openUriToTempFile(android.content.Context context, Uri uri) {
        try {
            java.io.InputStream inputStream = context.getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                return null;
            }
            
            // 创建临时文件
            String fileName = "temp_import_" + System.currentTimeMillis() + ".docx";
            java.io.File tempFile = new java.io.File(context.getCacheDir(), fileName);
            
            try (java.io.FileOutputStream outputStream = new java.io.FileOutputStream(tempFile)) {
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }
            }
            
            inputStream.close();
            return tempFile.getAbsolutePath();
            
        } catch (Exception e) {
            Log.e(TAG, "将URI复制到临时文件失败", e);
            return null;
        }
    }
    
}