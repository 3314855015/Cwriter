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

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
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

/**
 * Export Module - Provide PDF and DOCX export functions
 *
 * Use iText to generate PDF (Android compatible)
 * Use Apache POI to generate DOCX
 */
public class ExportModule extends UniModule {

    private static final String TAG = "ExportModule";
    private static final int REQUEST_WRITE_EXTERNAL_STORAGE = 1001;
    
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
    
}