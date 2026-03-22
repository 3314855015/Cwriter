# Cwriter - 创意写作助手

一款面向文学创作者的移动端写作辅助工具，支持小说创作、管理、导入导出等功能。

## ✨ 功能特性

- 📝 **作品创作** - 创建和管理多个写作项目，实时统计字数
- 📚 **章节管理** - 支持多卷多章节结构，灵活组织内容
- 👥 **人物设定** - 创建和管理作品角色信息
- 🎯 **伏笔追踪** - 标记和追踪故事中的伏笔
- 📥 **小说导入** - 支持导入TXT格式小说，智能解析章节结构
- 📤 **小说导出** - 支持导出为PDF、DOCX等格式
- 🌙 **深色模式** - 支持明暗主题切换
- 💾 **本地存储** - 所有数据存储在本地，无需联网即可使用
！详细使用教程/演示，请关注apk发布公告

## 📱 技术栈

- [uni-app](https://uniapp.dcloud.io/) - 跨平台开发框架
- Vue 3 - 前端框架
- 原生插件 - 导出功能（PDF/DOCX）

## 📁 项目结构

```
Cwriter/
├── components/        # 公共组件
├── pages/             # 页面文件
├── static/            # 静态资源
├── utils/             # 工具函数
├── nativeplugins/     # 原生插件（旧）
├── App.vue            # 应用入口
├── main.js            # 主入口文件
├── manifest.json      # 应用配置
└── pages.json         # 页面配置
```

## 📄 数据存储

所有用户数据存储在设备的本地存储中：

```
cwriter_data/
├── users/                    # 用户目录
│   └── default_user/         # 默认用户
│       ├── works/            # 作品目录
│       │   └── {workId}/     # 单个作品
│       │       ├── work.config.json
│       │       ├── content.json
│       │       ├── chapters/
│       │       ├── characters/
│       │       ├── settings/
│       │       └── foreshadowing/
│       └── user.config.json
└── global.config.json
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建新分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📜 开源协议

本项目采用 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [uni-app](https://uniapp.dcloud.io/) - 跨平台开发框架
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架

---

如果这个项目对你有帮助，请给一个 ⭐️ Star 支持一下！
