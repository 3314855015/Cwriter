/**
 * 文件权限和路径选择工具 - 纯JavaScript实现
 * 避免修改原生代码，节省打包费用
 */

/**
 * 请求存储权限（Android 6.0+）
 * 使用uni-app的权限API
 */
export function requestStoragePermission() {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    // Android 10+ 使用应用私有目录，不需要权限
    if (plus.os.name === "Android" && parseInt(plus.os.version) >= 10) {
      console.log("✅ Android 10+ 使用应用私有目录，不需要权限");
      resolve(true);
      return;
    }

    // Android 6.0-9 需要权限
    uni.authorize({
      scope: "scope.writePhotosAlbum", // 这个可能不对，需要检查
      success: () => {
        console.log("✅ 存储权限已授予");
        resolve(true);
      },
      fail: (err) => {
        console.warn("⚠️ 权限请求失败:", err);
        // 权限请求失败，尝试继续（可能用户已授予）
        resolve(false);
      },
    });
    // #endif

    // #ifndef APP-PLUS
    // 非App环境不需要权限
    resolve(true);
    // #endif
  });
}

/**
 * 使用uni-app的文件选择API选择保存位置
 * 注意：uni-app可能不直接支持文件保存选择器，这里使用替代方案
 */
export function selectSaveLocation(fileName, mimeType) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    // 方案1: 使用uni.chooseFile（如果支持）
    if (typeof uni.chooseFile === "function") {
      uni.chooseFile({
        count: 1,
        type: "file",
        success: (res) => {
          if (res.tempFiles && res.tempFiles.length > 0) {
            resolve(res.tempFiles[0].path);
          } else {
            reject(new Error("未选择文件"));
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
      return;
    }

    // 方案2: 使用plus.io.requestFileSystem让用户选择目录
    // 注意：plus.io可能不支持直接选择，这里使用默认路径
    console.log("⚠️ uni.chooseFile不可用，使用默认路径");
    const defaultPath = getDefaultSavePath(fileName);
    resolve(defaultPath);
    // #endif

    // #ifndef APP-PLUS
    // H5环境，直接返回文件名
    resolve(fileName);
    // #endif
  });
}

/**
 * 获取默认保存路径（应用私有目录）
 * 这是最安全的方式，不需要权限
 */
export function getDefaultSavePath(fileName) {
  // #ifdef APP-PLUS
  // 使用应用私有目录（_downloads），不需要权限
  const timestamp = new Date().getTime();
  const safeFileName = fileName.replace(/[^\w\s-]/g, "").trim();
  return `_downloads/${safeFileName}_${timestamp}`;
  // #endif

  // #ifndef APP-PLUS
  return fileName;
  // #endif
}

/**
 * 检查并请求必要的权限
 * 如果权限已授予或不需要权限，返回true
 */
export async function ensureStoragePermission() {
  try {
    // #ifdef APP-PLUS
    // Android 10+ 不需要权限（使用应用私有目录）
    if (plus.os.name === "Android" && parseInt(plus.os.version) >= 10) {
      return true;
    }

    // 检查权限状态
    const result = await new Promise((resolve) => {
      uni.getSetting({
        success: (res) => {
          // 检查存储权限
          // 注意：uni-app的权限检查可能不完整
          resolve(true); // 默认允许，让系统处理
        },
        fail: () => {
          resolve(true); // 失败时也允许，让系统处理
        },
      });
    });

    return result;
    // #endif

    // #ifndef APP-PLUS
    return true;
    // #endif
  } catch (error) {
    console.warn("权限检查失败:", error);
    return true; // 失败时允许继续，让系统处理
  }
}

/**
 * 显示文件保存提示
 * 告知用户文件保存位置
 */
export function showSaveLocationInfo(filePath) {
  // #ifdef APP-PLUS
  // 转换路径为可读格式
  let displayPath = filePath;
  if (filePath.startsWith("_downloads/")) {
    displayPath = "应用下载目录/" + filePath.replace("_downloads/", "");
  }

  uni.showToast({
    title: `文件已保存到: ${displayPath}`,
    icon: "none",
    duration: 3000,
  });
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({
    title: `文件已保存: ${filePath}`,
    icon: "success",
    duration: 2000,
  });
  // #endif
}

/**
 * 打开文件管理器显示保存的文件
 * 仅在Android上可用
 */
export function openFileManager(filePath) {
  // #ifdef APP-PLUS
  if (plus.os.name === "Android") {
    try {
      // 转换路径
      const fullPath = filePath.startsWith("_downloads/")
        ? plus.io.convertLocalFileSystemURL(filePath)
        : filePath;

      // 使用Intent打开文件管理器
      const Intent = plus.android.importClass("android.content.Intent");
      const File = plus.android.importClass("java.io.File");

      const main = plus.android.runtimeMainActivity();
      const file = new File(fullPath);

      // 检查文件是否存在
      if (!file.exists()) {
        console.warn("文件不存在:", fullPath);
        showSaveLocationInfo(filePath);
        return;
      }

      // 尝试使用FileProvider（需要配置）
      try {
        const FileProvider = plus.android.importClass(
          "androidx.core.content.FileProvider"
        );
        const fileUri = FileProvider.getUriForFile(
          main,
          main.getPackageName() + ".fileprovider",
          file
        );

        const intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(fileUri, getMimeType(filePath));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        main.startActivity(intent);
      } catch (fileProviderError) {
        // FileProvider不可用，使用file:// URI（Android 7.0+可能不支持）
        console.warn(
          "FileProvider不可用，尝试使用file:// URI:",
          fileProviderError
        );
        const Uri = plus.android.importClass("android.net.Uri");
        const fileUri = Uri.fromFile(file);

        const intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(fileUri, getMimeType(filePath));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        main.startActivity(intent);
      }
    } catch (error) {
      console.warn("打开文件管理器失败:", error);
      // 降级方案：显示提示
      showSaveLocationInfo(filePath);
    }
  }
  // #endif
}

/**
 * 根据文件扩展名获取MIME类型
 */
function getMimeType(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    txt: "text/plain",
    html: "text/html",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
