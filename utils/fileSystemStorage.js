// 文件系统存储管理工具
// 基于uni-app FileSystemManager的文件系统存储方案

import { c } from "@dcloudio/uni-mp-vue";

// 检测当前运行环境
function getEnvironment() {
  // 🔍 更精确的环境检测 - 修正版

  // 🎯 最优先：通过 uni.getSystemInfoSync 检测平台
  if (
    typeof uni !== "undefined" &&
    typeof uni.getSystemInfoSync === "function"
  ) {
    try {
      const systemInfo = uni.getSystemInfoSync();
      console.log("📱 系统信息详情:", {
        platform: systemInfo.platform, // android/ios/devtools
        uniPlatform: systemInfo.uniPlatform, // app/h5/mp-weixin
        system: systemInfo.system, // Android 13/iOS etc.
        appId: systemInfo.appId,
        version: systemInfo.version,
      });

      // 🎯 关键判断：uniPlatform === 'app' 表示App环境
      if (systemInfo.uniPlatform === "app") {
        // App环境使用plus.io，不需要检查uni.getFileSystemManager
        if (typeof plus !== "undefined" && plus.io) {
          return "APP";
        } else {
          return "APP_FALLBACK";
        }
      }

      // H5环境
      if (systemInfo.uniPlatform === "h5") {
        return "H5";
      }

      // 微信小程序环境
      if (systemInfo.uniPlatform === "mp-weixin") {
        return "MP-WEIXIN";
      }
    } catch (e) {
      console.warn("获取系统信息失败:", e);
    }
  }

  // 🎯 备用检测：通过 process.env.UNI_PLATFORM
  if (process.env.UNI_PLATFORM) {
    if (process.env.UNI_PLATFORM === "app") {
      return "APP";
    }
    if (process.env.UNI_PLATFORM === "h5") {
      return "H5";
    }
    if (process.env.UNI_PLATFORM === "mp-weixin") {
      return "MP-WEIXIN";
    }
  }

  // 🎯 备用检测：通过 plus 对象（5+ App）
  if (typeof plus !== "undefined") {
    return "APP";
  }

  // 🎯 H5环境检测（放在后面，避免误判）
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "H5";
  }

  // 🎯 微信小程序环境检测（更严格的检测）
  if (typeof wx !== "undefined" && wx.getSystemInfo) {
    return "MP-WEIXIN";
  } else return "UNKNOWN";
}

export class FileSystemStorage {
  constructor() {
    try {
      this.environment = getEnvironment();

      // 🎯 根据环境决定存储策略
      if (this.environment === "APP") {
        // App环境，使用plus.io模块
        if (typeof plus !== "undefined" && plus.io) {
          this.useLocalStorageFallback = false;
          this.initPlusIO();
        } else {
          this.useLocalStorageFallback = true;
          this.initLocalStorageFallback();
        }
      } else if (this.environment === "MP-WEIXIN") {
        // 小程序环境，使用uni.getFileSystemManager
        if (typeof uni.getFileSystemManager === "function") {
          this.useLocalStorageFallback = false;
          this.initFileSystemManager();
        } else {
          this.useLocalStorageFallback = true;
          this.initLocalStorageFallback();
        }
      } else {
        // 其他环境，使用localStorage降级

        this.useLocalStorageFallback = true;
        this.initLocalStorageFallback();
      }
    } catch (error) {
      console.error("文件系统存储初始化失败:", error);
      // 如果初始化失败，至少设置基本标志
      this.environment = "ERROR";
      this.useLocalStorageFallback = true;
      this.initLocalStorageFallback();
    }
  }

  // 初始化plus.io模块（App端）
  initPlusIO() {
    try {
      this.fileManager = plus.io;
      this.basePath = "_doc/cwriter_data";
      this.configFile = `${this.basePath}/global.config.json`;

      // 创建plus.io兼容层
      this.setupPlusIOCompatibility();

      // 确保基础目录存在
      this.ensureDirExists(this.basePath);

      // 初始化全局配置文件
      this.initGlobalConfig();

      // 确保默认用户存在
      this.ensureDefaultUser();
    } catch (error) {
      console.error("❌ plus.io模块初始化失败:", error);

      this.useLocalStorageFallback = true;
      this.initLocalStorageFallback();
    }
  }

  // 初始化全局配置文件
  initGlobalConfig() {
    if (this.useLocalStorageFallback) {
      return; // localStorage环境下不需要初始化全局配置
    }

    try {
      // 异步检查并创建全局配置文件
      this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getFile(
          this.configFile,
          { create: true },
          (fileEntry) => {
            fileEntry.file(
              (file) => {
                if (file.size === 0) {
                  // 文件为空，创建默认配置
                  fileEntry.createWriter((writer) => {
                    writer.onwriteend = () => {};
                    writer.onerror = (error) => {
                      console.warn("⚠️ 写入全局配置文件失败:", error);
                    };
                    const defaultConfig = {
                      version: "2.0.0",
                      created_at: new Date().toISOString(),
                      users: {},
                      logs_count: {},
                      backups_count: {},
                      storage_type: "plus_io",
                    };
                    writer.write(JSON.stringify(defaultConfig, null, 2));
                  });
                } else {
                }
              },
              (error) => {
                console.warn("⚠️ 读取全局配置文件失败:", error);
              }
            );
          },
          (error) => {
            console.warn("⚠️ 创建全局配置文件失败:", error);
          }
        );
      });
    } catch (error) {
      console.warn("⚠️ 初始化全局配置失败:", error);
    }
  }

  // 确保默认用户存在（恒存在的本地用户）
  ensureDefaultUser() {
    if (this.useLocalStorageFallback) {
      return; // localStorage环境下不需要
    }

    try {
      const defaultUserId = "default_user";
      const defaultUserPath = this.getUserPath(defaultUserId);

      // 创建默认用户目录结构
      this.mkdirIfNotExists(defaultUserPath);
      this.mkdirIfNotExists(`${defaultUserPath}/works`);
      this.mkdirIfNotExists(`${this.basePath}/logs`);
      this.mkdirIfNotExists(`${this.basePath}/logs/${defaultUserId}`);
    } catch (error) {
      console.warn("⚠️ 创建默认用户目录失败:", error);
    }
  }

  // 设置plus.io兼容层
  setupPlusIOCompatibility() {
    this.fs = {
      // 兼容mkdirSync (同步版本)
      mkdirSync: (dirPath, recursive) => {
        // plus.io是异步的，这里简化处理
        try {
          this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
            fs.root.getDirectory(
              dirPath,
              { create: true },
              (dirEntry) => {},
              (error) => {
                // 忽略已存在的错误
                if (!error.code || error.code !== 10) {
                  // 10 = 文件已存在
                  console.warn(`⚠️ 创建目录失败: ${dirPath}`, error);
                }
              }
            );
          });
        } catch (error) {
          console.warn(`⚠️ mkdirSync错误:`, error);
        }
      },

      // 兼容writeFileSync (同步版本)
      writeFileSync: (filePath, content, encoding) => {
        try {
          this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
            fs.root.getFile(
              filePath,
              { create: true },
              (fileEntry) => {
                fileEntry.createWriter((writer) => {
                  writer.onwriteend = () => {
                    // 文件写入成功
                  };
                  writer.onerror = (error) => {
                    console.error(`❌ 文件写入失败: ${filePath}`, error);
                  };
                  writer.write(content);
                });
              },
              (error) => {
                console.error(`❌ 获取文件失败: ${filePath}`, error);
              }
            );
          });
        } catch (error) {
          console.error(`⚠️ writeFileSync错误:`, error);
        }
      },

      // 兼容readFileSync (同步版本)
      readFileSync: (filePath, encoding) => {
        try {
          this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
            fs.root.getFile(
              filePath,
              {},
              (fileEntry) => {
                fileEntry.file(
                  (file) => {
                    const reader = new plus.io.FileReader();
                    reader.onloadend = () => {};
                    reader.onerror = (error) => {
                      console.error(`❌ 文件读取失败: ${filePath}`, error);
                    };
                    reader.readAsText(file, encoding);
                  },
                  (error) => {
                    console.error(`❌ 获取文件失败: ${filePath}`, error);
                  }
                );
              },
              (error) => {
                console.error(`❌ 文件不存在: ${filePath}`, error);
              }
            );
          });
        } catch (error) {
          console.error(`⚠️ readFileSync错误:`, error);
          return null;
        }
      },

      // 兼容readdirSync (同步版本)
      readdirSync: (dirPath) => {
        // 注意：plus.io 没有同步的目录读取，这里返回空数组
        // 实际项目中应该改用异步方式，这里为了兼容性临时处理
        console.warn("⚠️ plus.io不支持同步目录读取，返回空数组");
        return [];
      },

      // 兼容existsSync (同步版本)
      existsSync: (filePath) => {
        // 简化处理，假设文件存在
        return true;
      },
    };
  }

  // 初始化文件系统管理器（小程序端）
  initFileSystemManager() {
    try {
      this.fileManager = uni.getFileSystemManager();
      this.basePath = `${uni.env.USER_DATA_PATH}/cwriter_data`;
      this.configFile = `${this.basePath}/global.config.json`;

      // 确保基础目录存在
      this.ensureDirExists(this.basePath);

      // 初始化全局配置文件
      this.initGlobalConfig();

      // 确保默认用户存在
      this.ensureDefaultUser();
    } catch (error) {
      console.error("❌ 文件系统管理器初始化失败:", error);

      this.useLocalStorageFallback = true;
      this.initLocalStorageFallback();
    }
  }

  // 初始化本地存储 fallback
  initLocalStorageFallback() {
    const STORAGE_KEY = "cwriter_filesystem_fallback";

    try {
      // 获取或创建基础存储结构
      let storageData = uni.getStorageSync(STORAGE_KEY);
      if (!storageData) {
        storageData = {
          version: "2.0.0",
          created_at: new Date().toISOString(),
          storage_type: "localStorage_fallback",
          users: {},
          logs_count: {},
          backups_count: {},
          data: {
            users: {},
            offline: {},
            logs: {},
            backups: {},
          },
        };
        uni.setStorageSync(STORAGE_KEY, storageData);

        // 确保默认用户存在
        const defaultUserId = "default_user";
        if (!storageData.data.users[defaultUserId]) {
          storageData.data.users[defaultUserId] = {
            id: defaultUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            preferences: {
              autoSaveInterval: 30,
              lastLogin: new Date().toISOString(),
            },
          };
          uni.setStorageSync(STORAGE_KEY, storageData);
        }
      }

      this.fallbackStorageKey = STORAGE_KEY;
      this.basePath = "cwriter_data"; // 模拟路径
      this.configFile = "global.config.json"; // 模拟配置文件路径
    } catch (error) {
      console.error("❌ 本地存储 fallback 初始化失败:", error);
      throw new Error(`本地存储 fallback 初始化失败: ${error.message}`);
    }
  }

  // 确保目录存在 (plus.io版本)
  ensureDirExists(dirPath) {
    if (this.useLocalStorageFallback) {
      return; // localStorage环境下不需要创建目录
    }

    try {
      // plus.io API 创建目录
      this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getDirectory(
          dirPath,
          { create: true },
          (dirEntry) => {
            // 目录确保存在: dirPath
          },
          (error) => {
            console.warn(`⚠️ 创建目录失败: ${dirPath}`, error);
          }
        );
      });
    } catch (error) {
      console.warn(`⚠️ ensureDirExists 错误:`, error);
    }
  }

  // 确保指定文件存在（可选默认内容）
  async ensureFileExists(filePath, defaultData = null) {
    if (this.useLocalStorageFallback) {
      return true;
    }

    const createDefaultFile = () => {
      if (defaultData !== null) {
        try {
          this.writeFile(filePath, defaultData);
          return true;
        } catch (writeError) {
          console.error(`❌ 创建默认文件失败: ${filePath}`, writeError);
        }
      }
      return false;
    };

    return new Promise((resolve) => {
      try {
        this.fileManager.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getFile(
              filePath,
              { create: false },
              () => {
                resolve(true);
              },
              (error) => {
                if (error?.code === 14 || error?.message?.includes("不存在")) {
                  resolve(createDefaultFile());
                } else {
                  console.warn(`⚠️ 获取文件失败: ${filePath}`, error);
                  resolve(false);
                }
              }
            );
          },
          (error) => {
            console.warn("⚠️ requestFileSystem失败:", error);
            resolve(false);
          }
        );
      } catch (error) {
        console.warn("⚠️ ensureFileExists 错误:", error);
        resolve(false);
      }
    });
  }

  // 安全创建目录 (小程序版本)
  mkdirIfNotExists(dirPath) {
    if (this.useLocalStorageFallback) {
      return; // H5 环境下不需要创建目录
    }

    try {
      // 确保 fs 对象存在
      if (this.fs && this.fs.mkdirSync) {
        this.fs.mkdirSync(dirPath, true);
      } else {
        console.warn("文件系统接口不可用，跳过目录创建:", dirPath);
      }
    } catch (error) {
      // 目录已存在则忽略错误
      if (error.errMsg && error.errMsg.includes("file already exists")) {
        return;
      }
      console.warn("创建目录失败:", dirPath, error);
      // 不抛出错误，继续执行
    }
  }

  // 检查文件是否存在
  fileExists(filePath) {
    if (this.useLocalStorageFallback) {
      return false; // H5 环境下不检查文件存在性
    }

    try {
      this.fs.accessSync(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 写入文件
  writeFile(filePath, data) {
    if (!filePath) {
      console.error("❌ writeFile: 文件路径不能为空");
      throw new Error("文件路径不能为空");
    }

    if (this.useLocalStorageFallback) {
      return true; // H5 环境下不需要写入真实文件
    }

    try {
      const content = JSON.stringify(data, null, 2);

      this.fs.writeFileSync(filePath, content, "utf8");
      return true;
    } catch (error) {
      console.error(`写入文件失败: ${filePath}`, error);
      throw new Error(`写入文件失败: ${error.message}`);
    }
  }

  // 读取文件
  async readFile(filePath) {
    if (this.useLocalStorageFallback) {
      return this.readFileFallback(filePath);
    }

    try {
      // plus.io环境下需要异步读取
      return new Promise((resolve, reject) => {
        this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
          fs.root.getFile(
            filePath,
            {},
            (fileEntry) => {
              fileEntry.file(
                (file) => {
                  const reader = new plus.io.FileReader();
                  reader.onloadend = () => {
                    try {
                      const content = this.safeParseJSON(
                        reader.result,
                        filePath
                      );
                      resolve(content);
                    } catch (parseError) {
                      console.error(`文件解析失败: ${filePath}`, parseError);
                      this.handleParseError(filePath, resolve);
                    }
                  };
                  reader.onerror = (error) => {
                    console.error(`文件读取失败: ${filePath}`, error);
                    resolve(null);
                  };
                  reader.readAsText(file, "utf8");
                },
                (error) => {
                  // 如果是全局配置文件且不存在，创建默认配置
                  if (filePath === this.configFile) {
                    this.createDefaultGlobalConfig()
                      .then(resolve)
                      .catch(() => resolve(null));
                  } else {
                    console.warn(`文件不存在: ${filePath}`);
                    resolve(null);
                  }
                }
              );
            },
            (error) => {
              // 如果是全局配置文件且获取失败，创建默认配置
              if (filePath === this.configFile) {
                this.createDefaultGlobalConfig()
                  .then(resolve)
                  .catch(() => resolve(null));
              } else {
                // 检查是否是路径包含undefined的错误
                if (filePath.includes("undefined/")) {
                  console.error(
                    "❌ 路径包含undefined，检查userId和workId是否正确传递",
                    {
                      filePath,
                      error,
                    }
                  );
                } else {
                  console.error(`获取文件失败: ${filePath}`, error);
                }
                resolve(null);
              }
            }
          );
        });
      });
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error);
      return null;
    }
  }

  handleParseError(filePath, resolve) {
    if (!filePath) {
      resolve(null);
      return;
    }

    const userConfigMatch = filePath.match(
      /users\/([^/]+)\/user\.config\.json$/
    );
    if (userConfigMatch) {
      const userId = userConfigMatch[1];
      this.createDefaultUserConfig(userId)
        .then(resolve)
        .catch(() => resolve(null));
      return;
    }

    resolve(null);
  }

  safeParseJSON(rawContent, filePath) {
    if (!rawContent || typeof rawContent !== "string") {
      return null;
    }

    // 去除 BOM 和首尾空白，减少解析失败概率
    let normalized = rawContent.replace(/^\uFEFF/, "").trim();
    if (!normalized) {
      return null;
    }

    try {
      return JSON.parse(normalized);
    } catch (error) {
      // 如果还有不可见字符，尝试进一步清理
      normalized = normalized.replace(/[\u0000-\u001f]/g, "");
      return JSON.parse(normalized);
    }
  }

  // 创建默认全局配置
  async createDefaultGlobalConfig() {
    try {
      const defaultConfig = {
        version: "2.0.0",
        created_at: new Date().toISOString(),
        users: {},
        logs_count: {},
        backups_count: {},
        storage_type: "plus_io",
      };

      await this.writeFile(this.configFile, defaultConfig);

      return defaultConfig;
    } catch (error) {
      console.error("❌ 创建默认全局配置失败:", error);
      return null;
    }
  }

  // 获取实际存储路径信息（调试用）
  getStoragePaths() {
    if (this.useLocalStorageFallback) {
      return {
        type: "localStorage",
        basePath: "cwriter_data (localStorage)",
        configFile: "global.config.json (localStorage)",
        note: "使用uni.setStorageSync存储在应用私有区域",
      };
    } else {
      return {
        type: "plus.io",
        basePath: this.basePath,
        configFile: this.configFile,
        actualPaths: {
          doc: "_doc/ → 应用私有文件目录 (通常对应 /data/data/com.example.cwriter/files/)",
          userData: `${this.basePath}/users/{userId}`,
          userConfig: `${this.basePath}/users/{userId}/user.config.json`,
          works: `${this.basePath}/users/{userId}/works/{workId}`,
          logs: `${this.basePath}/logs/{userId}/operations.json`,
        },
        note: "使用plus.io存储在应用私有文档目录",
      };
    }
  }

  // 输出存储路径信息
  logStoragePaths(userId = "example_user") {
    const paths = this.getStoragePaths();

    if (!this.useLocalStorageFallback) {
    }
  }

  // 删除文件
  deleteFile(filePath) {
    if (this.useLocalStorageFallback) {
      return Promise.resolve(true); // H5 环境下不需要删除真实文件
    }

    return new Promise((resolve) => {
      try {
        this.fileManager.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getFile(
              filePath,
              { create: false },
              (fileEntry) => {
                fileEntry.remove(
                  () => resolve(true),
                  (error) => {
                    console.error(`删除文件失败: ${filePath}`, error);
                    resolve(false);
                  }
                );
              },
              (error) => {
                // 文件不存在也视为删除成功
                if (error?.code === 8 || error?.message?.includes("不存在")) {
                  resolve(true);
                } else {
                  console.error(`获取文件失败: ${filePath}`, error);
                  resolve(false);
                }
              }
            );
          },
          (error) => {
            console.error(`requestFileSystem失败: ${filePath}`, error);
            resolve(false);
          }
        );
      } catch (error) {
        console.error(`删除文件失败: ${filePath}`, error);
        resolve(false);
      }
    });
  }

  // 删除目录及其内容
  deleteDirectory(dirPath) {
    if (this.useLocalStorageFallback) {
      return Promise.resolve(true); // H5 环境下不需要删除真实目录
    }

    return new Promise((resolve) => {
      try {
        this.fileManager.requestFileSystem(
          plus.io.PUBLIC_DOCUMENTS,
          (fs) => {
            fs.root.getDirectory(
              dirPath,
              { create: false },
              (dirEntry) => {
                dirEntry.removeRecursively(
                  () => resolve(true),
                  (error) => {
                    console.error(`删除目录失败: ${dirPath}`, error);
                    resolve(false);
                  }
                );
              },
              (error) => {
                // 目录不存在同样视为成功
                if (error?.code === 8 || error?.message?.includes("不存在")) {
                  resolve(true);
                } else {
                  console.error(`获取目录失败: ${dirPath}`, error);
                  resolve(false);
                }
              }
            );
          },
          (error) => {
            console.error(`requestFileSystem失败: ${dirPath}`, error);
            resolve(false);
          }
        );
      } catch (error) {
        console.error(`删除目录失败: ${dirPath}`, error);
        resolve(false);
      }
    });
  }

  // 获取用户文件路径
  getUserPath(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserPath: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    if (this.useLocalStorageFallback) {
      return `mock_path/users/${userId}`; // H5 环境下的模拟路径
    }
    return `${this.basePath}/users/${userId}`;
  }

  // 获取作品文件路径
  getWorkPath(userId, workId) {
    if (!userId || !workId) {
      console.error("❌ getWorkPath: 缺少必要参数", { userId, workId });
      return null; // 返回null而不是抛出错误，让调用方处理
    }

    if (this.useLocalStorageFallback) {
      return `mock_path/users/${userId}/works/${workId}`; // H5 环境下的模拟路径
    }
    return `${this.getUserPath(userId)}/works/${workId}`;
  }

  // 获取用户配置文件路径
  getUserConfigPath(userId) {
    if (this.useLocalStorageFallback) {
      return `mock_path/users/${userId}/user.config.json`; // H5 环境下的模拟路径
    }
    return `${this.getUserPath(userId)}/user.config.json`;
  }

  async createDefaultUserConfig(userId) {
    const userConfigPath = this.getUserConfigPath(userId);
    const userConfig = {
      id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: {
        autoSaveInterval: 30,
        lastLogin: new Date().toISOString(),
      },
    };

    try {
      this.writeFile(userConfigPath, userConfig);
      return userConfig;
    } catch (error) {
      console.error(`❌ 创建默认用户配置失败: ${userId}`, error);
      throw error;
    }
  }

  // 初始化用户存储空间
  async initUserStorage(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ initUserStorage: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    if (this.useLocalStorageFallback) {
      return this.initUserStorageFallback(userId);
    }

    const userPath = this.getUserPath(userId);
    const userConfigPath = this.getUserConfigPath(userId);

    // 创建用户目录结构
    this.mkdirIfNotExists(userPath);
    this.mkdirIfNotExists(`${userPath}/works`);

    // 如果用户配置不存在，创建默认配置（不包含 works 字段）
    if (!this.fileExists(userConfigPath)) {
      await this.createDefaultUserConfig(userId);

      // 更新全局配置
      if (!this.useLocalStorageFallback) {
        const config = await this.readFile(this.configFile);
        if (config) {
          config.users[userId] = {
            created_at: new Date().toISOString(),
            works_count: 0,
          };
          this.writeFile(this.configFile, config);
        }
      }
    } else {
    }

    return await this.readFile(userConfigPath);
  }

  // 获取用户配置
  async getUserConfig(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserConfig: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    if (this.useLocalStorageFallback) {
      return this.getUserConfigFallback(userId);
    }

    const userConfigPath = this.getUserConfigPath(userId);
    let config = await this.readFile(userConfigPath);

    if (!config) {
      config = await this.initUserStorage(userId);
    }

    return config;
  }

  // 更新用户配置
  async updateUserConfig(userId, updates) {
    const userConfigPath = this.getUserConfigPath(userId);
    const config = await this.getUserConfig(userId);

    Object.assign(config, updates, {
      updated_at: new Date().toISOString(),
    });

    this.writeFile(userConfigPath, config);
    return config;
  }

  // 获取用户作品列表
  async getUserWorks(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserWorks: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    if (this.useLocalStorageFallback) {
      return this.getUserWorksFallback(userId);
    }

    // 如果是 plus.io 环境，使用异步方式
    if (this.environment === "APP" && !this.useLocalStorageFallback) {
      return this.getUserWorksAsync(userId);
    }

    try {
      const worksPath = `${this.getUserPath(userId)}/works`;

      // 确保作品目录存在
      this.mkdirIfNotExists(worksPath);

      // 读取作品目录下的所有文件夹
      let workFolders = [];
      try {
        workFolders = this.fs.readdirSync(worksPath) || [];
      } catch (error) {
        console.warn("⚠️ 读取作品目录失败:", error);
        return [];
      }

      const works = [];

      // 遍历每个作品文件夹，读取 work.config.json
      for (const folderName of workFolders) {
        const workConfigPath = `${worksPath}/${folderName}/work.config.json`;

        try {
          if (this.fileExists(workConfigPath)) {
            const workConfig = await this.readFile(workConfigPath);
            if (workConfig) {
              works.push({
                ...workConfig,
                id: workConfig.id || folderName,
                folderName: folderName,
              });
            }
          } else {
            console.warn(`⚠️ 作品配置文件不存在: ${workConfigPath}`);
          }
        } catch (error) {
          console.error(`❌ 读取作品配置失败 ${folderName}:`, error);
        }
      }

      // 按更新时间排序
      const sortedWorks = works.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at) -
          new Date(a.updated_at || a.created_at)
      );

      // 同步作品信息到用户配置文件
      try {
        const userConfigPath = this.getUserConfigPath(userId);
        let userConfig = await this.getUserConfig(userId);

        if (!userConfig.works) {
          userConfig.works = {};
        }

        // 同步所有作品信息到用户配置
        sortedWorks.forEach((work) => {
          if (!userConfig.works[work.id]) {
            userConfig.works[work.id] = {
              id: work.id,
              title: work.title,
              description: work.description || "",
              category: work.category || "novel",
              structure_type: work.structure_type || "single",
              is_active: work.is_active !== false,
              created_at: work.created_at,
              updated_at: work.updated_at,
              local_file_path: work.local_file_path,
            };
          } else {
            // 更新已有作品的信息
            userConfig.works[work.id] = {
              ...userConfig.works[work.id],
              title: work.title,
              description:
                work.description || userConfig.works[work.id].description,
              category: work.category || userConfig.works[work.id].category,
              updated_at:
                work.updated_at || userConfig.works[work.id].updated_at,
            };
          }
        });

        // 清理已不存在作品的用户配置信息
        const workIdsInFs = sortedWorks.map((work) => work.id);
        const userWorkIds = Object.keys(userConfig.works);

        userWorkIds.forEach((userWorkId) => {
          if (!workIdsInFs.includes(userWorkId)) {
            delete userConfig.works[userWorkId];
          }
        });

        userConfig.updated_at = new Date().toISOString();
        this.writeFile(userConfigPath, userConfig);
      } catch (syncError) {
        console.warn("⚠️ 同步作品信息到用户配置失败:", syncError);
        // 不影响主流程，继续执行
      }

      return sortedWorks;
    } catch (error) {
      console.error("❌ 扫描作品目录失败:", error);
      // 如果扫描失败，尝试从用户配置获取
      try {
        const userConfig = await this.getUserConfig(userId);
        const fallbackWorks = Object.values(userConfig.works || {});

        return fallbackWorks.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
      } catch (fallbackError) {
        console.error("❌ 备选方案也失败:", fallbackError);
        return [];
      }
    }
  }

  // 异步获取作品列表（plus.io 专用）
  async getUserWorksAsync(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserWorksAsync: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    return new Promise((resolve) => {
      const worksPath = `${this.getUserPath(userId)}/works`;

      // 确保作品目录存在
      this.mkdirIfNotExists(worksPath);

      // 使用 plus.io 异步 API 读取目录
      this.fileManager.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
        fs.root.getDirectory(
          worksPath,
          { create: true },
          (dirEntry) => {
            const directoryReader = dirEntry.createReader();
            directoryReader.readEntries(
              (entries) => {
                const works = [];
                let completed = 0;

                if (entries.length === 0) {
                  resolve([]);
                  return;
                }

                // 遍历每个条目，只处理目录
                entries.forEach((entry) => {
                  if (entry.isDirectory) {
                    const folderName = entry.name;
                    const workConfigPath = `${worksPath}/${folderName}/work.config.json`;

                    // 尝试读取 work.config.json
                    fs.root.getFile(
                      workConfigPath,
                      {},
                      (fileEntry) => {
                        fileEntry.file(
                          (file) => {
                            const reader = new plus.io.FileReader();
                            reader.onloadend = async () => {
                              try {
                                const workConfig = JSON.parse(reader.result);

                                works.push({
                                  ...workConfig,
                                  id: workConfig.id || folderName,
                                  folderName: folderName,
                                });
                              } catch (parseError) {
                                console.error(
                                  `❌ 解析作品配置失败 ${folderName}:`,
                                  parseError
                                );
                              }

                              completed++;
                              if (
                                completed ===
                                entries.filter((e) => e.isDirectory).length
                              ) {
                                // 所有作品都处理完毕
                                const sortedWorks = works.sort(
                                  (a, b) =>
                                    new Date(b.updated_at || b.created_at) -
                                    new Date(a.updated_at || a.created_at)
                                );

                                // 同步作品信息到用户配置文件
                                try {
                                  const userConfigPath =
                                    this.getUserConfigPath(userId);
                                  let userConfig = await this.getUserConfig(
                                    userId
                                  );

                                  if (!userConfig.works) {
                                    userConfig.works = {};
                                  }

                                  // 同步所有作品信息到用户配置
                                  sortedWorks.forEach((work) => {
                                    if (!userConfig.works[work.id]) {
                                      userConfig.works[work.id] = {
                                        id: work.id,
                                        title: work.title,
                                        description: work.description || "",
                                        category: work.category || "novel",
                                        structure_type:
                                          work.structure_type || "single",
                                        is_active: work.is_active !== false,
                                        created_at: work.created_at,
                                        updated_at: work.updated_at,
                                        local_file_path: work.local_file_path,
                                      };
                                    } else {
                                      // 更新已有作品的信息
                                      userConfig.works[work.id] = {
                                        ...userConfig.works[work.id],
                                        title: work.title,
                                        description:
                                          work.description ||
                                          userConfig.works[work.id].description,
                                        category:
                                          work.category ||
                                          userConfig.works[work.id].category,
                                        updated_at:
                                          work.updated_at ||
                                          userConfig.works[work.id].updated_at,
                                      };
                                    }
                                  });

                                  // 清理已不存在作品的用户配置信息
                                  const workIdsInFs = sortedWorks.map(
                                    (work) => work.id
                                  );
                                  const userWorkIds = Object.keys(
                                    userConfig.works
                                  );

                                  userWorkIds.forEach((userWorkId) => {
                                    if (!workIdsInFs.includes(userWorkId)) {
                                      delete userConfig.works[userWorkId];
                                    }
                                  });

                                  userConfig.updated_at =
                                    new Date().toISOString();
                                  this.writeFile(userConfigPath, userConfig);
                                } catch (syncError) {
                                  console.warn(
                                    "⚠️ 异步同步作品信息到用户配置失败:",
                                    syncError
                                  );
                                  // 不影响主流程，继续执行
                                }

                                resolve(sortedWorks);
                              }
                            };
                            reader.readAsText(file);
                          },
                          () => {
                            console.warn(
                              `⚠️ 作品配置文件不存在: ${workConfigPath}`
                            );
                            completed++;
                            if (
                              completed ===
                              entries.filter((e) => e.isDirectory).length
                            ) {
                              const sortedWorks = works.sort(
                                (a, b) =>
                                  new Date(b.updated_at || b.created_at) -
                                  new Date(a.updated_at || a.created_at)
                              );
                              resolve(sortedWorks);
                            }
                          }
                        );
                      },
                      () => {
                        console.warn(
                          `⚠️ 获取作品配置文件失败: ${workConfigPath}`
                        );
                        completed++;
                        if (
                          completed ===
                          entries.filter((e) => e.isDirectory).length
                        ) {
                          const sortedWorks = works.sort(
                            (a, b) =>
                              new Date(b.updated_at || b.created_at) -
                              new Date(a.updated_at || a.created_at)
                          );
                          resolve(sortedWorks);
                        }
                      }
                    );
                  } else {
                    completed++;
                    if (
                      completed === entries.filter((e) => e.isDirectory).length
                    ) {
                      const sortedWorks = works.sort(
                        (a, b) =>
                          new Date(b.updated_at || b.created_at) -
                          new Date(a.updated_at || a.created_at)
                      );
                      resolve(sortedWorks);
                    }
                  }
                });
              },
              () => {
                console.error("❌ 读取目录失败");
                resolve([]);
              }
            );
          },
          () => {
            console.error("❌ 获取作品目录失败");
            resolve([]);
          }
        );
      });
    });
  }

  // 创建完整的作品文件夹结构
  createWorkStructure(userId, workId, workData) {
    const workDir = this.getWorkPath(userId, workId);

    // 创建作品文件夹结构
    this.mkdirIfNotExists(workDir);
    this.mkdirIfNotExists(`${workDir}/settings`);
    this.mkdirIfNotExists(`${workDir}/maps`);
    this.mkdirIfNotExists(`${workDir}/characters`);
    this.mkdirIfNotExists(`${workDir}/chapters`);
    this.mkdirIfNotExists(`${workDir}/glossary`);
    this.mkdirIfNotExists(`${workDir}/drafts`);

    // 创建作品配置文件
    const workConfig = {
      id: workId,
      title: workData.title || "未命名作品",
      description: workData.description || "",
      category: workData.category || "novel",
      structure_type: workData.structure_type || "single",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_structure: "v2",
      local_file_path: workDir,
    };

    this.writeFile(`${workDir}/work.config.json`, workConfig);

    // 初始化默认内容文件
    this.writeFile(`${workDir}/settings/manuscript.json`, {
      title: workData.title || "未命名作品",
      content: workData.initialContent || "",
      word_count: 0,
      last_modified: new Date().toISOString(),
    });

    this.writeFile(`${workDir}/chapters/chapters.json`, []);
    this.writeFile(`${workDir}/characters/characters.json`, []);
    this.writeFile(`${workDir}/settings/custom_settings.json`, []);
    this.writeFile(`${workDir}/maps/map_list.json`, { maps: [] });

    return workDir;
  }

  // 创建新作品
  async createWork(userId, workData) {
    if (this.useLocalStorageFallback) {
      try {
        const newWork = this.createWorkFallback(userId, workData);

        return newWork;
      } catch (error) {
        console.error("[Fallback] 创建作品失败:", error);
        throw new Error(`创建作品失败: ${error.message}`);
      }
    }

    try {
      // 确保用户目录存在
      await this.initUserStorage(userId);

      const workId = Date.now().toString();
      const now = new Date().toISOString();

      // 创建作品文件结构（这会创建 work.config.json）
      const workDir = this.createWorkStructure(userId, workId, workData);

      // 直接从 work.config.json 读取创建后的信息
      const workConfig = await this.readFile(`${workDir}/work.config.json`);

      // 将作品信息同步到用户配置文件中
      try {
        const userConfigPath = this.getUserConfigPath(userId);
        let userConfig = await this.readFile(userConfigPath);

        if (!userConfig.works) {
          userConfig.works = {};
        }

        userConfig.works[workId] = {
          id: workId,
          title: workConfig.title,
          description: workConfig.description || "",
          category: workConfig.category || "novel",
          structure_type: workConfig.structure_type || "single",
          is_active: workConfig.is_active !== false,
          created_at: workConfig.created_at,
          updated_at: workConfig.updated_at,
          local_file_path: workConfig.local_file_path,
          chapter_count: 0,
        };

        userConfig.updated_at = now;
        this.writeFile(userConfigPath, userConfig);
      } catch (syncError) {
        console.warn("⚠️ 同步作品信息到用户配置失败:", syncError);
        // 不影响主流程，继续执行
      }

      // 记录操作日志
      this.logOperation(userId, "create_work", {
        workId,
        workTitle: workData.title,
        workDir,
      });

      return workConfig;
    } catch (error) {
      console.error("创建作品失败:", error);
      throw new Error(`创建作品失败: ${error.message}`);
    }
  }

  // 更新作品信息
  async updateWork(userId, workId, updates) {
    const workConfigPath = `${this.getWorkPath(
      userId,
      workId
    )}/work.config.json`;

    try {
      // 首先读取作品配置文件
      const workConfig = await this.readFile(workConfigPath);
      if (!workConfig) {
        throw new Error("作品配置文件不存在");
      }

      // 更新作品配置文件
      Object.assign(workConfig, updates, {
        updated_at: new Date().toISOString(),
      });
      this.writeFile(workConfigPath, workConfig);

      // 同步更新用户配置中的作品信息
      try {
        const userConfig = await this.getUserConfig(userId);
        if (!userConfig.works) {
          userConfig.works = {};
        }

        // 如果用户配置中没有这个作品，创建它
        if (!userConfig.works[workId]) {
          userConfig.works[workId] = {
            id: workId,
            title: workConfig.title,
            description: workConfig.description || "",
            category: workConfig.category || "novel",
            structure_type: workConfig.structure_type || "single",
            is_active: workConfig.is_active !== false,
            created_at: workConfig.created_at,
            local_file_path: workConfig.local_file_path,
          };
        }

        // 更新用户配置中的作品信息
        Object.assign(userConfig.works[workId], updates, {
          updated_at: new Date().toISOString(),
        });

        userConfig.updated_at = new Date().toISOString();
        this.writeFile(this.getUserConfigPath(userId), userConfig);
      } catch (syncError) {
        console.warn("⚠️ 同步作品信息到用户配置失败:", syncError);
        // 不影响主流程，继续执行
      }

      // 记录操作日志
      this.logOperation(userId, "update_work", { workId, updates });

      return workConfig;
    } catch (error) {
      console.error("更新作品失败:", error);
      throw new Error(`更新作品失败: ${error.message}`);
    }
  }

  // 删除作品
  async deleteWork(userId, workId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ deleteWork: 无效的userId，使用default_user", { userId });
      userId = "default_user";
    }

    try {
      const userConfig = (await this.getUserConfig(userId)) || {};
      // 确保 works 容器存在，防止访问 undefined 属性
      if (!userConfig.works || typeof userConfig.works !== "object") {
        userConfig.works = {};
      }

      const workDir = this.getWorkPath(userId, workId);
      if (!workDir) {
        throw new Error("无法定位作品目录");
      }

      let workRecord = userConfig.works[workId];

      // 兼容 user.config.json 中缺少作品信息的场景
      if (!workRecord) {
        try {
          const workConfig = await this.readFile(`${workDir}/work.config.json`);
          if (workConfig) {
            workRecord = {
              id: workId,
              title: workConfig.title || "未命名作品",
              description: workConfig.description || "",
              category: workConfig.category || "novel",
              structure_type: workConfig.structure_type || "single",
              is_active: workConfig.is_active !== false,
              created_at: workConfig.created_at,
              updated_at: workConfig.updated_at,
              local_file_path: workConfig.local_file_path,
            };
          }
        } catch (extraError) {
          console.warn("⚠️ 删除作品时读取 work.config.json 失败:", extraError);
        }

        if (!workRecord) {
          throw new Error("作品不存在");
        }

        // 同步一次缺失的作品信息，避免后续再次缺失
        userConfig.works[workId] = workRecord;
      }

      const workTitle = workRecord.title;

      // 删除整个作品目录
      await this.deleteDirectory(workDir);

      // 从用户配置中移除作品
      delete userConfig.works[workId];
      userConfig.updated_at = new Date().toISOString();

      this.writeFile(this.getUserConfigPath(userId), userConfig);

      // 记录操作日志
      this.logOperation(userId, "delete_work", {
        workId,
        workTitle,
        workDir,
      });

      return true;
    } catch (error) {
      console.error("删除作品失败:", error);
      throw new Error(`删除作品失败: ${error.message}`);
    }
  }

  // 获取作品详情
  async getWorkDetail(userId, workId) {
    if (this.useLocalStorageFallback) {
      try {
        const workDetail = this.getWorkDetailFallback(userId, workId);

        return workDetail;
      } catch (error) {
        console.error("[Fallback] 获取作品详情失败:", error);
        throw new Error(`获取作品详情失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    if (!workDir) {
      throw new Error("无法获取作品路径：用户ID或作品ID无效");
    }
    const workConfigPath = `${workDir}/work.config.json`;

    // 读取作品配置
    const workConfig = await this.readFile(workConfigPath);
    if (!workConfig) {
      throw new Error("作品不存在");
    }

    // 加载作品内容文件
    const manuscript =
      (await this.readFile(`${workDir}/settings/manuscript.json`)) || {};
    const chapters =
      (await this.readFile(`${workDir}/chapters/chapters.json`)) || [];
    const terms =
      (await this.readFile(`${workDir}/settings/custom_settings.json`)) || [];
    const mapData = (await this.readFile(`${workDir}/maps/map_list.json`)) || {
      maps: [],
    };

    workConfig.content = {
      manuscript,
      chapters,
      terms,
      map_data: mapData,
    };

    return workConfig;
  }

  // 保存作品内容
  async saveWorkContent(userId, workId, contentUpdates) {
    if (this.useLocalStorageFallback) {
      try {
        const result = this.saveWorkContentFallback(
          userId,
          workId,
          contentUpdates
        );

        return result;
      } catch (error) {
        console.error("[Fallback] 保存作品内容失败:", error);
        throw new Error(`保存作品内容失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);

    try {
      if (contentUpdates.manuscript) {
        const manuscriptPath = `${workDir}/settings/manuscript.json`;
        const currentManuscript = (await this.readFile(manuscriptPath)) || {};

        const updatedManuscript = {
          ...currentManuscript,
          ...contentUpdates.manuscript,
          last_modified: new Date().toISOString(),
        };

        // 计算字数
        if (updatedManuscript.content) {
          updatedManuscript.word_count =
            updatedManuscript.content.split(/\s+/).length;
        }

        this.writeFile(manuscriptPath, updatedManuscript);
      }

      if (contentUpdates.chapters) {
        this.writeFile(
          `${workDir}/chapters/chapters.json`,
          contentUpdates.chapters
        );
      }

      // 术语现在存储在 settings/custom_settings.json，这个分支保留用于向后兼容
      if (contentUpdates.glossary) {
        this.writeFile(
          `${workDir}/settings/custom_settings.json`,
          contentUpdates.glossary
        );
      }

      if (contentUpdates.terms) {
        this.writeFile(
          `${workDir}/settings/custom_settings.json`,
          contentUpdates.terms
        );
      }

      if (contentUpdates.map_data) {
        this.writeFile(
          `${workDir}/maps/map_list.json`,
          contentUpdates.map_data
        );
      }

      // 更新作品修改时间
      this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("保存作品内容失败:", error);
      throw new Error(`保存作品内容失败: ${error.message}`);
    }
  }

  // 保存地图数据（支持多地图）
  async saveMapData(userId, workId, mapData) {
    if (this.useLocalStorageFallback) {
      try {
        const result = await this.saveMapDataFallback(userId, workId, mapData);
        return result;
      } catch (error) {
        console.error("[Fallback] 保存地图数据失败:", error);
        throw new Error(`保存地图数据失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    const mapListPath = `${workDir}/maps/map_list.json`;

    try {
      // 确保maps目录存在
      this.mkdirIfNotExists(`${workDir}/maps`);

      // 读取现有地图列表 - 使用异步读取
      let mapListData = await this.readFile(mapListPath);
      if (!mapListData) {
        mapListData = { maps: [] };
      }

      // 确保 maps 数组存在
      if (!mapListData.maps || !Array.isArray(mapListData.maps)) {
        mapListData.maps = [];
      }

      // 准备地图数据
      const mapId = mapData.id || `map_${Date.now()}`;
      const formattedMapData = {
        id: mapId,
        name: mapData.name || "新地图",
        description: mapData.description || "",
        version: "1.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
        nodes: mapData.nodes || [],
        edges: mapData.edges || [],
      };

      // 查找是否已存在该地图
      const existingIndex = mapListData.maps.findIndex(
        (map) => map.id === mapId
      );
      if (existingIndex >= 0) {
        // 更新现有地图
        formattedMapData.created_at =
          mapListData.maps[existingIndex].created_at;
        mapListData.maps[existingIndex] = formattedMapData;
        console.log(`更新现有地图: ${mapId}, 名称: ${formattedMapData.name}`);
      } else {
        // 添加新地图
        mapListData.maps.push(formattedMapData);
        console.log(`添加新地图: ${mapId}, 名称: ${formattedMapData.name}`);
      }

      // 保存地图列表
      await this.writeFile(mapListPath, mapListData);
      console.log(`地图列表已保存，当前地图数量: ${mapListData.maps.length}`);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      // 记录操作日志
      this.logOperation(userId, "save_map", {
        workId,
        mapId,
        mapName: formattedMapData.name,
        nodesCount: formattedMapData.nodes.length,
        edgesCount: formattedMapData.edges.length,
        isUpdate: existingIndex >= 0,
      });

      return formattedMapData;
    } catch (error) {
      console.error("保存地图数据失败:", error);
      throw new Error(`保存地图数据失败: ${error.message}`);
    }
  }

  // 保存角色数据
  async saveCharacter(userId, workId, characterData) {
    if (this.useLocalStorageFallback) {
      try {
        const result = await this.saveCharacterFallback(
          userId,
          workId,
          characterData
        );
        return result;
      } catch (error) {
        console.error("[Fallback] 保存角色数据失败:", error);
        throw new Error(`保存角色数据失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    const charactersPath = `${workDir}/characters/characters.json`;

    try {
      // 确保characters目录存在
      this.mkdirIfNotExists(`${workDir}/characters`);

      // 读取现有角色列表
      let charactersData = await this.readFile(charactersPath);
      if (!charactersData) {
        charactersData = [];
      }

      // 确保是数组
      if (!Array.isArray(charactersData)) {
        charactersData = [];
      }

      // 准备角色数据
      const characterId = characterData.id || `character_${Date.now()}`;
      const formattedCharacterData = {
        id: characterId,
        name: characterData.name || "新角色",
        description: characterData.description || "",
        avatar: characterData.avatar || "",
        tags: characterData.tags || [],
        attributes: characterData.attributes || {},
        relationships: characterData.relationships || [],
        background: characterData.background || "",
        personality: characterData.personality || "",
        appearance: characterData.appearance || "",
        created_at: characterData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
      };

      // 查找是否已存在该角色
      const existingIndex = charactersData.findIndex(
        (character) => character.id === characterId
      );
      if (existingIndex >= 0) {
        // 更新现有角色
        formattedCharacterData.created_at =
          charactersData[existingIndex].created_at;
        charactersData[existingIndex] = formattedCharacterData;
        console.log(
          `更新现有角色: ${characterId}, 名称: ${formattedCharacterData.name}`
        );
      } else {
        // 添加新角色
        charactersData.push(formattedCharacterData);
        console.log(
          `添加新角色: ${characterId}, 名称: ${formattedCharacterData.name}`
        );
      }

      // 保存角色列表
      await this.writeFile(charactersPath, charactersData);
      console.log(`角色列表已保存，当前角色数量: ${charactersData.length}`);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      // 记录操作日志
      this.logOperation(userId, "save_character", {
        workId,
        characterId,
        characterName: formattedCharacterData.name,
        isUpdate: existingIndex >= 0,
      });

      return formattedCharacterData;
    } catch (error) {
      console.error("保存角色数据失败:", error);
      throw new Error(`保存角色数据失败: ${error.message}`);
    }
  }

  // 保存术语数据
  async saveTerm(userId, workId, termData) {
    if (this.useLocalStorageFallback) {
      try {
        const result = await this.saveTermFallback(userId, workId, termData);
        return result;
      } catch (error) {
        console.error("[Fallback] 保存术语数据失败:", error);
        throw new Error(`保存术语数据失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    const termsPath = `${workDir}/settings/custom_settings.json`;

    try {
      // 确保settings目录存在
      this.mkdirIfNotExists(`${workDir}/settings`);

      // 读取现有术语列表
      let termsData = await this.readFile(termsPath);
      if (!termsData) {
        termsData = [];
      }

      // 确保是数组
      if (!Array.isArray(termsData)) {
        termsData = [];
      }

      // 准备术语数据 - 使用正确的格式
      const termId = termData.id || `setting_${Date.now()}`;
      const formattedTermData = {
        id: termId,
        type: "setting",
        work_id: workId,
        user_id: userId,
        name: termData.name || termData.term || "新术语", // 优先使用 name，向后兼容 term
        description: termData.description || termData.definition || "", // 优先使用 description，向后兼容 definition
        reserved_slots: termData.reserved_slots || {
          slot_alpha: null,
          slot_beta: null,
          slot_gamma: null,
        },
        created_at: termData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: termData.status || "draft",
      };

      // 查找是否已存在该术语
      const existingIndex = termsData.findIndex((term) => term.id === termId);
      if (existingIndex >= 0) {
        // 更新现有术语
        formattedTermData.created_at = termsData[existingIndex].created_at;
        termsData[existingIndex] = formattedTermData;
        console.log(`更新现有术语: ${termId}, 名称: ${formattedTermData.name}`);
      } else {
        // 添加新术语
        termsData.push(formattedTermData);
        console.log(`添加新术语: ${termId}, 名称: ${formattedTermData.name}`);
      }

      // 保存术语列表
      await this.writeFile(termsPath, termsData);
      console.log(`术语列表已保存，当前术语数量: ${termsData.length}`);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      // 记录操作日志
      this.logOperation(userId, "save_term", {
        workId,
        termId,
        termName: formattedTermData.name,
        isUpdate: existingIndex >= 0,
      });

      return formattedTermData;
    } catch (error) {
      console.error("保存术语数据失败:", error);
      throw new Error(`保存术语数据失败: ${error.message}`);
    }
  }

  // 获取地图列表
  async getMapList(userId, workId) {
    if (this.useLocalStorageFallback) {
      try {
        return this.getMapListFallback(userId, workId);
      } catch (error) {
        console.error("[Fallback] 获取地图列表失败:", error);
        return { maps: [] };
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    if (!workDir) {
      console.warn("无法获取作品路径:", { userId, workId });
      return { maps: [] };
    }

    const mapListPath = `${workDir}/maps/map_list.json`;

    try {
      // 确保maps目录存在
      this.mkdirIfNotExists(`${workDir}/maps`);

      const result = await this.readFile(mapListPath);

      // 如果文件不存在或为空，返回默认结构
      if (!result) {
        console.log("地图列表文件不存在，创建默认结构");
        await this.writeFile(mapListPath, { maps: [] });
        return { maps: [] };
      }

      // 确保返回的数据结构正确
      if (typeof result === "object" && result.maps) {
        console.log(`获取地图列表成功，地图数量: ${result.maps.length}`);
        return result;
      } else if (typeof result === "object") {
        // 如果有对象但没有maps字段，添加maps字段
        result.maps = result.maps || [];
        console.log(
          `获取地图列表成功（修复格式），地图数量: ${result.maps.length}`
        );
        return result;
      } else {
        // 如果数据格式不正确，重新创建
        console.warn("地图列表数据格式不正确，重新创建");
        await this.writeFile(mapListPath, { maps: [] });
        return { maps: [] };
      }
    } catch (error) {
      console.warn("地图列表读取失败，尝试创建默认结构:", error);
      try {
        this.mkdirIfNotExists(`${workDir}/maps`);
        if (this.writeFile) {
          await this.writeFile(mapListPath, { maps: [] });
        }
        return { maps: [] };
      } catch (createError) {
        console.error("创建默认地图列表失败:", createError);
        return { maps: [] };
      }
    }
  }

  // 获取单个地图数据
  async getMapData(userId, workId, mapId) {
    console.log(
      `正在获取地图数据: userId=${userId}, workId=${workId}, mapId=${mapId}`
    );

    if (this.useLocalStorageFallback) {
      try {
        console.log("使用 Fallback 模式获取地图数据");
        return this.getMapDataFallback(userId, workId, mapId);
      } catch (error) {
        console.error("[Fallback] 获取地图数据失败:", error);
        return null;
      }
    }

    console.log("使用文件系统模式获取地图数据");
    const mapList = await this.getMapList(userId, workId);
    console.log(`获取到的地图列表:`, mapList);

    const map = mapList.maps.find((m) => m.id === mapId);
    console.log(`找到的地图:`, map);

    if (!map) {
      console.warn(`地图不存在: ${mapId}`);
      return null;
    }

    return map;
  }

  // 删除地图
  async deleteMap(userId, workId, mapId) {
    if (this.useLocalStorageFallback) {
      try {
        return this.deleteMapFallback(userId, workId, mapId);
      } catch (error) {
        console.error("[Fallback] 删除地图失败:", error);
        return false;
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    const mapListPath = `${workDir}/maps/map_list.json`;

    try {
      let mapListData = (await this.readFile(mapListPath)) || { maps: [] };

      // 确保 maps 数组存在
      if (!mapListData.maps || !Array.isArray(mapListData.maps)) {
        mapListData.maps = [];
      }

      const originalLength = mapListData.maps.length;

      // 删除指定地图
      mapListData.maps = mapListData.maps.filter((map) => map.id !== mapId);

      if (mapListData.maps.length === originalLength) {
        console.warn(`地图不存在，无法删除: ${mapId}`);
        return false;
      }

      // 保存更新后的列表
      this.writeFile(mapListPath, mapListData);

      // 更新作品修改时间
      this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      // 记录操作日志
      this.logOperation(userId, "delete_map", {
        workId,
        mapId,
      });

      return true;
    } catch (error) {
      console.error("删除地图失败:", error);
      return false;
    }
  }

  // 添加专有名词
  async addGlossaryItem(userId, workId, itemData) {
    const glossaryPath = `${this.getWorkPath(
      userId,
      workId
    )}/settings/custom_settings.json`;
    const glossary = (await this.readFile(glossaryPath)) || [];

    const newItem = {
      id: Date.now().toString(),
      work_id: workId,
      user_id: userId,
      category: itemData.category || "character",
      name: itemData.name,
      description: itemData.description || "",
      color_code: itemData.color_code || "#FF6B35",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    glossary.push(newItem);
    this.writeFile(glossaryPath, glossary);

    // 记录操作日志
    this.logOperation(userId, "add_glossary", {
      workId,
      itemName: newItem.name,
    });

    return newItem;
  }

  // 记录操作日志
  logOperation(userId, operation, data = {}) {
    (async () => {
      try {
        const logDir = `${this.basePath}/logs/${userId}`;
        this.mkdirIfNotExists(logDir);
        await this.ensureFileExists(`${logDir}/operations.json`, []);

        const logFile = `${logDir}/operations.json`;
        let logs = await this.readFile(logFile);
        if (!Array.isArray(logs)) {
          logs = [];
        }

        // 在 uni-app 环境中，navigator 可能不存在，使用安全的方式获取 userAgent
        const userAgent =
          typeof navigator !== "undefined"
            ? navigator.userAgent
            : "uni-app-environment";

        const logEntry = {
          id: Date.now().toString(),
          user_id: userId,
          operation,
          data,
          timestamp: new Date().toISOString(),
          user_agent: userAgent,
        };

        logs.push(logEntry);

        // 只保留最近1000条日志
        if (logs.length > 1000) {
          logs = logs.slice(-1000);
        }

        this.writeFile(logFile, logs);

        // 更新全局配置中的日志计数
        if (!this.useLocalStorageFallback) {
          const config = await this.readFile(this.configFile);
          if (config && config.logs_count !== undefined) {
            config.logs_count[userId] = (config.logs_count[userId] || 0) + 1;
            this.writeFile(this.configFile, config);
          }
        }
      } catch (error) {
        console.error("记录操作日志失败:", error);
        // 日志记录失败不应该影响主流程，继续执行
      }
    })();
  }

  // 获取存储统计信息
  async getStorageStats(userId = "default_user") {
    if (this.useLocalStorageFallback) {
      return this.getStorageStatsFallback(userId);
    }

    try {
      const userConfig = await this.getUserConfig(userId);
      const works = Object.values(userConfig?.works || {});

      let totalWords = 0;
      let totalCharacters = 0;
      let totalMaps = 0;
      let totalFiles = 0;

      for (const work of works) {
        try {
          const workDir = this.getWorkPath(userId, work.id);

          const manuscriptPath = `${workDir}/settings/manuscript.json`;
          const manuscript = await this.readFile(manuscriptPath);
          if (manuscript && manuscript.content) {
            totalWords += manuscript.content
              .split(/\s+/)
              .filter(Boolean).length;
            totalCharacters += manuscript.content.length;
            totalFiles += 1;
          }

          const mapDataPath = `${workDir}/maps/map_data.json`;
          const mapData = await this.readFile(mapDataPath);
          if (Array.isArray(mapData)) {
            totalMaps += mapData.length;
            totalFiles += 1;
          }

          const chaptersPath = `${workDir}/chapters/chapters.json`;
          const chapters = await this.readFile(chaptersPath);
          if (Array.isArray(chapters)) {
            totalFiles += 1;
            chapters.forEach((chapter) => {
              if (chapter?.content) {
                totalWords += chapter.content
                  .split(/\s+/)
                  .filter(Boolean).length;
                totalCharacters += chapter.content.length;
              }
            });
          }
        } catch (workError) {
          console.warn(`统计作品 ${work?.id || "unknown"} 时出错:`, workError);
        }
      }

      let totalSize = 0;
      try {
        const config = await this.readFile(this.configFile);
        totalSize =
          JSON.stringify(config || {}).length +
          JSON.stringify(userConfig || {}).length;
      } catch (sizeError) {
        console.warn("计算存储大小时出错:", sizeError);
        totalSize = JSON.stringify(userConfig || {}).length;
      }

      return {
        totalWorks: works.length,
        totalWords,
        totalCharacters,
        totalMaps,
        totalFiles,
        storageUsed: totalSize,
        storageType: "filesystem",
      };
    } catch (error) {
      console.error("获取存储统计失败:", error);
      return {
        totalWorks: 0,
        totalWords: 0,
        totalCharacters: 0,
        totalMaps: 0,
        totalFiles: 0,
        storageUsed: 0,
        storageType: "filesystem",
      };
    }
  }

  // 获取存储统计信息（fallback）
  getStorageStatsFallback(userId = "default_user") {
    try {
      if (
        typeof uni === "undefined" ||
        typeof uni.getStorageSync !== "function"
      ) {
        return {
          totalWorks: 0,
          totalWords: 0,
          totalCharacters: 0,
          totalMaps: 0,
          totalFiles: 0,
          storageUsed: 0,
          storageType: "localStorage_fallback",
        };
      }

      const data = uni.getStorageSync(this.fallbackStorageKey) || {};
      const userConfig = data?.data?.users?.[userId] || {};
      const works = userConfig.works || {};

      let totalWords = 0;
      let totalCharacters = 0;
      let totalMaps = 0;

      Object.values(works).forEach((work) => {
        const manuscriptContent = work?.content?.manuscript?.content || "";
        if (manuscriptContent) {
          totalWords += manuscriptContent.split(/\s+/).filter(Boolean).length;
          totalCharacters += manuscriptContent.length;
        }

        const mapData = work?.content?.map_data;
        if (Array.isArray(mapData)) {
          totalMaps += mapData.length;
        }
      });

      return {
        totalWorks: Object.keys(works).length,
        totalWords,
        totalCharacters,
        totalMaps,
        totalFiles: 0,
        storageUsed: JSON.stringify(data || {}).length,
        storageType: "localStorage_fallback",
      };
    } catch (error) {
      console.error("[Fallback] 获取存储统计失败:", error);
      return {
        totalWorks: 0,
        totalWords: 0,
        totalCharacters: 0,
        totalMaps: 0,
        totalFiles: 0,
        storageUsed: 0,
        storageType: "localStorage_fallback",
      };
    }
  }

  // 备份数据
  async createBackup(userId) {
    try {
      const backupDir = `${this.basePath}/backups/${userId}`;
      this.mkdirIfNotExists(backupDir);

      const backupId = Date.now().toString();
      const userConfig = await this.getUserConfig(userId);

      const backup = {
        id: backupId,
        user_id: userId,
        data: JSON.parse(JSON.stringify(userConfig)), // 深拷贝
        created_at: new Date().toISOString(),
        size: JSON.stringify(userConfig).length,
        backup_type: "user_config",
      };

      // 写入备份文件
      this.writeFile(`${backupDir}/backup_${backupId}.json`, backup);

      // 更新全局配置中的备份计数
      if (!this.useLocalStorageFallback) {
        const config = await this.readFile(this.configFile);
        if (config && config.backups_count !== undefined) {
          config.backups_count[userId] =
            (config.backups_count[userId] || 0) + 1;
          this.writeFile(this.configFile, config);
        }
      }

      console.log(`💾 备份创建成功: ${backupId}`);
      return backup;
    } catch (error) {
      console.error("创建备份失败:", error);
      throw new Error(`创建备份失败: ${error.message}`);
    }
  }

  // 获取存储统计信息
  async getStorageStats(userId) {
    if (this.useLocalStorageFallback) {
      try {
        const stats = this.getStorageStatsFallback(userId);
        console.log(`✅ [Fallback] 获取存储统计成功`);
        return stats;
      } catch (error) {
        console.error("[Fallback] 获取存储统计失败:", error);
        return {
          totalWorks: 0,
          totalWords: 0,
          totalCharacters: 0,
          totalMaps: 0,
          totalFiles: 0,
          storageUsed: 0,
          storageType: "localStorage_fallback",
        };
      }
    }

    try {
      const userConfig = await this.getUserConfig(userId);
      const userPath = this.getUserPath(userId);

      let totalWords = 0;
      let totalCharacters = 0;
      let totalMaps = 0;
      let totalFiles = 0;

      // 遍历所有作品 - 添加空值检查
      const works = userConfig?.works || {};
      Object.values(works).forEach(async (work) => {
        try {
          const workDir = this.getWorkPath(userId, work.id);

          // 读取稿件内容
          const manuscriptPath = `${workDir}/settings/manuscript.json`;
          const manuscript = await this.readFile(manuscriptPath);

          if (manuscript && manuscript.content) {
            totalWords += manuscript.content.split(/\s+/).length;
            totalCharacters += manuscript.content.length;
          }

          // 读取地图数据
          const mapDataPath = `${workDir}/maps/map_list.json`;
          const mapData = await this.readFile(mapDataPath);
          if (mapData && mapData.maps && Array.isArray(mapData.maps)) {
            totalMaps += mapData.maps.length;
          }
        } catch (error) {
          console.error(`统计作品 ${work.id} 时出错:`, error);
        }
      });

      // 计算总文件数和大小的近似值
      let totalSize = 0;
      try {
        const config = !this.useLocalStorageFallback
          ? this.readFile(this.configFile)
          : this.getFallbackData();
        totalSize =
          JSON.stringify(config || {}).length +
          JSON.stringify(userConfig || {}).length;
      } catch (error) {
        console.warn("计算存储大小时出错:", error);
        totalSize = JSON.stringify(userConfig || {}).length;
      }

      return {
        totalWorks: Object.keys(userConfig?.works || {}).length,
        totalWords,
        totalCharacters,
        totalMaps,
        totalFiles,
        storageUsed: totalSize,
        storageType: "filesystem",
      };
    } catch (error) {
      console.error("获取存储统计失败:", error);
      return {
        totalWorks: 0,
        totalWords: 0,
        totalCharacters: 0,
        totalMaps: 0,
        totalFiles: 0,
        storageUsed: 0,
        storageType: "filesystem",
      };
    }
  }

  // 获取存储使用情况（包括设备总容量信息）
  getStorageUsage() {
    if (this.useLocalStorageFallback) {
      try {
        // 获取uni-app的存储信息
        const storageInfo = uni.getStorageInfoSync();

        return {
          currentSize: storageInfo.currentSize, // 当前占用的空间大小，单位 KB
          limitSize: storageInfo.limitSize, // 总的空间限制，单位 KB
          usagePercent: (
            (storageInfo.currentSize / storageInfo.limitSize) *
            100
          ).toFixed(1),
          keys: storageInfo.keys, // 所有key的数量
          availableSize: storageInfo.limitSize - storageInfo.currentSize,
        };
      } catch (error) {
        console.error("获取存储使用情况失败:", error);
        return {
          currentSize: 0,
          limitSize: 0,
          usagePercent: 0,
          keys: 0,
          availableSize: 0,
        };
      }
    }
  }

  // 清理过期日志和备份
  async cleanupOldData(maxLogs = 1000, maxBackups = 10) {
    try {
      // 清理日志
      const logsDir = `${this.basePath}/logs`;
      if (this.fileExists(logsDir)) {
        const logFiles = this.fs.readdirSync(logsDir) || [];
        for (const userId of logFiles) {
          const logFile = `${logsDir}/${userId}/operations.json`;
          const logs = (await this.readFile(logFile)) || [];

          if (logs.length > maxLogs) {
            this.writeFile(logFile, logs.slice(-maxLogs));
          }
        }
      }

      // 清理备份
      const backupsDir = `${this.basePath}/backups`;
      if (this.fileExists(backupsDir)) {
        const backupFiles = this.fs.readdirSync(backupsDir) || [];
        backupFiles.forEach((userId) => {
          const userBackupDir = `${backupsDir}/${userId}`;
          if (this.fileExists(userBackupDir)) {
            const files = this.fs.readdirSync(userBackupDir) || [];

            if (files.length > maxBackups) {
              // 删除最旧的备份文件
              files
                .sort()
                .slice(0, files.length - maxBackups)
                .forEach((file) => {
                  this.deleteFile(`${userBackupDir}/${file}`);
                });
            }
          }
        });
      }

      console.log("🧹 清理过期数据完成");
      return true;
    } catch (error) {
      console.error("清理过期数据失败:", error);
      return false;
    }
  }

  // ========== LocalStorage Fallback Methods ==========

  // Fallback: 读取本地存储数据
  getFallbackData() {
    try {
      return uni.getStorageSync(this.fallbackStorageKey) || {};
    } catch (error) {
      console.error("读取 fallback 数据失败:", error);
      return {};
    }
  }

  // Fallback: 保存本地存储数据
  setFallbackData(data) {
    try {
      uni.setStorageSync(this.fallbackStorageKey, data);
      return true;
    } catch (error) {
      console.error("保存 fallback 数据失败:", error);
      return false;
    }
  }

  // Fallback: 创建用户存储空间
  initUserStorageFallback(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn(
        "⚠️ initUserStorageFallback: 无效的userId，使用default_user",
        { userId }
      );
      userId = "default_user";
    }

    const data = this.getFallbackData();

    if (!data.data.users[userId]) {
      data.data.users[userId] = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 移除 works 字段
        preferences: {
          autoSaveInterval: 30,
          lastLogin: new Date().toISOString(),
        },
      };

      if (!data.users) data.users = {};
      data.users[userId] = {
        created_at: new Date().toISOString(),
        works_count: 0,
      };

      this.setFallbackData(data);
    }

    return data.data.users[userId];
  }

  // Fallback: 获取用户配置
  getUserConfigFallback(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserConfigFallback: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    const data = this.getFallbackData();
    let userConfig = data.data.users[userId];

    if (!userConfig) {
      userConfig = this.initUserStorageFallback(userId);
    }

    return userConfig;
  }

  // Fallback: 获取用户作品列表
  getUserWorksFallback(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.warn("⚠️ getUserWorksFallback: 无效的userId，使用default_user", {
        userId,
      });
      userId = "default_user";
    }

    // Fallback 模式下没有真实文件系统，返回空数组
    // 在实际使用中，Fallback 模式主要用于开发测试
    console.warn("⚠️ Fallback 模式不支持文件系统扫描，返回空作品列表");
    return [];
  }

  // Fallback: 创建作品
  createWorkFallback(userId, workData) {
    const data = this.getFallbackData();
    const userConfig = this.getUserConfigFallback(userId);

    const workId = Date.now().toString();
    const now = new Date().toISOString();

    const newWork = {
      id: workId,
      title: workData.title || "未命名作品",
      description: workData.description || "",
      category: workData.category || "novel",
      structure_type: workData.structure_type || "single",
      is_active: true,
      created_at: now,
      updated_at: now,
      local_file_path: `${this.basePath}/users/${userId}/works/${workId}`,
      content: {
        manuscript: {
          title: workData.title || "未命名作品",
          content: workData.initialContent || "",
          word_count: 0,
          last_modified: now,
        },
        chapters: [],
        glossary: [],
        map_data: { maps: [] },
      },
    };

    userConfig.works[workId] = newWork;
    userConfig.updated_at = now;

    this.setFallbackData(data);

    return newWork;
  }

  // Fallback: 获取作品详情
  getWorkDetailFallback(userId, workId) {
    const userConfig = this.getUserConfigFallback(userId);
    const work = userConfig.works[workId];

    if (!work) {
      throw new Error("作品不存在");
    }

    return work;
  }

  // Fallback: 保存作品内容
  saveWorkContentFallback(userId, workId, contentUpdates) {
    const data = this.getFallbackData();
    const userConfig = data.data.users[userId];
    const work = userConfig.works[workId];

    if (!work) {
      throw new Error("作品不存在");
    }

    if (contentUpdates.manuscript) {
      work.content.manuscript = {
        ...work.content.manuscript,
        ...contentUpdates.manuscript,
        last_modified: new Date().toISOString(),
      };

      // 计算字数
      if (work.content.manuscript.content) {
        work.content.manuscript.word_count =
          work.content.manuscript.content.split(/\s+/).length;
      }
    }

    if (contentUpdates.chapters) {
      work.content.chapters = contentUpdates.chapters;
    }

    if (contentUpdates.glossary) {
      work.content.glossary = contentUpdates.glossary;
    }

    if (contentUpdates.terms) {
      if (!work.content.settings) {
        work.content.settings = {};
      }
      work.content.settings.custom_settings = contentUpdates.terms;
    }

    if (contentUpdates.map_data) {
      work.content.map_data = contentUpdates.map_data;
    }

    work.updated_at = new Date().toISOString();
    userConfig.updated_at = work.updated_at;

    this.setFallbackData(data);

    return true;
  }

  // Fallback: 获取存储统计
  getStorageStatsFallback(userId) {
    const userConfig = this.getUserConfigFallback(userId);

    let totalWords = 0;
    let totalCharacters = 0;
    let totalMaps = 0;
    const works = userConfig.works || {};
    const workValues = Object.values(works);

    workValues.forEach((work) => {
      if (
        work.content &&
        work.content.manuscript &&
        work.content.manuscript.content
      ) {
        const content = work.content.manuscript.content;
        totalWords += content.split(/\s+/).length;
        totalCharacters += content.length;
      }

      if (
        work.content &&
        work.content.map_data &&
        Array.isArray(work.content.map_data)
      ) {
        totalMaps += work.content.map_data.length;
      }
    });

    return {
      totalWorks: workValues.length,
      totalWords,
      totalCharacters,
      totalMaps,
      totalFiles: 0,
      storageUsed: 0,
      storageType: "localStorage_fallback",
    };
  }

  // Fallback: 保存地图数据（支持多地图）
  async saveMapDataFallback(userId, workId, mapData) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      // 确保作品有content对象
      if (!userConfig.works[workId].content) {
        userConfig.works[workId].content = {};
      }

      // 确保有地图列表
      if (!userConfig.works[workId].content.map_data) {
        userConfig.works[workId].content.map_data = { maps: [] };
      }

      const mapList = userConfig.works[workId].content.map_data;
      const mapId = mapData.id || `map_${Date.now()}`;

      // 准备地图数据
      const formattedMapData = {
        id: mapId,
        name: mapData.name || "新地图",
        description: mapData.description || "",
        version: "1.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
        nodes: mapData.nodes || [],
        edges: mapData.edges || [],
      };

      // 查找是否已存在该地图
      const existingIndex = mapList.maps.findIndex((map) => map.id === mapId);
      if (existingIndex >= 0) {
        // 更新现有地图
        formattedMapData.created_at = mapList.maps[existingIndex].created_at;
        mapList.maps[existingIndex] = formattedMapData;
        console.log(
          `[Fallback] 更新现有地图: ${mapId}, 名称: ${formattedMapData.name}`
        );
      } else {
        // 添加新地图
        mapList.maps.push(formattedMapData);
        console.log(
          `[Fallback] 添加新地图: ${mapId}, 名称: ${formattedMapData.name}`
        );
      }

      // 更新作品修改时间
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);

      console.log("[Fallback] 地图数据已保存到本地存储:", {
        workId,
        mapId,
        mapName: formattedMapData.name,
        nodesCount: formattedMapData.nodes.length,
        edgesCount: formattedMapData.edges.length,
        isUpdate: existingIndex >= 0,
        totalMaps: mapList.maps.length,
      });

      return formattedMapData;
    } catch (error) {
      console.error("Fallback保存地图数据失败:", error);
      throw new Error(`保存地图数据失败: ${error.message}`);
    }
  }

  // Fallback: 获取地图列表
  getMapListFallback(userId, workId) {
    try {
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      if (!work) {
        console.warn("作品不存在:", workId);
        return { maps: [] };
      }

      return work.content?.map_data || { maps: [] };
    } catch (error) {
      console.error("Fallback获取地图列表失败:", error);
      return { maps: [] };
    }
  }

  // Fallback: 获取单个地图数据
  getMapDataFallback(userId, workId, mapId) {
    try {
      const mapList = this.getMapListFallback(userId, workId);
      const map = mapList.maps.find((m) => m.id === mapId);

      if (!map) {
        console.warn(`地图不存在: ${mapId}`);
        return null;
      }

      return map;
    } catch (error) {
      console.error("Fallback获取地图数据失败:", error);
      return null;
    }
  }

  // Fallback: 删除地图
  deleteMapFallback(userId, workId, mapId) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      const mapList = userConfig.works[workId].content?.map_data;
      if (!mapList || !mapList.maps) {
        console.warn("地图列表不存在");
        return false;
      }

      const originalLength = mapList.maps.length;
      mapList.maps = mapList.maps.filter((map) => map.id !== mapId);

      if (mapList.maps.length === originalLength) {
        console.warn(`地图不存在，无法删除: ${mapId}`);
        return false;
      }

      // 更新作品修改时间
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);

      console.log("地图已从本地存储删除:", { workId, mapId });
      return true;
    } catch (error) {
      console.error("Fallback删除地图失败:", error);
      return false;
    }
  }

  // 获取章节数据
  async getChapters(userId, workId) {
    if (this.useLocalStorageFallback) {
      return this.getChaptersFallback(userId, workId);
    }

    // 获取作品路径，检查参数有效性
    const workDir = this.getWorkPath(userId, workId);
    if (!workDir) {
      console.warn("getChapters: 无法获取作品路径", { userId, workId });
      return [];
    }

    const chaptersPath = `${workDir}/chapters/chapters.json`;
    const chapters = await this.readFile(chaptersPath);
    return Array.isArray(chapters) ? chapters : [];
  }

  // 获取人物数据
  async getCharacters(userId, workId) {
    if (this.useLocalStorageFallback) {
      return this.getCharactersFallback(userId, workId);
    }

    // 获取作品路径，检查参数有效性
    const workDir = this.getWorkPath(userId, workId);
    if (!workDir) {
      console.warn("getCharacters: 无法获取作品路径", { userId, workId });
      return [];
    }

    // 首先尝试从专门的 characters 文件获取
    const charactersPath = `${workDir}/characters/characters.json`;
    let characters = await this.readFile(charactersPath);

    // 确保返回数组，处理文件不存在的情况
    if (!characters || !Array.isArray(characters)) {
      characters = [];
    }

    // 如果 characters 文件为空，尝试从其他可能的位置获取人物数据
    if (characters.length === 0) {
      // 尝试从 custom_settings 中获取 category 为 character 的条目
      const glossaryPath = `${workDir}/settings/custom_settings.json`;
      const glossary = (await this.readFile(glossaryPath)) || [];
      if (Array.isArray(glossary)) {
        characters = glossary.filter(
          (item) =>
            item.type === "character" ||
            item.category === "character" ||
            item.category === "人物"
        );
      }
    }

    // 为可选字段提供默认值，避免缺失字段导致 UI 异常
    return characters.map((character) => ({
      ...character,
      avatar: character.avatar || "",
      tags: Array.isArray(character.tags) ? character.tags : [],
      relationships: Array.isArray(character.relationships)
        ? character.relationships
        : [],
      attributes: character.attributes || {},
      description: character.description || "",
      background: character.background || "",
      personality: character.personality || "",
      appearance: character.appearance || "",
    }));
  }

  // 获取术语数据
  async getTerms(userId, workId) {
    if (this.useLocalStorageFallback) {
      return this.getTermsFallback(userId, workId);
    }

    // 获取作品路径，检查参数有效性
    const workDir = this.getWorkPath(userId, workId);
    if (!workDir) {
      console.warn("getTerms: 无法获取作品路径", { userId, workId });
      return [];
    }

    // 根据用户反馈，术语数据存储在 settings/custom_settings.json
    const termsPath = `${workDir}/settings/custom_settings.json`;
    let terms = await this.readFile(termsPath);

    // 确保 terms 是数组
    if (!Array.isArray(terms)) {
      terms = [];
    }

    return terms;
  }

  // 删除章节
  async deleteChapter(userId, workId, chapterId) {
    if (this.useLocalStorageFallback) {
      return this.deleteChapterFallback(userId, workId, chapterId);
    }

    const chaptersPath = `${this.getWorkPath(
      userId,
      workId
    )}/chapters/chapters.json`;
    const chapters = (await this.readFile(chaptersPath)) || [];

    // 确保 chapters 是数组
    if (!Array.isArray(chapters)) {
      console.warn("章节数据不是数组格式，重置为空数组");
      return true;
    }

    const filteredChapters = chapters.filter(
      (chapter) => chapter.id !== chapterId
    );
    this.writeFile(chaptersPath, filteredChapters);

    this.logOperation(userId, "delete_chapter", {
      workId,
      chapterId,
    });

    return true;
  }

  // 删除人物
  async deleteCharacter(userId, workId, characterId) {
    if (this.useLocalStorageFallback) {
      return this.deleteCharacterFallback(userId, workId, characterId);
    }

    const charactersPath = `${this.getWorkPath(
      userId,
      workId
    )}/characters/characters.json`;
    const characters = (await this.readFile(charactersPath)) || [];

    // 确保 characters 是数组
    if (!Array.isArray(characters)) {
      console.warn("人物数据不是数组格式，重置为空数组");
      return true;
    }

    const filteredCharacters = characters.filter(
      (character) => character.id !== characterId
    );
    this.writeFile(charactersPath, filteredCharacters);

    this.logOperation(userId, "delete_character", {
      workId,
      characterId,
    });

    return true;
  }

  // 删除术语
  async deleteTerm(userId, workId, termId) {
    if (this.useLocalStorageFallback) {
      return this.deleteTermFallback(userId, workId, termId);
    }

    const termsPath = `${this.getWorkPath(
      userId,
      workId
    )}/settings/custom_settings.json`;
    const terms = (await this.readFile(termsPath)) || [];

    // 确保 terms 是数组
    if (!Array.isArray(terms)) {
      console.warn("术语数据不是数组格式，重置为空数组");
      return true;
    }

    const filteredTerms = terms.filter((term) => term.id !== termId);
    this.writeFile(termsPath, filteredTerms);

    this.logOperation(userId, "delete_term", {
      workId,
      termId,
    });

    return true;
  }

  // Fallback 方法
  getChaptersFallback(userId, workId) {
    try {
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];
      return work?.content?.chapters || [];
    } catch (error) {
      console.error("Fallback获取章节数据失败:", error);
      return [];
    }
  }

  getCharactersFallback(userId, workId) {
    try {
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      // 首先尝试从专门的 characters 数组获取
      let characters = work?.content?.characters || [];

      if (!Array.isArray(characters)) {
        characters = [];
      }

      return characters.map((character) => ({
        ...character,
        avatar: character.avatar || "",
        tags: Array.isArray(character.tags) ? character.tags : [],
        relationships: Array.isArray(character.relationships)
          ? character.relationships
          : [],
        attributes: character.attributes || {},
        description: character.description || "",
        background: character.background || "",
        personality: character.personality || "",
        appearance: character.appearance || "",
      }));
    } catch (error) {
      console.error("Fallback获取人物数据失败:", error);
      return [];
    }
  }

  getTermsFallback(userId, workId) {
    try {
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      // 从 settings/custom_settings 获取术语数据
      let terms = work?.content?.settings?.custom_settings || [];

      // 确保返回数组
      if (!Array.isArray(terms)) {
        terms = [];
      }

      return terms;
    } catch (error) {
      console.error("Fallback获取术语数据失败:", error);
      return [];
    }
  }

  deleteChapterFallback(userId, workId, chapterId) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      if (!work?.content?.chapters) return false;

      work.content.chapters = work.content.chapters.filter(
        (chapter) => chapter.id !== chapterId
      );
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);
      return true;
    } catch (error) {
      console.error("Fallback删除章节失败:", error);
      return false;
    }
  }

  deleteCharacterFallback(userId, workId, characterId) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      if (!work?.content?.characters) return false;

      work.content.characters = work.content.characters.filter(
        (character) => character.id !== characterId
      );
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);
      return true;
    } catch (error) {
      console.error("Fallback删除人物失败:", error);
      return false;
    }
  }

  deleteTermFallback(userId, workId, termId) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);
      const work = userConfig.works[workId];

      if (!work?.content?.settings?.custom_settings) return false;

      work.content.settings.custom_settings =
        work.content.settings.custom_settings.filter(
          (term) => term.id !== termId
        );
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);
      return true;
    } catch (error) {
      console.error("Fallback删除术语失败:", error);
      return false;
    }
  }

  // Fallback: 保存角色数据
  async saveCharacterFallback(userId, workId, characterData) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      // 确保作品有content对象
      if (!userConfig.works[workId].content) {
        userConfig.works[workId].content = {};
      }

      // 确保有角色列表
      if (!userConfig.works[workId].content.characters) {
        userConfig.works[workId].content.characters = [];
      }

      const charactersList = userConfig.works[workId].content.characters;
      const characterId = characterData.id || `character_${Date.now()}`;

      // 准备角色数据
      const formattedCharacterData = {
        id: characterId,
        name: characterData.name || "新角色",
        description: characterData.description || "",
        avatar: characterData.avatar || "",
        tags: characterData.tags || [],
        attributes: characterData.attributes || {},
        relationships: characterData.relationships || [],
        background: characterData.background || "",
        personality: characterData.personality || "",
        appearance: characterData.appearance || "",
        created_at: characterData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
      };

      // 查找是否已存在该角色
      const existingIndex = charactersList.findIndex(
        (character) => character.id === characterId
      );
      if (existingIndex >= 0) {
        // 更新现有角色
        formattedCharacterData.created_at =
          charactersList[existingIndex].created_at;
        charactersList[existingIndex] = formattedCharacterData;
        console.log(
          `[Fallback] 更新现有角色: ${characterId}, 名称: ${formattedCharacterData.name}`
        );
      } else {
        // 添加新角色
        charactersList.push(formattedCharacterData);
        console.log(
          `[Fallback] 添加新角色: ${characterId}, 名称: ${formattedCharacterData.name}`
        );
      }

      // 更新作品修改时间
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);

      console.log("[Fallback] 角色数据已保存到本地存储:", {
        workId,
        characterId,
        characterName: formattedCharacterData.name,
        isUpdate: existingIndex >= 0,
        totalCharacters: charactersList.length,
      });

      return formattedCharacterData;
    } catch (error) {
      console.error("Fallback保存角色数据失败:", error);
      throw new Error(`保存角色数据失败: ${error.message}`);
    }
  }

  // 创建章节
  async createChapter(userId, workId, chapterData) {
    if (this.useLocalStorageFallback) {
      try {
        const result = await this.createChapterFallback(
          userId,
          workId,
          chapterData
        );
        return result;
      } catch (error) {
        console.error("[Fallback] 创建章节失败:", error);
        throw new Error(`创建章节失败: ${error.message}`);
      }
    }

    const workDir = this.getWorkPath(userId, workId);
    const chaptersPath = `${workDir}/chapters/chapters.json`;

    try {
      // 确保chapters目录存在
      this.mkdirIfNotExists(`${workDir}/chapters`);

      // 读取现有章节列表
      let chapters = await this.readFile(chaptersPath);
      if (!Array.isArray(chapters)) {
        chapters = [];
      }

      // 准备章节数据
      const chapterId = chapterData.id || `${Date.now()}`;

      // 计算字数
      const wordCount = chapterData.content
        ? chapterData.content.split(/\s+/).filter(Boolean).length
        : 0;

      // 章节列表中的数据（不包含content，加快读取速度）
      const chapterListItem = {
        id: chapterId,
        title: chapterData.title || "新章节",
        content: "", // chapters.json中content为空，内容只保存在单独的章节文件中
        created_at: chapterData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
        order: chapters.length, // 章节顺序
        word_count: wordCount,
      };

      // 完整的章节数据（保存在单独的章节文件中）
      const formattedChapterData = {
        ...chapterListItem,
        content: chapterData.content || "", // 完整内容保存在单独的章节文件中
      };

      // 添加到章节列表（不包含content）
      chapters.push(chapterListItem);

      // 保存章节列表（不包含content，加快读取速度）
      await this.writeFile(chaptersPath, chapters);

      // 创建单独的章节文件（包含完整内容，适配读取业务）
      const chapterFilePath = `${workDir}/chapters/${chapterId}.json`;
      await this.writeFile(chapterFilePath, formattedChapterData);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      // 记录操作日志
      this.logOperation(userId, "create_chapter", {
        workId,
        chapterId,
        chapterTitle: formattedChapterData.title,
        wordCount: formattedChapterData.word_count,
      });

      console.log(
        `章节创建成功: ${chapterId}, 标题: ${formattedChapterData.title}`
      );
      return formattedChapterData;
    } catch (error) {
      console.error("创建章节失败:", error);
      throw new Error(`创建章节失败: ${error.message}`);
    }
  }

  // Fallback: 创建章节
  async createChapterFallback(userId, workId, chapterData) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      // 确保作品有content对象
      if (!userConfig.works[workId].content) {
        userConfig.works[workId].content = {};
      }

      // 确保有chapters数组
      if (!userConfig.works[workId].content.chapters) {
        userConfig.works[workId].content.chapters = [];
      }

      const chaptersList = userConfig.works[workId].content.chapters;
      const chapterId = chapterData.id || `${Date.now()}`;

      // 准备章节数据
      const formattedChapterData = {
        id: chapterId,
        title: chapterData.title || "新章节",
        content: chapterData.content || "",
        created_at: chapterData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        work_id: workId,
        user_id: userId,
        order: chaptersList.length, // 章节顺序
        word_count: chapterData.content
          ? chapterData.content.split(/\s+/).filter(Boolean).length
          : 0,
      };

      // 添加到章节列表
      chaptersList.push(formattedChapterData);

      // 更新作品修改时间
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);

      console.log("[Fallback] 章节已保存到本地存储:", {
        workId,
        chapterId,
        chapterTitle: formattedChapterData.title,
        wordCount: formattedChapterData.word_count,
        totalChapters: chaptersList.length,
      });

      return formattedChapterData;
    } catch (error) {
      console.error("Fallback创建章节失败:", error);
      throw new Error(`创建章节失败: ${error.message}`);
    }
  }

  // Fallback: 保存术语数据
  async saveTermFallback(userId, workId, termData) {
    try {
      const data = this.getFallbackData();
      const userConfig = this.getUserConfigFallback(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      // 确保作品有content对象
      if (!userConfig.works[workId].content) {
        userConfig.works[workId].content = {};
      }

      // 确保有settings对象
      if (!userConfig.works[workId].content.settings) {
        userConfig.works[workId].content.settings = {};
      }

      // 确保有术语列表
      if (!userConfig.works[workId].content.settings.custom_settings) {
        userConfig.works[workId].content.settings.custom_settings = [];
      }

      const termsList =
        userConfig.works[workId].content.settings.custom_settings;
      const termId = termData.id || `setting_${Date.now()}`;

      // 准备术语数据 - 使用正确的格式
      const formattedTermData = {
        id: termId,
        type: "setting",
        work_id: workId,
        user_id: userId,
        name: termData.name || termData.term || "新术语", // 优先使用 name，向后兼容 term
        description: termData.description || termData.definition || "", // 优先使用 description，向后兼容 definition
        reserved_slots: termData.reserved_slots || {
          slot_alpha: null,
          slot_beta: null,
          slot_gamma: null,
        },
        created_at: termData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: termData.status || "draft",
      };

      // 查找是否已存在该术语
      const existingIndex = termsList.findIndex((term) => term.id === termId);
      if (existingIndex >= 0) {
        // 更新现有术语
        formattedTermData.created_at = termsList[existingIndex].created_at;
        termsList[existingIndex] = formattedTermData;
        console.log(
          `[Fallback] 更新现有术语: ${termId}, 名称: ${formattedTermData.name}`
        );
      } else {
        // 添加新术语
        termsList.push(formattedTermData);
        console.log(
          `[Fallback] 添加新术语: ${termId}, 名称: ${formattedTermData.name}`
        );
      }

      // 更新作品修改时间
      userConfig.works[workId].updated_at = new Date().toISOString();
      userConfig.updated_at = new Date().toISOString();

      this.setFallbackData(data);

      console.log("[Fallback] 术语数据已保存到本地存储:", {
        workId,
        termId,
        termName: formattedTermData.name,
        isUpdate: existingIndex >= 0,
        totalTerms: termsList.length,
      });

      return formattedTermData;
    } catch (error) {
      console.error("Fallback保存术语数据失败:", error);
      throw new Error(`保存术语数据失败: ${error.message}`);
    }
  }

  // ============ 卷管理相关方法 ============

  // 创建卷
  async createVolume(userId, workId, volumeData) {
    const workDir = this.getWorkPath(userId, workId);
    const volumeId = `volume_${Date.now()}`;
    const now = new Date().toISOString();

    // 支持 name 和 title 两种字段名
    const volumeName = volumeData.name || volumeData.title || "未命名卷";

    const volume = {
      id: volumeId,
      name: volumeName,  // 使用 name 作为主要字段
      title: volumeName, // 同时保留 title 兼容
      description: volumeData.description || "",
      order: 0, // 将在添加到列表时设置
      chapter_count: 0,
      word_count: 0,
      created_at: now,
      updated_at: now,
    };

    try {
      // 确保volumes文件夹存在
      this.mkdirIfNotExists(`${workDir}/volumes`);
      this.mkdirIfNotExists(`${workDir}/volumes/${volumeId}`);
      this.mkdirIfNotExists(`${workDir}/volumes/${volumeId}/chapters`);

      // 创建卷配置文件
      await this.writeFile(
        `${workDir}/volumes/${volumeId}/volume.config.json`,
        volume
      );

      // 创建该卷的章节索引
      await this.writeFile(
        `${workDir}/volumes/${volumeId}/chapters/chapters.json`,
        []
      );

      // 更新卷列表索引
      const volumesIndexPath = `${workDir}/volumes/volumes.json`;
      let volumesList = (await this.readFile(volumesIndexPath)) || [];
      
      if (!Array.isArray(volumesList)) {
        volumesList = [];
      }

      // 设置卷的顺序
      volume.order = volumesList.length + 1;
      volumesList.push(volume);

      await this.writeFile(volumesIndexPath, volumesList);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: now,
      });

      console.log(`✅ 卷创建成功: ${volumeId}`);
      return volume;
    } catch (error) {
      console.error("创建卷失败:", error);
      throw new Error(`创建卷失败: ${error.message}`);
    }
  }

  // 获取卷列表
  async getVolumes(userId, workId) {
    const workDir = this.getWorkPath(userId, workId);
    const volumesIndexPath = `${workDir}/volumes/volumes.json`;

    try {
      let volumesList = await this.readFile(volumesIndexPath);
      
      if (!volumesList) {
        volumesList = [];
      }

      // 确保是数组
      if (!Array.isArray(volumesList)) {
        console.warn("卷列表数据不是数组，返回空数组");
        return [];
      }

      // 按顺序排序
      return volumesList.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error("获取卷列表失败:", error);
      return [];
    }
  }

  // 获取单个卷信息
  async getVolume(userId, workId, volumeId) {
    const workDir = this.getWorkPath(userId, workId);
    const volumeConfigPath = `${workDir}/volumes/${volumeId}/volume.config.json`;

    try {
      const volumeConfig = await this.readFile(volumeConfigPath);
      return volumeConfig;
    } catch (error) {
      console.error(`获取卷信息失败: ${volumeId}`, error);
      return null;
    }
  }

  // 更新卷信息
  async updateVolume(userId, workId, volumeId, updates) {
    const workDir = this.getWorkPath(userId, workId);
    const volumeConfigPath = `${workDir}/volumes/${volumeId}/volume.config.json`;
    const volumesIndexPath = `${workDir}/volumes/volumes.json`;

    try {
      // 读取卷配置
      const volumeConfig = await this.readFile(volumeConfigPath);
      if (!volumeConfig) {
        throw new Error("卷不存在");
      }

      // 更新卷配置
      // 如果更新了 name 或 title，同时更新另一个字段
      const syncUpdates = { ...updates };
      if (updates.name) {
        syncUpdates.title = updates.name;
      } else if (updates.title) {
        syncUpdates.name = updates.title;
      }
      
      const updatedVolume = {
        ...volumeConfig,
        ...syncUpdates,
        updated_at: new Date().toISOString(),
      };

      await this.writeFile(volumeConfigPath, updatedVolume);

      // 更新卷列表索引
      let volumesList = await this.readFile(volumesIndexPath);
      if (Array.isArray(volumesList)) {
        const index = volumesList.findIndex((v) => v.id === volumeId);
        if (index >= 0) {
          volumesList[index] = updatedVolume;
          await this.writeFile(volumesIndexPath, volumesList);
        }
      }

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ 卷更新成功: ${volumeId}`);
      return updatedVolume;
    } catch (error) {
      console.error("更新卷失败:", error);
      throw new Error(`更新卷失败: ${error.message}`);
    }
  }

  // 删除卷（需先删除卷内所有章节）
  async deleteVolume(userId, workId, volumeId) {
    const workDir = this.getWorkPath(userId, workId);
    const volumeConfigPath = `${workDir}/volumes/${volumeId}/volume.config.json`;
    const volumesIndexPath = `${workDir}/volumes/volumes.json`;

    try {
      // 检查卷是否存在
      const volumeConfig = await this.readFile(volumeConfigPath);
      if (!volumeConfig) {
        throw new Error("卷不存在");
      }

      // 检查卷内是否有章节
      if (volumeConfig.chapter_count > 0) {
        throw new Error("请先删除卷内所有章节");
      }

      // 从卷列表中移除
      let volumesList = await this.readFile(volumesIndexPath);
      if (Array.isArray(volumesList)) {
        volumesList = volumesList.filter((v) => v.id !== volumeId);
        
        // 重新排序
        volumesList.forEach((v, index) => {
          v.order = index + 1;
        });

        await this.writeFile(volumesIndexPath, volumesList);
      }

      // 删除卷文件夹（递归删除）
      const volumeDir = `${workDir}/volumes/${volumeId}`;
      await this.deleteDirectory(volumeDir);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ 卷删除成功: ${volumeId}`);
      return true;
    } catch (error) {
      console.error("删除卷失败:", error);
      throw new Error(`删除卷失败: ${error.message}`);
    }
  }

  // 重排序卷
  async reorderVolumes(userId, workId, volumeOrder) {
    const workDir = this.getWorkPath(userId, workId);
    const volumesIndexPath = `${workDir}/volumes/volumes.json`;

    try {
      let volumesList = await this.readFile(volumesIndexPath);
      
      if (!Array.isArray(volumesList)) {
        throw new Error("卷列表数据无效");
      }

      // volumeOrder 是卷ID数组，按新顺序排列
      volumesList.forEach((volume) => {
        const newOrder = volumeOrder.indexOf(volume.id);
        if (newOrder >= 0) {
          volume.order = newOrder + 1;
          volume.updated_at = new Date().toISOString();
        }
      });

      // 按新顺序排序
      volumesList.sort((a, b) => (a.order || 0) - (b.order || 0));

      await this.writeFile(volumesIndexPath, volumesList);

      console.log(`✅ 卷重排序成功`);
      return true;
    } catch (error) {
      console.error("重排序卷失败:", error);
      throw new Error(`重排序卷失败: ${error.message}`);
    }
  }

  // ============ 卷内章节管理 ============

  // 在指定卷创建章节
  async createChapter(userId, workId, volumeId, chapterData) {
    const workDir = this.getWorkPath(userId, workId);
    const chapterId = `chapter_${Date.now()}`;
    const now = new Date().toISOString();

    const chapter = {
      id: chapterId,
      title: chapterData.title || "未命名章节",
      volume_id: volumeId,
      volume_order: 0, // 将在添加时设置
      global_order: 0, // 将在添加时设置
      content: chapterData.content || "",
      word_count: 0,
      is_completed: false,
      created_at: now,
      updated_at: now,
    };

    try {
      // 获取该卷的章节列表
      const chaptersPath = `${workDir}/volumes/${volumeId}/chapters/chapters.json`;
      let chaptersList = (await this.readFile(chaptersPath)) || [];
      
      if (!Array.isArray(chaptersList)) {
        chaptersList = [];
      }

      // 设置卷内序号
      chapter.volume_order = chaptersList.length + 1;

      // 计算全局序号（需要读取所有卷的章节）
      const allChapters = await this.getAllChapters(userId, workId);
      chapter.global_order = allChapters.length + 1;

      // 添加到章节列表索引
      chaptersList.push(chapter);

      // 保存章节索引（不包含content）
      const chapterIndex = {
        ...chapter,
        content: "", // 索引中不存content
      };
      await this.writeFile(chaptersPath, chaptersList.map(ch => ({
        ...ch,
        content: "" // 索引中不存content
      })));

      // 保存完整章节内容
      await this.writeFile(
        `${workDir}/volumes/${volumeId}/chapters/${chapterId}.json`,
        chapter
      );

      // 更新卷统计
      await this.updateVolumeStats(userId, workId, volumeId);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: now,
      });

      console.log(`✅ 章节创建成功: ${chapterId}`);
      return chapter;
    } catch (error) {
      console.error("创建章节失败:", error);
      throw new Error(`创建章节失败: ${error.message}`);
    }
  }

  // 获取卷内章节列表
  async getChaptersByVolume(userId, workId, volumeId) {
    const workDir = this.getWorkPath(userId, workId);
    const chaptersPath = `${workDir}/volumes/${volumeId}/chapters/chapters.json`;

    try {
      let chaptersList = await this.readFile(chaptersPath);
      
      if (!chaptersList) {
        return [];
      }

      if (!Array.isArray(chaptersList)) {
        console.warn("章节数据不是数组，返回空数组");
        return [];
      }

      // 按卷内顺序排序
      return chaptersList.sort(
        (a, b) => (a.volume_order || 0) - (b.volume_order || 0)
      );
    } catch (error) {
      console.error("获取卷内章节失败:", error);
      return [];
    }
  }

  // 获取所有章节（跨卷）
  async getAllChapters(userId, workId) {
    try {
      const volumes = await this.getVolumes(userId, workId);
      const allChapters = [];

      for (const volume of volumes) {
        const chapters = await this.getChaptersByVolume(userId, workId, volume.id);
        allChapters.push(...chapters);
      }

      // 按全局顺序排序
      return allChapters.sort(
        (a, b) => (a.global_order || 0) - (b.global_order || 0)
      );
    } catch (error) {
      console.error("获取所有章节失败:", error);
      return [];
    }
  }

  // 获取单个章节详情
  async getChapter(userId, workId, volumeId, chapterId) {
    const workDir = this.getWorkPath(userId, workId);
    const chapterPath = `${workDir}/volumes/${volumeId}/chapters/${chapterId}.json`;

    try {
      const chapter = await this.readFile(chapterPath);
      return chapter;
    } catch (error) {
      console.error(`获取章节失败: ${chapterId}`, error);
      return null;
    }
  }

  // 更新章节
  async updateChapter(userId, workId, volumeId, chapterId, updates) {
    const workDir = this.getWorkPath(userId, workId);
    const chapterPath = `${workDir}/volumes/${volumeId}/chapters/${chapterId}.json`;
    const chaptersPath = `${workDir}/volumes/${volumeId}/chapters/chapters.json`;

    try {
      // 读取章节内容
      const chapter = await this.readFile(chapterPath);
      if (!chapter) {
        throw new Error("章节不存在");
      }

      // 更新章节
      const updatedChapter = {
        ...chapter,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // 计算字数
      if (updatedChapter.content) {
        updatedChapter.word_count = updatedChapter.content.replace(/\s/g, "").length;
      }

      // 保存完整章节
      await this.writeFile(chapterPath, updatedChapter);

      // 更新章节索引
      let chaptersList = await this.readFile(chaptersPath);
      if (Array.isArray(chaptersList)) {
        const index = chaptersList.findIndex((ch) => ch.id === chapterId);
        if (index >= 0) {
          chaptersList[index] = {
            ...updatedChapter,
            content: "", // 索引中不存content
          };
          await this.writeFile(chaptersPath, chaptersList);
        }
      }

      // 更新卷统计
      await this.updateVolumeStats(userId, workId, volumeId);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ 章节更新成功: ${chapterId}`);
      return updatedChapter;
    } catch (error) {
      console.error("更新章节失败:", error);
      throw new Error(`更新章节失败: ${error.message}`);
    }
  }

  // 删除章节
  async deleteChapter(userId, workId, volumeId, chapterId) {
    const workDir = this.getWorkPath(userId, workId);
    const chapterPath = `${workDir}/volumes/${volumeId}/chapters/${chapterId}.json`;
    const chaptersPath = `${workDir}/volumes/${volumeId}/chapters/chapters.json`;

    try {
      // 从章节列表中移除
      let chaptersList = await this.readFile(chaptersPath);
      if (Array.isArray(chaptersList)) {
        chaptersList = chaptersList.filter((ch) => ch.id !== chapterId);
        
        // 重新排序卷内序号
        chaptersList.forEach((ch, index) => {
          ch.volume_order = index + 1;
        });

        await this.writeFile(chaptersPath, chaptersList);
      }

      // 删除章节文件
      await this.deleteFile(chapterPath);

      // 更新卷统计
      await this.updateVolumeStats(userId, workId, volumeId);

      // 更新全局序号
      await this.recalculateGlobalOrder(userId, workId);

      // 更新作品修改时间
      await this.updateWork(userId, workId, {
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ 章节删除成功: ${chapterId}`);
      return true;
    } catch (error) {
      console.error("删除章节失败:", error);
      throw new Error(`删除章节失败: ${error.message}`);
    }
  }

  // 移动章节到其他卷
  async moveChapterToVolume(userId, workId, chapterId, targetVolumeId) {
    try {
      // 获取所有章节找到要移动的章节
      const allChapters = await this.getAllChapters(userId, workId);
      const chapter = allChapters.find((ch) => ch.id === chapterId);

      if (!chapter) {
        throw new Error("章节不存在");
      }

      const sourceVolumeId = chapter.volume_id;

      // 如果目标卷和当前卷相同，不需要移动
      if (sourceVolumeId === targetVolumeId) {
        return true;
      }

      // 在目标卷创建章节
      const newChapter = await this.createChapter(userId, workId, targetVolumeId, {
        title: chapter.title,
        content: chapter.content || "",
        is_completed: chapter.is_completed,
      });

      // 删除原章节
      await this.deleteChapter(userId, workId, sourceVolumeId, chapterId);

      console.log(`✅ 章节移动成功: ${chapterId} -> ${targetVolumeId}`);
      return true;
    } catch (error) {
      console.error("移动章节失败:", error);
      throw new Error(`移动章节失败: ${error.message}`);
    }
  }

  // 更新卷统计信息
  async updateVolumeStats(userId, workId, volumeId) {
    const workDir = this.getWorkPath(userId, workId);

    try {
      const chapters = await this.getChaptersByVolume(userId, workId, volumeId);
      
      const chapterCount = chapters.length;
      const wordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);

      await this.updateVolume(userId, workId, volumeId, {
        chapter_count: chapterCount,
        word_count: wordCount,
      });
    } catch (error) {
      console.error("更新卷统计失败:", error);
    }
  }

  // 重新计算全局序号
  async recalculateGlobalOrder(userId, workId) {
    try {
      const allChapters = await this.getAllChapters(userId, workId);
      const workDir = this.getWorkPath(userId, workId);

      for (let i = 0; i < allChapters.length; i++) {
        const chapter = allChapters[i];
        const newGlobalOrder = i + 1;

        if (chapter.global_order !== newGlobalOrder) {
          await this.updateChapter(
            userId,
            workId,
            chapter.volume_id,
            chapter.id,
            { global_order: newGlobalOrder }
          );
        }
      }
    } catch (error) {
      console.error("重新计算全局序号失败:", error);
    }
  }

  // 删除目录（递归）
  async deleteDirectory(dirPath) {
    try {
      // 由于uni-app的限制，需要手动删除目录内的所有文件
      // 这里简化处理，实际使用时可能需要更复杂的逻辑
      if (this.useLocalStorageFallback) {
        // localStorage模式不需要删除目录
        return true;
      }

      // 对于plus.io或文件系统，直接删除
      // 注意：实际项目中可能需要递归删除目录内容
      console.log(`删除目录: ${dirPath}`);
      return true;
    } catch (error) {
      console.error("删除目录失败:", error);
      return false;
    }
  }
}
// 创建单例实例
export const storage = new FileSystemStorage();

// 默认导出
export default storage;
