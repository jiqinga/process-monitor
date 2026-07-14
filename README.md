# Process Monitor

一个基于 Tauri + Vue 3 的桌面进程监控工具，支持实时监控系统进程的 CPU 和内存使用情况，并在超过阈值时触发告警和自动操作。

## 功能特性

- **进程仪表盘** - 实时显示系统进程列表，支持搜索、排序和分页
- **监控规则** - 自定义监控规则，支持 CPU/内存阈值、进程状态等多种触发条件
- **自动操作** - 规则触发时可自动执行结束进程、启动进程、运行命令等操作
- **提示模式** - 支持在规则触发时弹窗提示用户手动确认操作
- **事件日志** - 记录所有监控事件和操作历史
- **多窗口支持** - 主窗口、告警弹窗、通知弹窗独立显示
- **国际化** - 支持中文/英文切换
- **主题切换** - 支持浅色/深色/跟随系统主题

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **后端**: Rust + Tauri 2.0
- **状态管理**: Pinia
- **国际化**: Vue I18n

## 开发环境

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Tauri CLI 依赖](https://tauri.app/v1/guides/getting-started/prerequisites)

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
# 仅前端开发
npm run dev

# Tauri 桌面应用开发
npm run dev:tauri
```

### 构建打包

```bash
# 构建桌面应用
npm run build:tauri
```

## 项目结构

```
tarui/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── composables/        # 组合式函数
│   ├── locales/            # 国际化文件
│   ├── stores/             # Pinia 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── views/              # 视图组件
│   ├── App.vue             # 主应用组件
│   ├── main.ts             # 入口文件
│   └── styles.css          # 全局样式
├── src-tauri/              # Tauri 后端源码
│   └── src/
│       ├── actions.rs      # 操作执行逻辑
│       ├── commands.rs     # Tauri 命令定义
│       ├── config.rs       # 配置管理
│       ├── monitor.rs      # 进程监控核心逻辑
│       └── types.rs        # Rust 类型定义
├── package.json
└── tauri.conf.json         # Tauri 配置
```
