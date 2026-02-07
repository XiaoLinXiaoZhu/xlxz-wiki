# XLXZ Wiki v4 开发进度

> 基于 [technical-design.md](./technical-design.md) 的开发计划执行

## 阶段一：只读渲染 + 后端服务

### Week 1: 基础搭建

- [x] **Day 1: 项目初始化**
  - [x] `package.json` — Vue 3, Vite, Pinia, Hono, markdown-it, chokidar, gray-matter, @types/bun
  - [x] `tsconfig.json` — TypeScript 严格模式, Bun 类型, 路径别名 `@/`, `@shared/`, `@server/`
  - [x] `vite.config.ts` — Vue 插件, 路径别名, 开发代理 (`/api` → 3055, `/ws` WebSocket)
  - [x] `shared/types.ts` — 共享类型: WikiTerm, WikiFormula, WikiIndex, WsMessage, FileTreeNode
  - [x] `src/env.d.ts` — Vue SFC + Vite 客户端类型声明
  - [x] `index.html` + `src/main.ts` + `src/App.vue` — 前端最小入口
  - [x] `wiki-docs/` — 示例策划案文档（词条引用、文件内定义、策划公式）
  - [x] `.gitignore` 更新

- [x] **Day 2: 后端 Hono 服务器**
  - [x] `server/index.ts` — Hono HTTP + Bun WebSocket 入口（端口 3055），静态文件服务 + SPA 回退
  - [x] `server/routes/api.ts` — REST API: `GET /api/index`, `GET /api/file`, `POST /api/file`, `GET /api/files`, `GET /api/search`
  - [x] `server/routes/ws.ts` — WebSocket 连接管理（注册/移除/广播）
  - [x] `server/watcher.ts` — Chokidar 文件监听 `wiki-docs/**/*.md`，变更时广播 WebSocket 消息

- [x] **Day 3: WikiIndexer 实现**
  - [x] `server/indexer/parser.ts` — .md 文件解析（frontmatter alias/scope + 文件内定义 `【词条】：定义` + 策划公式 `%% %%`）
  - [x] `server/indexer/indexer.ts` — WikiIndexer 主类（全量构建 + 增量更新 + 文件移除）
  - [x] 接入 `server/routes/api.ts`（`/api/index` 返回真实索引，`/api/search` 支持词条搜索）
  - [x] 接入 `server/watcher.ts`（文件变更时增量更新索引 + WebSocket 广播新索引）
  - [x] 验证：6 个词条 + 1 个公式正确解析

- [x] **Day 4: 前端 Vue 3 项目搭建**
  - [x] `src/router/index.ts` — Vue Router（`/` 首页, `/doc/:path` 文档页）
  - [x] `src/stores/wiki.ts` — Pinia store（索引、文件树、当前文件、加载状态）
  - [x] `src/main.ts` — 入口（Pinia + Vue Router 注册）
  - [x] `src/components/layout/MainLayout.vue` — 主布局（侧边栏 + 内容区）
  - [x] `src/components/layout/Header.vue` — 顶部栏（文件路径 + 模式显示）
  - [x] `src/components/layout/Sidebar.vue` — 侧边栏（文件树 + 初始化加载索引和文件树）
  - [x] `src/components/layout/FileTreeItem.vue` — 文件树节点（递归、目录折叠、点击导航）

- [x] **Day 5: 侧边栏文件树 + 文件内容加载**
  - [x] `src/views/DocView.vue` — 文档视图（路由驱动加载文件内容）
  - [x] 侧边栏点击 → 路由跳转 → 加载文件 → 显示内容（已在 Day 4 一并完成）

### Week 2: 核心功能

- [x] **Day 1: markdown-it 自定义语法规则**
  - [x] `src/markdown/index.ts` — markdown-it 实例配置 + 插件注册
  - [x] `src/markdown/rules/wiki-term.ts` — `【词条】` → `<wiki-term>` 组件标签
  - [x] `src/markdown/rules/wiki-definition.ts` — `【词条】：定义` → `<wiki-definition>` 组件标签
  - [x] `src/markdown/rules/wiki-formula.ts` — `%% 公式 %%` → `<wiki-formula>` 组件标签

- [x] **Day 2: MarkdownViewer 组件**
  - [x] `src/components/viewer/MarkdownViewer.vue` — HTML → Vue 动态组件编译（使用 `vue/dist/vue.esm-bundler.js`）
  - [x] `src/components/viewer/WikiTerm.vue` — 词条引用组件（蓝色可交互，缺失定义标红）
  - [x] `src/components/viewer/WikiDefinition.vue` — 文件内定义组件（紫色高亮）
  - [x] `src/components/viewer/WikiFormula.vue` — 策划公式组件（计算值蓝色、设计值紫色斜体）
  - [x] `vite.config.ts` 添加 Vue 运行时编译器别名

- [x] **Day 3: WikiTerm + WikiHoverCard 组件**
  - [x] `src/components/viewer/WikiHoverCard.vue` — 悬停定义卡片
  - [x] `src/components/viewer/HoverCardLayer.vue` — 全局卡片渲染层（Teleport to body）
  - [x] `src/composables/useHoverCards.ts` — 全局卡片栈管理（打开/关闭/层级/延迟）
  - [x] 悬停定位（`position: fixed`，根据触发元素位置计算，边界翻转）
  - [x] 支持嵌套悬停（卡片内词条引用可继续悬停，provide/inject 传递 parentCardId）
  - [x] 递增 z-index 管理层级（BASE_Z_INDEX 1000 + level）
  - [x] 鼠标离开延迟关闭（150ms，cancelClose 取消祖先链关闭）
  - [x] 修复 `MarkdownViewer.vue` 中 gray-matter 的 Buffer 浏览器兼容问题（改为手动剥离 frontmatter）

- [ ] **Day 4: 策划公式语法 + WikiFormula 组件增强**
  - [ ] 公式内计算值/设计值可悬停查看定义
  - [ ] 公式与词条索引联动

- [ ] **Day 5: scope 优先级 + 近似匹配**
  - [ ] `src/utils/term-resolver.ts` — scope 优先级解析（文件内定义 > 当前 scope > 全局 > 其他 scope）
  - [ ] 近似匹配（编辑距离）— 未找到词条时提示相似项

### Week 3: 集成与打包

- [ ] **Day 1: 前端 WebSocket 客户端 + 实时更新**
  - [ ] `src/services/websocket.ts` — WebSocket 客户端
  - [ ] 文件变更时自动刷新当前文档 + 更新索引

- [ ] **Day 2: Chokidar 文件监听完善**
  - [ ] 新增/删除文件时更新侧边栏文件树
  - [ ] 编辑中文件被外部修改时提示

- [ ] **Day 3: Bun compile 打包**
  - [ ] `bun build --compile` 生成可执行程序
  - [ ] 启动脚本（自动打开浏览器）

- [ ] **Day 4: 测试 + Bug 修复**
  - [ ] `tests/parser.test.ts` — frontmatter 解析、正文解析
  - [ ] `tests/indexer.test.ts` — 索引构建、增量更新
  - [ ] `tests/term-resolver.test.ts` — scope 优先级、近似匹配

- [ ] **Day 5: 文档完善**
  - [ ] README.md — 使用说明
  - [ ] 补充示例文档

---

## 阶段二：所见即所得编辑器（阶段一完成后）

- [ ] Milkdown 集成 + 模式切换 UI
- [ ] 自定义 Node（wiki_term, wiki_formula）
- [ ] 输入【触发自动补全
- [ ] 文件保存 + 外部修改检测

## 阶段三：高级功能（远期）

- [ ] 模板匹配 `{A}` 占位符
- [ ] 全局搜索
- [ ] 词条关系图
- [ ] 导出 PDF
