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

- [x] **Day 4: 策划公式语法 + WikiFormula 组件增强**
  - [x] `src/components/viewer/WikiFormulaValue.vue` — 公式内计算值/设计值可交互组件（悬停查看定义）
  - [x] `src/components/viewer/WikiFormula.vue` — 重构为使用 WikiFormulaValue 子组件（替代纯 HTML 高亮）
  - [x] `src/components/viewer/WikiHoverCard.vue` — 增强：词条定义 + 关联公式表达式同时展示
  - [x] 公式内计算值/设计值可悬停查看定义（有定义时显示虚线下划线）
  - [x] 公式与词条索引联动（HoverCard 同时查询 terms 和 formulas 索引）
  - [x] `wiki-docs/角色系统/战斗公式.md` — 新增多公式测试文档

- [x] **Day 5: scope 优先级 + 近似匹配**
  - [x] `src/utils/term-resolver.ts` — scope 优先级解析（文件内定义 > 当前 scope > 全局 > 其他 scope）+ scope 过滤 + 显式 scope 引用（【scope/词条】）
  - [x] 近似匹配（Levenshtein 编辑距离）— 未找到词条时提示相似项（最多 5 个，距离 ≤ 3）
  - [x] `src/stores/wiki.ts` — loadFile 时自动从 frontmatter 提取 scope
  - [x] `src/components/viewer/WikiTerm.vue` — 集成 resolveTerm，支持 scope/词条 语法
  - [x] `src/components/viewer/WikiHoverCard.vue` — 集成 resolveTerm + filterByScope，显示近似匹配建议
  - [x] `src/components/viewer/WikiFormulaValue.vue` — 集成 resolveTerm

### Week 3: 集成与打包

- [x] **Day 1: 前端 WebSocket 客户端 + 实时更新**
  - [x] `src/services/websocket.ts` — WebSocket 客户端（自动重连，最多 10 次）
  - [x] `src/App.vue` — 挂载时初始化 WebSocket 连接
  - [x] 文件变更时自动刷新当前文档 + 更新索引（`file-changed` + `index-updated` 消息处理）

- [x] **Day 2: Chokidar 文件监听完善**
  - [x] 新增/删除文件时更新侧边栏文件树（WebSocket `file-changed` create/delete → `fetchFileTree()`）
  - [ ] 编辑中文件被外部修改时提示（阶段二编辑器功能，暂不实现）

- [x] **Day 3: Bun compile 打包**
  - [x] `server/index.ts` — 路径解析兼容编译模式（`IS_COMPILED` 检测，`process.cwd()` 回退）
  - [x] `package.json` — 添加 `compile` 和 `release` 脚本
  - [x] `bun build --compile --target=bun-windows-x64` 生成可执行程序（~108MB）
  - [x] 启动脚本（自动打开浏览器，已在 Day 2 Week 1 实现）
  - [x] `.gitignore` — 忽略 `*.exe`

- [x] **Day 4: 测试 + Bug 修复**
  - [x] `tests/parser.test.ts` — frontmatter 解析（alias/scope）、文件内定义、策划公式、代码块跳过（14 个测试）
  - [x] `tests/term-resolver.test.ts` — scope 优先级排序、scope 过滤、显式 scope 引用、近似匹配、编辑距离（15 个测试）
  - [ ] `tests/indexer.test.ts` — 索引构建、增量更新（可后续补充）

- [x] **Day 5: 文档完善**
  - [x] `README.md` — 使用说明（功能特性、快速开始、文档语法、项目结构、技术栈）
  - [x] `wiki-docs/角色系统/战斗公式.md` — 多公式示例文档（伤害/实际伤害/防御减伤比例）

---

## 阶段二：所见即所得编辑器

### Week 4: Milkdown 集成

- [x] **Day 1-2: Milkdown 编辑器基础搭建**
  - [x] `@milkdown/kit@7.18.0` + `@milkdown/vue@7.18.0` 安装
  - [x] `src/components/editor/MilkdownEditor.vue` — Milkdown 编辑器核心组件（commonmark + history + listener + clipboard）
  - [x] `src/components/editor/MarkdownEditor.vue` — 编辑器容器（MilkdownProvider 包裹）
  - [x] `src/views/DocView.vue` — 编辑/只读模式切换（v-if 切换 MarkdownViewer / MarkdownEditor）
  - [x] `src/components/layout/Header.vue` — 编辑/保存/取消按钮
  - [x] `src/stores/wiki.ts` — 新增 editingContent、saveRequestId、requestSave() 用于组件通信

- [x] **Day 3: Wiki 语法实时高亮（Decoration 方案）**
  - [x] `src/editor/wiki-nodes.ts` — ProseMirror Decoration 插件，实时扫描文本并高亮
  - [x] `【词条】` → 蓝色高亮、`【词条】：定义` → 紫色高亮、`%% 公式 %%` → 橙色高亮
  - [x] 文本完全可编辑，无 IME 输入问题（放弃 atom 节点方案，改用纯 Decoration）

- [x] **Day 4: 文件保存 + Bug 修复**
  - [x] POST `/api/file` 保存（Ctrl+S 快捷键 + Header 保存按钮）
  - [x] 保存时自动保留 frontmatter + 反转义 Milkdown 添加的反斜杠（`\[` → `[`、`\*` → `*` 等）
  - [x] 修复保存后顶部文本重复问题（stripFrontmatter 防护）

- [ ] **待完成: 输入【触发自动补全**
- [ ] **待完成: 编辑中文件被外部修改时提示**

## 阶段三：高级功能（远期）

- [ ] 模板匹配 `{A}` 占位符
- [ ] 全局搜索
- [ ] 词条关系图
- [ ] 导出 PDF
