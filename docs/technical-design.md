# XLXZ Wiki v4 技术设计方案

## 一、产品定位

### 1.1 一句话描述

一个**游戏策划案专用的 Wiki 文档系统**——用 Markdown 写策划案，自动识别词条引用并提供悬停定义卡片，支持本地运行、git 协作、所见即所得编辑。

### 1.2 解决的核心问题

| 痛点 | 解决方式 |
|------|----------|
| 定义模糊，反复解释 | 词条定义 + 悬停卡片，鼠标悬停即可查看精确定义 |
| 修改一个词要改一百处 | 别名（alias）系统，改一处定义全局生效 |
| 文档冗长，找不到详细说明 | 悬停卡片直接展示详细定义，无需翻阅 |
| 表达不一致，语义模糊 | 别名统一多种表达，引用不存在的词条时提示近似项 |
| 不好编辑 | 所见即所得编辑器 + 输入【自动补全词条 |
| 不好分享 | 可执行程序 + 文档文件夹，双击启动即可查看 |
| 不能协作 | 底层是 .md 文件，git 管理，天然支持多人协作 |

### 1.3 产品形态

**本地 Web 应用**：一个可执行程序，启动后在本地 host Web 服务，浏览器打开使用。

```
用户双击 wiki-server.exe
  → 启动本地 HTTP + WebSocket 服务 (端口 3055)
  → 自动打开浏览器 http://127.0.0.1:3055
  → 浏览器中查看/编辑策划案文档
```

### 1.4 分享与协作方式

```
项目仓库 (git)
├── wiki-server.exe          # 可执行程序（可放在 release 中）
├── dist/                    # 前端资源
├── wiki-docs/               # 策划案 .md 文件（所有人共同编辑）
│   ├── 角色系统/
│   │   ├── 滑移.md          # 词条定义文件
│   │   └── 战斗公式.md
│   ├── 建筑系统/
│   └── ...
└── .gitignore               # 忽略 .wiki-cache/ 等
```

- 策划修改词条定义 → commit + push
- 开发 pull 后启动 wiki-server → 看到最新文档
- 索引文件构建时生成，不入 git，无冲突
- 一个词条一个文件，粒度细，git 冲突概率极低

---

## 二、功能规划与优先级

### 2.1 阶段一：只读渲染 + 后端服务（MVP）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 后端文件服务 | P0 | 读取 .md 文件、提供 REST API |
| 词条索引构建 | P0 | 扫描所有 .md，解析 frontmatter alias/scope，构建内存索引 |
| Markdown 只读渲染 | P0 | markdown-it 渲染 + 自定义语法插件 |
| 词条引用 `【词条】` | P0 | 识别并渲染为可交互元素 |
| 悬停定义卡片 | P0 | 鼠标悬停显示词条定义，支持嵌套悬停 |
| 别名系统 | P0 | frontmatter alias，多个名称指向同一定义 |
| 文件导航侧边栏 | P0 | 树形结构浏览文档 |
| 文件内定义 `【词条】：定义` | P1 | 当前文件内的临时定义 |
| 区域定义 scope | P1 | 多项目词条隔离 |
| 策划公式 `%% %%` | P1 | 计算值/设计值高亮，悬停展示公式 |
| 自动修复/近似匹配 | P1 | 未找到词条时提示相似项 |
| 文件监听 + 实时更新 | P1 | chokidar 监听 .md 变更，WebSocket 推送前端刷新 |
| Bun 打包分发 | P1 | 编译为单文件可执行程序 |

### 2.2 阶段二：所见即所得编辑器

| 功能 | 优先级 | 说明 |
|------|--------|------|
| WYSIWYG 编辑器 | P0 | Milkdown 集成，Markdown 所见即所得 |
| 编辑/只读模式切换 | P0 | 按钮切换，避免误编辑 |
| 输入【自动补全 | P0 | 弹出词条列表，选择后插入引用 |
| 文件保存 | P0 | 编辑后保存回 .md 文件 |
| 外部修改检测 | P1 | 编辑时文件被外部修改，提示用户 |

### 2.3 阶段三：高级功能（远期）

| 功能 | 说明 |
|------|------|
| 模板匹配 `{A}` 占位符 | `【使用{A}替换{B}的定义】` |
| 全局搜索 | 搜索词条、定义内容 |
| 词条关系图 | 可视化词条之间的引用关系 |
| 导出 PDF | 将文档导出为 PDF |

---

## 三、技术选型

### 3.1 总览

| 层 | 选型 | 理由 |
|----|------|------|
| **运行时** | Bun | 原生 TypeScript 支持、极快启动、单文件打包（`bun build --compile`） |
| **后端框架** | Hono | 极轻量（~14KB）、类型安全、Bun 原生支持、内置 WebSocket |
| **前端框架** | Vue 3 + Vite | 团队已有经验、Composition API 适合复杂状态、v2/v3 组件可复用 |
| **状态管理** | Pinia | 替代 v2/v3 中的 `window.*` 全局变量，响应式、类型安全 |
| **只读渲染** | markdown-it | 团队已有经验、自定义语法插件简单直接 |
| **编辑器（阶段二）** | Milkdown | Markdown-first 设计、输出纯 .md、remark 生态、Vue 3 支持 |
| **通信** | REST + WebSocket | REST 处理请求/响应，WebSocket 处理文件变更实时推送 |
| **索引** | 内存 Map + JSON 缓存 | 几百个文件的规模无需数据库，启动扫描 < 500ms |
| **打包** | Bun compile + 外置前端资源 | 轻量（~50MB exe），前端可独立更新 |

### 3.2 为什么放弃 VuePress

v2/v3 中大量时间花在和 VuePress 框架机制做斗争：

- `@temp` 文件机制复杂，HMR 不可靠
- 插件 API 限制多，`extendsMarkdown` 只能输出 HTML 字符串
- 路由系统和我们的需求不匹配（文件路径 → URL 的映射规则固定）
- 构建流程重，每次修改都要等构建

新方案的优势：
- **完全控制渲染管道**：markdown-it → Vue 组件，没有中间层
- **实时预览**：后端直接返回 .md 内容，前端实时渲染，无需构建
- **灵活的路由**：自己定义 URL 结构
- **HMR 简单可靠**：chokidar 监听 → WebSocket 推送 → 前端刷新

### 3.3 编辑器选型详细对比（阶段二参考）

| 维度 | Milkdown | Tiptap | BlockNote | CodeMirror |
|------|----------|--------|-----------|------------|
| 底层 | ProseMirror + remark | ProseMirror | ProseMirror | 独立引擎 |
| Markdown 原生支持 | ⭐⭐⭐⭐⭐ 核心设计 | ⭐⭐⭐ 需扩展 | ⭐⭐⭐ 需扩展 | ⭐⭐ 纯文本 |
| 自定义语法扩展 | ⭐⭐⭐⭐⭐ remark 插件 | ⭐⭐⭐⭐ Node/Mark | ⭐⭐⭐ 受限 | ⭐⭐⭐⭐ 语法高亮 |
| WYSIWYG 体验 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ 源码模式 |
| Vue 3 支持 | ⭐⭐⭐⭐ @milkdown/vue | ⭐⭐⭐⭐⭐ @tiptap/vue-3 | ⭐⭐⭐ React 优先 | ⭐⭐⭐ 需封装 |
| 输出纯 Markdown | ✅ 核心特性 | ⚠️ 需要转换 | ⚠️ 需要转换 | ✅ 本身就是文本 |

**选择 Milkdown 的核心理由**：它的设计理念是「Markdown 是源，WYSIWYG 是视图」，编辑结果直接是 .md 文件，与我们「底层是 .md + git 管理」的架构完美契合。

---

## 四、系统架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Bun 可执行程序                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Hono HTTP Server (端口 3055)                          │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ REST API    │  │  WebSocket   │  │ Static File │  │  │
│  │  │ /api/*      │  │  /ws         │  │ Server      │  │  │
│  │  │             │  │  文件变更推送  │  │ dist/*      │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └─────────────┘  │  │
│  │         │                │                            │  │
│  │  ┌──────┴────────────────┴───────┐                    │  │
│  │  │  WikiIndexer (内存索引)        │                    │  │
│  │  │  - terms: Map<alias, Term[]>  │                    │  │
│  │  │  - formulas: Map<name, F[]>   │                    │  │
│  │  │  - scopes: string[]           │                    │  │
│  │  └──────────────┬────────────────┘                    │  │
│  │                 │                                     │  │
│  │  ┌──────────────┴────────────────┐                    │  │
│  │  │  Chokidar 文件监听             │                    │  │
│  │  │  wiki-docs/**/*.md            │                    │  │
│  │  └───────────────────────────────┘                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP / WebSocket
┌─────────────────────────────────────────────────────────────┐
│  浏览器 (Vue 3 SPA)                                         │
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ 侧边栏      │  │  文档渲染区域      │  │  悬停卡片     │  │
│  │ 文件树导航   │  │                   │  │  WikiHover    │  │
│  │             │  │  只读: markdown-it │  │  Card         │  │
│  │             │  │  编辑: Milkdown    │  │               │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Pinia Store (wikiStore)                               │  │
│  │  - index: WikiIndex (从后端获取)                        │  │
│  │  - currentFile: string                                 │  │
│  │  - currentScope: string                                │  │
│  │  - inlineDefinitions: Map<string, Term>                │  │
│  │  - mode: 'readonly' | 'edit'                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 目录结构

```
xlxz-wiki/
├── server/                      # 后端代码
│   ├── index.ts                 # Hono 服务器入口
│   ├── routes/
│   │   ├── api.ts               # REST API 路由
│   │   └── ws.ts                # WebSocket 处理
│   ├── indexer/
│   │   ├── indexer.ts           # WikiIndexer 主类
│   │   ├── parser.ts            # .md 文件解析（frontmatter + 正文）
│   │   └── types.ts             # 索引数据类型
│   └── watcher.ts               # Chokidar 文件监听
│
├── src/                         # 前端代码
│   ├── App.vue                  # 根组件
│   ├── main.ts                  # 入口
│   ├── router/
│   │   └── index.ts             # Vue Router
│   ├── stores/
│   │   └── wiki.ts              # Pinia store
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.vue      # 侧边栏文件树
│   │   │   ├── Header.vue       # 顶部栏（模式切换等）
│   │   │   └── MainLayout.vue   # 主布局
│   │   ├── viewer/
│   │   │   ├── MarkdownViewer.vue    # 只读渲染容器
│   │   │   ├── WikiTerm.vue          # 词条引用组件
│   │   │   ├── WikiDefinition.vue    # 文件内定义组件
│   │   │   ├── WikiFormula.vue       # 策划公式组件
│   │   │   └── WikiHoverCard.vue     # 悬停卡片组件
│   │   └── editor/              # 阶段二
│   │       └── MarkdownEditor.vue    # Milkdown 编辑器
│   ├── markdown/
│   │   ├── index.ts             # markdown-it 实例配置
│   │   ├── rules/
│   │   │   ├── wiki-term.ts     # 【词条】语法规则
│   │   │   ├── wiki-definition.ts  # 【词条】：定义 语法规则
│   │   │   └── wiki-formula.ts  # %% 公式 %% 语法规则
│   │   └── renderer.ts          # 自定义渲染器
│   ├── services/
│   │   ├── api.ts               # REST API 客户端
│   │   └── websocket.ts         # WebSocket 客户端
│   ├── utils/
│   │   ├── term-resolver.ts     # 词条解析（scope 优先级、近似匹配）
│   │   ├── formula-parser.ts    # 公式解析
│   │   └── escape.ts            # HTML 转义
│   └── styles/
│       ├── main.css             # 全局样式
│       ├── wiki-term.css        # 词条样式
│       └── hover-card.css       # 悬停卡片样式
│
├── shared/                      # 前后端共享代码
│   └── types.ts                 # 共享类型定义（WikiIndex, WikiTerm 等）
│
├── wiki-docs/                   # 用户的策划案文档（示例）
│   ├── 角色系统/
│   │   ├── 滑移.md
│   │   └── 战斗公式.md
│   └── README.md
│
├── dist/                        # 前端构建产物（gitignore）
├── tests/                       # 测试
│   ├── indexer.test.ts
│   ├── parser.test.ts
│   └── term-resolver.test.ts
├── docs/                        # 项目文档
│   ├── target.md
│   └── technical-design.md      # 本文件
│
├── package.json
├── tsconfig.json
├── vite.config.ts               # 前端构建配置
├── bunfig.toml                  # Bun 配置（可选）
└── .gitignore
```

### 4.3 数据流

```
启动流程：
  wiki-server.exe 启动
    → WikiIndexer.buildIndex('wiki-docs/')
      → 扫描所有 .md 文件
      → 解析 frontmatter (alias, scope)
      → 解析正文 (文件内定义, 公式)
      → 构建内存索引 (Map<alias, Term[]>)
    → Hono 服务器启动 (端口 3055)
    → Chokidar 开始监听 wiki-docs/
    → 打开浏览器

查看文档流程：
  用户点击侧边栏文件
    → 前端请求 GET /api/file?path=角色系统/滑移.md
    → 后端读取文件内容，返回原始 Markdown
    → 前端用 markdown-it 渲染
      → 自定义规则识别 【词条】 → 渲染为 <WikiTerm> 组件
      → 自定义规则识别 %% 公式 %% → 渲染为 <WikiFormula> 组件
    → 用户悬停在 【词条】 上
      → WikiTerm 组件从 Pinia store 查询索引
      → 显示 WikiHoverCard（定义内容、来源文件）

文件变更流程：
  外部编辑器修改了 滑移.md
    → Chokidar 检测到变更
    → WikiIndexer.updateFile('角色系统/滑移.md')
    → WebSocket 广播 { type: 'file-changed', path: '角色系统/滑移.md' }
    → 前端收到消息
      → 如果当前正在查看该文件 → 重新请求并渲染
      → 更新 Pinia store 中的索引
```

---

## 五、核心数据模型

### 5.1 共享类型定义 (`shared/types.ts`)

```typescript
/** 词条定义 */
export interface WikiTerm {
  /** 词条的规范名称 */
  term: string
  /** 所有别名（包含 term 本身） */
  aliases: string[]
  /** 定义内容（Markdown 格式） */
  definition: string
  /** 作用域（空字符串表示全局） */
  scope: string
  /** 来源文件路径（相对于 wiki-docs/） */
  filePath: string
  /** 定义类型 */
  definitionType: 'file' | 'inline'
}

/** 策划公式 */
export interface WikiFormula {
  /** 原始表达式 */
  expression: string
  /** 计算值列表（[xxx] 中的 xxx） */
  calculatedValues: string[]
  /** 设计值列表（<xxx> 中的 xxx） */
  designValues: string[]
  /** 作用域 */
  scope: string
  /** 来源文件路径 */
  filePath: string
}

/** 全局索引 */
export interface WikiIndex {
  /** 词条索引：alias → WikiTerm[]（可能有多个来源） */
  terms: Record<string, WikiTerm[]>
  /** 公式索引：计算值名称 → WikiFormula[] */
  formulas: Record<string, WikiFormula[]>
  /** 所有已知的 scope */
  scopes: string[]
  /** 索引构建时间 */
  buildTime: number
}

/** WebSocket 消息 */
export type WsMessage =
  | { type: 'file-changed'; payload: { path: string; action: 'create' | 'update' | 'delete' } }
  | { type: 'index-updated'; payload: WikiIndex }
  | { type: 'refresh-index' }

/** 文件树节点 */
export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
}
```

### 5.2 词条解析优先级

当查询一个词条时，按以下优先级返回定义：

```
1. 文件内定义（当前文件中 【词条】：定义 的内容）
2. 当前 scope 的区域定义（frontmatter scope 匹配）
3. 全局定义（scope 为空的定义）
4. 其他 scope 的定义（不主动显示，但可通过 【scope/词条】 显式引用）
```

悬停卡片中，按优先级从高到低排列所有匹配的定义，每个定义标注来源文件。

---

## 六、API 设计

### 6.1 REST API

```
GET  /api/index
  → 返回完整的 WikiIndex JSON

GET  /api/file?path=角色系统/滑移.md
  → 返回文件的原始 Markdown 内容
  → 响应头包含 Last-Modified

POST /api/file?path=角色系统/滑移.md
  → Body: { content: "新的 Markdown 内容" }
  → 写入文件，触发索引更新
  → 返回 { success: true }

GET  /api/files
  → 返回文件树结构 FileTreeNode[]

GET  /api/search?q=滑移
  → 搜索词条，返回匹配的 WikiTerm[]
```

### 6.2 WebSocket (`/ws`)

```
服务器 → 客户端：
  { type: "file-changed", payload: { path: "角色系统/滑移.md", action: "update" } }
  { type: "index-updated", payload: { /* WikiIndex */ } }

客户端 → 服务器：
  { type: "refresh-index" }  // 请求重建索引
```

---

## 七、关键设计决策

### 7.1 前端渲染策略：markdown-it → Vue 组件

**问题**：markdown-it 输出的是 HTML 字符串，但我们需要 Vue 组件（WikiTerm、WikiHoverCard）来处理交互。

**方案**：markdown-it 输出包含自定义标签的 HTML，然后用 Vue 的 `v-html` + 动态组件挂载。

```
Markdown 原文:
  玩家【滑移】结束后，会产生冲击

markdown-it 输出:
  <p>玩家<wiki-term data-term="滑移"></wiki-term>结束后，会产生冲击</p>

Vue 处理:
  MarkdownViewer 组件接收 HTML 字符串
  → 使用 Vue 的 compile 或 h() 将 <wiki-term> 映射为 WikiTerm 组件
  → WikiTerm 组件处理悬停交互
```

具体实现方式：使用 Vue 3 的动态组件编译能力，将 markdown-it 输出的 HTML 作为 Vue 模板编译渲染，这样 `<wiki-term>` 等自定义标签会自动映射到对应的 Vue 组件。

### 7.2 悬停卡片的定位与层级

复用 v2/v3 的设计：
- 悬停卡片使用 `position: fixed`，根据触发元素的位置计算
- 支持嵌套悬停（卡片内的词条引用可以继续悬停）
- 使用递增的 z-index 管理层级
- 鼠标离开时延迟关闭（避免移动到卡片过程中消失）

### 7.3 索引的增量更新

```
文件变更时：
  1. 从索引中移除该文件的所有条目
  2. 重新解析该文件
  3. 将新条目加入索引
  4. 通过 WebSocket 推送更新后的索引
```

不做 diff，直接全量替换该文件的条目。对于几百个文件的规模，这个操作是毫秒级的。

### 7.4 阶段二编辑器的架构预留

阶段一的设计中，以下部分是为阶段二预留的：

1. **后端 `POST /api/file` 接口**：阶段一就实现，阶段二直接使用
2. **Pinia store 的 `mode` 状态**：`'readonly' | 'edit'`，阶段一固定为 `'readonly'`
3. **词条索引查询逻辑**：封装在 `term-resolver.ts` 中，阶段二的自动补全直接调用
4. **组件结构**：`MarkdownViewer.vue` 和未来的 `MarkdownEditor.vue` 并列，通过 `mode` 切换

---

## 八、开发规范

### 8.1 代码规范

- 使用 TypeScript 严格模式
- 单文件不超过 400 行
- 前后端共享类型定义放在 `shared/` 目录
- 纯逻辑函数（解析、匹配）不依赖任何框架，方便测试
- Vue 组件只负责渲染和交互，不做数据处理

### 8.2 测试策略

- **单元测试**（Bun test 或 Vitest）：
  - `server/indexer/parser.ts`：frontmatter 解析、正文解析
  - `server/indexer/indexer.ts`：索引构建、增量更新
  - `src/utils/term-resolver.ts`：scope 优先级、近似匹配
  - `src/markdown/rules/*.ts`：自定义语法规则
- **集成测试**：
  - 启动服务器 → 请求 API → 验证响应
  - 修改文件 → 验证 WebSocket 推送 → 验证索引更新

### 8.3 文件夹规范

- `server/`：后端代码
- `src/`：前端代码
- `shared/`：前后端共享的类型和工具
- `wiki-docs/`：用户的策划案文档（示例 + 测试用）
- `tests/`：测试代码
- `docs/`：项目自身的文档（目标、设计、进度等）
- `dist/`：前端构建产物（gitignore）

---

## 九、开发计划

### 阶段一：只读渲染 + 后端服务

```
Week 1: 基础搭建
├── Day 1: 项目初始化（package.json, tsconfig, vite.config）
├── Day 2: 后端 Hono 服务器 + 静态文件服务 + REST API 骨架
├── Day 3: WikiIndexer 实现（复用 v2/v3 的解析逻辑）
├── Day 4: 前端 Vue 3 项目搭建 + 路由 + 布局组件
├── Day 5: 侧边栏文件树 + 文件内容加载

Week 2: 核心功能
├── Day 1: markdown-it 自定义语法规则（【词条】、【词条】：定义）
├── Day 2: MarkdownViewer 组件（HTML → Vue 动态组件）
├── Day 3: WikiTerm + WikiHoverCard 组件
├── Day 4: 策划公式语法 + WikiFormula 组件
├── Day 5: scope 优先级 + 近似匹配

Week 3: 集成与打包
├── Day 1: Chokidar 文件监听 + WebSocket 推送
├── Day 2: 前端 WebSocket 客户端 + 实时更新
├── Day 3: Bun compile 打包 + 启动脚本
├── Day 4: 测试 + Bug 修复
├── Day 5: 文档完善
```

### 阶段二：所见即所得编辑器（阶段一完成后）

```
Week 4-5: Milkdown 集成
├── 基础编辑器搭建 + 模式切换 UI
├── 自定义 Node（wiki_term, wiki_formula）
├── 输入【触发自动补全
├── 文件保存 + 外部修改检测
```

### 验收标准

**阶段一 MVP**：
1. ✅ 双击 exe（或 `bun run server/index.ts`）启动服务，浏览器打开可用
2. ✅ 侧边栏显示 wiki-docs/ 下的文件树，点击切换文档
3. ✅ Markdown 正确渲染，【词条】显示为可交互元素
4. ✅ 悬停在【词条】上显示定义卡片，包含来源文件标注
5. ✅ 别名系统工作：不同名称指向同一定义
6. ✅ 外部修改 .md 文件后，页面自动刷新

**阶段二**：
1. ✅ 点击「编辑」按钮进入所见即所得模式
2. ✅ 输入【自动弹出词条补全列表
3. ✅ 保存后 .md 文件内容正确（纯 Markdown）
4. ✅ 编辑/只读切换无数据丢失
