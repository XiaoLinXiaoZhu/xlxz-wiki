## XLXZ Wiki v3 迁移计划（等价迁移 + 渐进重构）

目标：在不改变对外功能与样式的前提下，将 v2 中的成熟做法迁移到 v3 目标架构中，随后在不破坏既有内容的前提下进行增强与优化。

### A. 基线核对（不改动功能）

- 功能清单（对照）：
  - 词条系统：内联定义、别名（frontmatter alias）、跨文件引用、作用域优先级
  - 公式系统：`%%`、`[计算值]`、`<设计值>`、悬停展示、相关公式
  - 模板系统：`{}` 占位、模板匹配、模板实例/原始模板并列展示
  - 页面导航：Hover 卡片文件跳转支持 `?id=` 与 `?line=`；行号/ID滚动与高亮
  - 开发体验：HMR 下索引自动重建；`@temp/wiki-index` 变更热接入
  - 离线分发：Bun 轻量服务

### B. 任务拆分与执行步骤

1) 工具与类型统一（低风险）
   - [ ] 审核 `docs/vuepress/utils/*`，移除未使用导出，保证纯函数
   - [ ] 明确 `types.ts` 与 `types/` 的对外契约（组件、索引、客户端共享）
   - [ ] 为 `idUtils`/`markdownUtils`/`formulaUtils` 增加样例与单测

2) Indexer 抽象与输出稳定
   - [ ] 校验 `indexer.ts` terms/templates/formulas 解析一致性
   - [ ] 补充“模板匹配 Regex 生成”单测，避免转义缺陷
   - [ ] 索引写入 ESM 与 JSON 的双通道保持（构建与 HMR）

3) 客户端状态收敛
   - [ ] 新建 `docs/vuepress/client/`，将 `client-vue.ts` 迁移为 `client/index.ts`
   - [ ] 新建 `client/features/line-navigate.ts`，迁移原 `client.ts` 的行号/ID滚动逻辑
   - [ ] 保留向后兼容导出（短期内保留旧文件，导向新实现）

4) 插件渲染规则固化
   - [ ] `extendsMarkdown` 仅输出组件标签；属性统一用转义工具
   - [ ] 代码块/行内代码排除逻辑补充边界用例

5) 组件与样式
   - [ ] 组件不做解析，只消费 `wikiState`
   - [ ] Hover 分组、z-index、定位策略维持现状；抽离常量与主题变量

6) 测试体系
   - [ ] 新建 `tests/`（Jest），迁移 `test-functionality.js` 为等价用例
   - [ ] 单元：utils、indexer（覆盖率集中在提取/转义/优先级）
   - [ ] 集成：构建后通过 `?id=`/`?line=` 验证滚动与高亮

7) 打包与离线
   - [ ] 验证 `bun-server.ts` 在 dist 同级目录运行可访问
   - [ ] `bundle:bun:win` 产物与 dist 配置核对

### C. 验收标准（DoD）

- 构建/开发：能启动、能热更、索引写入生效
- 功能对齐：词条/公式/模板/跳转 与 v2 一致
- 测试：关键路径 >= 80% 覆盖；CI 可运行（后续补）
- 代码规范：新增/迁移文件均通过 ESLint/TS 检查；单文件 < 400 行

### D. 风险与回退

- 模板 Regex 转义缺陷 -> 增强测试用例，保留 JSON 通道回退
- 行号滚动跨主题差异 -> 元素定位策略多路兜底，保守切换
- HMR 临时文件丢失 -> 客户端兜底 fetch JSON；降级提示

### E. 里程碑与工期预估

- M1（0.5 天）：工具与类型核对 + 单测雏形
- M2（1 天）：Indexer 校验与补测
- M3（1 天）：客户端拆分与滚动特性迁移
- M4（0.5 天）：插件转义与边界处理加固
- M5（0.5 天）：端到端验证 + 文档完善

### F. 文档与规范落地

- 本文与 `note/architecture.md` 同步更新；每次变更同步“差异清单”至 `note/`。
- 引用 `reference/vuepress-doc` 查阅 API，避免想当然实现。


