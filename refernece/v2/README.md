## 离线分享（Bun 一体化可执行文件）

无需让对方安装 Node.js。使用 Bun 将静态站点打包成单个可执行文件：

1) 安装 Bun（仅在打包机操作）
```
powershell -Command "iwr bun.sh/install.ps1 -UseBasicParsing | iex"
```

2) 构建站点
```
pnpm run build
```

3) 打包为可执行文件（Windows 示例）
```
bun build bun-server.ts --compile --outfile wiki-offline.exe
```

4) 分享给对方的内容
- 可执行文件：`wiki-offline.exe`
- 目录：`docs/.vuepress/dist`（与 exe 放同一层，或打包到 exe 旁的子目录）

5) 对方使用
- 双击 `wiki-offline.exe`，浏览器自动打开 `http://127.0.0.1:3055/`
- 无需安装 Node.js 或任何依赖

# XLXZ Wiki v2

一个专为游戏策划案文档编写而设计的Wiki系统，基于VuePress构建，支持词条定义、悬停卡片、策划公式等特性。

## 功能特性

### 🎯 词条系统
- **词条定义**：使用 `【词条名】：定义内容` 语法定义词条
- **词条引用**：使用 `【词条名】` 引用已定义的词条
- **悬停卡片**：鼠标悬停在词条上显示详细定义
- **跨文件引用**：支持在不同文件间引用词条

### 📊 策划公式
- **公式语法**：使用 `%% 公式内容 %%` 定义策划公式
- **智能高亮**：自动高亮计算值 `[计算值]` 和设计值 `<设计值>`
- **公式悬停**：支持在公式中的值上悬停查看定义

### 🎨 模板系统
- **模板占位符**：使用 `{占位符}` 定义可替换的内容
- **嵌套支持**：支持在模板中嵌套词条引用

### 🔧 高级功能
- **区域定义**：通过frontmatter支持多项目词条隔离
- **文件内定义**：支持仅在当前文件有效的词条定义
- **智能提示**：未找到词条时提供相似词条建议

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

**Windows用户**：
```bash
./compile_editor.bat
```

**其他平台**：
```bash
pnpm run dev
```

### 构建生产版本

```bash
pnpm run build
```

## 使用语法

### 1. 定义词条

```markdown
【角色】：玩家在游戏中控制的虚拟人物，拥有等级、属性、技能等特性。
【NPC】：非玩家控制的角色，包括商人、任务发布者、敌对单位等。
```

### 2. 引用词条

```markdown
当【角色】与【NPC】交互时，会触发对话系统。
```

### 3. 策划公式

```markdown
【攻击力】：角色的基础攻击属性
【防御力】：角色的防御属性

%% [最终伤害] = <基础攻击力> * <技能倍率> * (1 - <防御力> / (<防御力> + 100)) %%
```

### 4. 模板语法

```markdown
使用 {技能名称} 的冷却时间为 {冷却秒数} 秒。
```

### 5. 区域定义

```markdown
---
scope: game1
alias: 
  - 角色
  - 玩家角色
---

【角色】：在游戏1中，角色具有独特的技能树系统。
```

## 项目结构

```
xlxz-wiki-v2/
├── docs/                 # VuePress文档目录
│   ├── .vuepress/        # VuePress配置
│   │   ├── config.ts     # 主配置文件
│   │   ├── simple-plugin.js    # Wiki插件
│   │   ├── simple-client.js    # 客户端逻辑
│   │   └── styles/       # 样式文件
│   ├── guide/            # 使用指南
│   ├── examples/         # 示例文档
│   └── README.md         # 首页
├── note/                 # 项目开发文档
├── tests/                # 测试文件
└── package.json          # 项目配置
```

## 示例文档

查看 `docs/examples/` 目录下的示例文档，了解如何使用各种功能：

- [游戏设计示例](docs/examples/game-design.md) - 完整的游戏策划案示例

## 开发指南

### 技术栈
- **VuePress 2.x** - 静态网站生成器
- **Vue 3** - 前端框架  
- **TypeScript** - 类型检查
- **Markdown-it** - Markdown解析器
- **pnpm** - 包管理工具

### 插件架构
Wiki功能通过自定义VuePress插件实现：
- `simple-plugin.js` - 插件主体，处理Markdown渲染
- `simple-client.js` - 客户端交互逻辑
- `wiki.css` - 样式定义

### 自定义样式
可以通过修改 `docs/.vuepress/styles/wiki.css` 来自定义外观：

```css
/* 自定义词条颜色 */
.wiki-term-reference {
  color: #your-color;
  border-bottom-color: #your-color;
}

/* 自定义悬停卡片样式 */
.wiki-hover-card {
  background: #your-background;
  border-color: #your-border;
}
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交更改
4. 发起 Pull Request

## 许可证

MIT License

## 支持

如有问题或建议，请提交 Issue 或 Pull Request。
