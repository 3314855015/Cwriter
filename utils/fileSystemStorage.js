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
      this.fs.mkdirSync(dirPath, true);
    } catch (error) {
      // 目录已存在则忽略错误
      if (error.errMsg && error.errMsg.includes("file already exists")) {
        return;
      }
      throw error;
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
                      const content = reader.result
                        ? JSON.parse(reader.result)
                        : null;
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
                if (filePath.includes('undefined/')) {
                  console.error('❌ 路径包含undefined，检查userId和workId是否正确传递', {
                    filePath,
                    error
                  });
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
      return true; // H5 环境下不需要删除真实文件
    }

    try {
      if (this.fileExists(filePath)) {
        this.fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.error(`删除文件失败: ${filePath}`, error);
      return false;
    }
  }

  // 删除目录及其内容
  deleteDirectory(dirPath) {
    if (this.useLocalStorageFallback) {
      return true; // H5 环境下不需要删除真实目录
    }

    try {
      if (this.fileExists(dirPath)) {
        this.fs.rmdirSync(dirPath, true);
      }
      return true;
    } catch (error) {
      console.error(`删除目录失败: ${dirPath}`, error);
      return false;
    }
  }

  // 获取用户文件路径
  getUserPath(userId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserPath: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ initUserStorage: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserConfig: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserWorks: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
            const workConfig = this.readFile(workConfigPath);
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
        let userConfig = this.getUserConfig(userId);

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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserWorksAsync: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
                            reader.onloadend = () => {
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
                                  let userConfig = this.getUserConfig(userId);

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
    this.writeFile(`${workDir}/glossary/glossary.json`, []);
    this.writeFile(`${workDir}/maps/map_data.json`, []);

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
      const workConfig = this.readFile(`${workDir}/work.config.json`);

      // 将作品信息同步到用户配置文件中
      try {
        const userConfigPath = this.getUserConfigPath(userId);
        let userConfig = this.readFile(userConfigPath);

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
  deleteWork(userId, workId) {
    // 检查userId的有效性，防止undefined或null
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ deleteWork: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
    }
    
    try {
      const userConfig = this.getUserConfig(userId);

      if (!userConfig.works[workId]) {
        throw new Error("作品不存在");
      }

      const workDir = this.getWorkPath(userId, workId);
      const workTitle = userConfig.works[workId].title;

      // 删除整个作品目录
      this.deleteDirectory(workDir);

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
  getWorkDetail(userId, workId) {
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
    const workConfig = this.readFile(workConfigPath);
    if (!workConfig) {
      throw new Error("作品不存在");
    }

    // 加载作品内容文件
    const manuscript =
      this.readFile(`${workDir}/settings/manuscript.json`) || {};
    const chapters = this.readFile(`${workDir}/chapters/chapters.json`) || [];
    const glossary = this.readFile(`${workDir}/glossary/glossary.json`) || [];
    const mapData = this.readFile(`${workDir}/maps/map_data.json`) || [];

    workConfig.content = {
      manuscript,
      chapters,
      glossary,
      map_data: mapData,
    };

    return workConfig;
  }

  // 保存作品内容
  saveWorkContent(userId, workId, contentUpdates) {
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
        const currentManuscript = this.readFile(manuscriptPath) || {};

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

      if (contentUpdates.glossary) {
        this.writeFile(
          `${workDir}/glossary/glossary.json`,
          contentUpdates.glossary
        );
      }

      if (contentUpdates.map_data) {
        this.writeFile(
          `${workDir}/maps/map_data.json`,
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

  // 添加专有名词
  addGlossaryItem(userId, workId, itemData) {
    const glossaryPath = `${this.getWorkPath(
      userId,
      workId
    )}/glossary/glossary.json`;
    const glossary = this.readFile(glossaryPath) || [];

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
  createBackup(userId) {
    try {
      const backupDir = `${this.basePath}/backups/${userId}`;
      this.mkdirIfNotExists(backupDir);

      const backupId = Date.now().toString();
      const userConfig = this.getUserConfig(userId);

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
        const config = this.readFile(this.configFile);
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
  getStorageStats(userId) {
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
      const userConfig = this.getUserConfig(userId);
      const userPath = this.getUserPath(userId);

      let totalWords = 0;
      let totalCharacters = 0;
      let totalMaps = 0;
      let totalFiles = 0;

      // 遍历所有作品 - 添加空值检查
      const works = userConfig?.works || {};
      Object.values(works).forEach((work) => {
        try {
          const workDir = this.getWorkPath(userId, work.id);

          // 读取稿件内容
          const manuscriptPath = `${workDir}/settings/manuscript.json`;
          const manuscript = this.readFile(manuscriptPath);

          if (manuscript && manuscript.content) {
            totalWords += manuscript.content.split(/\s+/).length;
            totalCharacters += manuscript.content.length;
          }

          // 读取地图数据
          const mapDataPath = `${workDir}/maps/map_data.json`;
          const mapData = this.readFile(mapDataPath);
          if (mapData && Array.isArray(mapData)) {
            totalMaps += mapData.length;
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
  cleanupOldData(maxLogs = 1000, maxBackups = 10) {
    try {
      // 清理日志
      const logsDir = `${this.basePath}/logs`;
      if (this.fileExists(logsDir)) {
        const logFiles = this.fs.readdirSync(logsDir) || [];
        logFiles.forEach((userId) => {
          const logFile = `${logsDir}/${userId}/operations.json`;
          const logs = this.readFile(logFile) || [];

          if (logs.length > maxLogs) {
            this.writeFile(logFile, logs.slice(-maxLogs));
          }
        });
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ initUserStorageFallback: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserConfigFallback: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn("⚠️ getUserWorksFallback: 无效的userId，使用default_user", { userId });
      userId = 'default_user';
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
        map_data: [],
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
}
// 创建单例实例
export const storage = new FileSystemStorage();

// 默认导出
export default storage;
