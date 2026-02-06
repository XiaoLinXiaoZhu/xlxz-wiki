## XLXZ Wiki v3 架构总览与规范（规划稿）

本稿用于定义 v3 目标架构与规范；`reference/xlxz-wiki-v2` 作为历史实现供参考。内容覆盖分层设计、目录结构、数据模型、渲染与索引流程、关键约束、测试策略与里程碑。

### 1. 设计目标与约束

- 可维护：高内聚、低耦合，模块职责清晰；任何模块替换不影响其它层。
- 可扩展：插件/组件/解析工具可独立演进；支持后续新增规则（如引用校验、跨仓库词条）。
- 一致性：v3 初期与 v2 功能与样式保持一致（迁移规范要求），后续在不破坏已有内容的前提下迭代增强。
- 易测：核心逻辑可纯函数化，利于单测；端到端验证索引与渲染一致性。
- 约束：单文件不超过 400 行；优先使用 Vue 组件生成 UI，不在 TS 中直接拼接 DOM；能用 Vue 响应式就不用手动 window 全局状态。

### 2. 分层与模块

- Presentation（展示层，Vue 组件）
  - 组件：`WikiTerm`、`WikiDefinition`、`WikiDefinitionItem`、`WikiFormula`、`WikiHoverCard`、`WikiHoverShell`、`WikiTermContent`、`WikiPageHeader`
  - 职责：纯展示与交互，不做繁重数据处理；通过注入的 `wikiState` 取得索引与上下文。

- Application（客户端应用配置/HMR/状态）
  - `client-vue.ts`（建议：拆分为 `client/index.ts` 与 `client/features/*`）
  - 职责：
    - 加载 `@temp/wiki-index`，建立响应式 `wikiState`
    - 侦听路由、DOM 变化，维护 `currentPageScope`、`currentPagePath`、`inlineDefinitions`
    - 暴露必要的全局入口（如 `showWikiTerm`）但避免滥用 window 变量

- Plugin（VuePress 插件）
  - `plugins/wiki-plugin.ts`
  - 职责：
    - Markdown 渲染阶段将自定义语法转为 Vue 组件（仅输出组件标签，不拼接原生 DOM）
    - 统一 HTML 属性转义
    - Dev 模式监听 md 变更，重建索引，写入 `@temp` 以支持 HMR

- Indexer（索引器）
  - `indexer.ts`
  - 职责：扫描 `docs/` 下所有 md，解析 frontmatter 与正文，生成 `WikiIndex`（terms/formulas/templates/scopes），写入 `@temp/wiki-index.{js,json}`

- Shared（工具与类型）
  - `utils/`: `formulaUtils.ts`、`markdownUtils.ts`、`definitionParsing.ts`、`termParsing.ts`、`templateMatch.ts`、`hoverGroup.ts`、`idUtils.ts`、`zIndex.ts`、`debug.ts`、`index.ts`
  - `types.ts` + `types/`：对外类型、内部数据结构统一定义与复用

### 3. 目录结构（建议）

```text
docs/vuepress/
  components/              # 仅负责渲染与交互
  plugins/
    wiki-plugin.ts         # VuePress 插件入口
  client/                  # 建议新增：客户端逻辑模块化
    index.ts               # 原 client-vue.ts 拆分后的入口
    features/
      line-navigate.ts     # 原 client.ts 中行号/ID跳转逻辑
  indexer.ts               # 扫描与索引生成
  styles/                  # 主题化样式
  utils/                   # 纯工具函数（无副作用）
  types.ts                 # 公共类型
```

保留当前物理位置与命名，先文档化再做“等价迁移”（迁移计划中细化）。

### 4. 核心数据模型（简化）

- `WikiIndex`：
  - `terms: Record<string, WikiTerm[]>`
  - `formulas: Record<string, WikiFormula[]>`（按计算值聚合）
  - `templates: Record<string, WikiTemplate[]>`
  - `scopes: string[]`
- `WikiTerm`：`id/term/definition/scope/filePath/lineNumber/definitionType/aliases?/localOnly?`
- `WikiFormula`：`id/expression/calculatedValues/designValues/scope/filePath/lineNumber`
- `WikiTemplate`：`template/templateRawAlias/pattern/templatePattern/placeholders/content/scope/filePath/lineNumber/isTemplate`

约束：
- 统一使用 `idUtils` 生成 ID；所有组件用 `data-wiki-id` 或 `id` 挂载定位。
- 客户端仅消费索引，不在运行时重新解析 md。

### 5. 渲染与索引流程（端到端）

1) 构建/开发启动：插件 `onPrepared` 或 `onWatched` 调用 `WikiIndexer.buildIndex()` 生成索引并写入 `@temp`。
2) Markdown 渲染：`extendsMarkdown` 将 `%% 公式 %%`、`【词条】：定义`、`【词条】` 转换为 `<WikiFormula/>`、`<WikiDefinition/>`、`<WikiTerm/>`。
3) 客户端初始化：`client/index.ts` 加载 `@temp/wiki-index`，建立 `wikiState` 并注入。
4) 组件渲染：组件依据 `wikiState` 与当前 `scope/path` 决策展示（优先级：文件内 > 当前 scope > 全局；模板匹配兜底）。
5) 导航联动：Hover 卡片跳转文件时，优先带 `?id=...`，否则回退 `?line=`，客户端滚动高亮。

### 6. 关键设计决策

- 用 Vue 组件承载所有 UI；TS 仅做数据/解析（避免 TS 直接拼 DOM）。
- 全局状态集中在 `wikiState`（响应式）；避免 `window.*` 分散写入。
- 工具函数纯函数化，无副作用，单测可直接覆盖。
- 索引侧负责“解析与裁决”，组件侧只负责“展示与交互”。
- 严格限制跨层调用：
  - 组件 -> 仅访问 `wikiState` 与工具
  - 插件 -> 仅操作 Markdown Token 与触发索引
  - 索引器 -> 仅读文件，写入 `@temp`

### 7. 性能与可维护性

- 大文件解析：按行扫描，围栏代码块/行内代码先排除再匹配，减少误伤。
- HMR：`@temp/wiki-index` 的 ESM 导出 + 客户端 accept，局部刷新索引。
- CSS：以主题变量为中心（`--vp-*` 与 `--wiki-*`），控制阴影/边框/高亮统一。
- 文件长度：>400 行拆分；优先拆到 `client/features/*` 或 `utils/*`。

### 8. 测试策略

- 单元测试（Jest）：
  - `utils/formulaUtils`：提取 `[计算值]`、`<设计值>`
  - `utils/markdownUtils`：围栏切换、代码块跳过
  - `indexer`：terms/templates/formulas 解析，scope/alias 优先级
- 组件测试（基础渲染快照）：`WikiTerm`、`WikiFormula`（可选）
- 集成测试：
  - 构建后页面包含 `data-wiki-id` 并可通过 `?id=` 精准定位
  - 同文档内联定义优先级覆盖全局定义
- 工具脚本：`test-functionality.js` 将替换为 Jest 等价用例

### 9. 里程碑（与迁移计划一致）

- M1 规范化工具与索引输出（不改 UI 行为）
- M2 客户端状态收敛（拆分 `client` 目录；移除零散 window 赋值）
- M3 渲染细节对齐与样式抽象
- M4 测试补齐（>=80% 关键路径覆盖）
- M5 打包与离线分发（Bun 测试）

### 10. 参考

- v2 源码：`reference/xlxz-wiki-v2`
- VuePress 官方文档（已镜像）：`reference/vuepress-doc`


