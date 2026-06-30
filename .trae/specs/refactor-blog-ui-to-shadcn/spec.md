# 博客 UI 重构为 Shadcn UI 风格 Spec

> 变更 ID：`refactor-blog-ui-to-shadcn`
> 仓库：Hexo + matery 主题博客（`themes/matery/`），部署目标 `https://evil0618.github.io/blog/`（子路径 `/blog/`）

## Why

现有 matery 主题采用 Material Design 重装饰风格：彩色渐变 banner、圆角大阴影卡片、Materialize CSS + jQuery 全家桶、樱花/星星/彩带等视觉特效、首页强制全屏封面轮播。这与目标“极简、现代、克制”的 Shadcn UI 文档站美学冲突，且大量装饰性 JS/CSS 拖慢首屏、影响长文阅读舒适度。需要在**保留 Hexo 静态生成能力**的前提下，把整套视觉与结构改造成 Shadcn 风格，并确保 GitHub Pages 子路径部署零 404。

## What Changes

### 视觉与设计系统
- 引入 **TailwindCSS（CDN play 模式 + 本地 CSS 变量层）**，注入 Shadcn 语义化 CSS 变量（`--background`/`--foreground`/`--border`/`--muted`/`--primary` 等），用语义 token 替代 Materialize 颜色类。
- 新增 **Dark/Light 双主题**，基于 `prefers-color-scheme` + 手动 Toggle + localStorage 持久化；切换平滑过渡（`color-scheme` + `transition: background-color, color`）。
- 中性色基底改用 **Zinc** 色阶；强调色仅用于链接 hover、主按钮、当前导航态。
- 排版改用 **Inter**（或 Geist）无衬线字体，标题字重克制（medium/semibold），正文行高 1.75。
- 统一 **1px 细边框 + `rounded-lg`**，阴影仅在悬浮时微弱加深（`hover:shadow-sm`）。

### 布局与组件 **BREAKING**
- **移除** Materialize CSS、Materialize JS、jQuery 依赖链（保留极少量必要交互的轻量原生 JS）。
- **移除** 首页全屏 banner 轮播、背景视频、樱花/星星/彩带/爱心点击/动态彩带特效。
- 顶部改为**极简吸顶导航栏**（Logo + 主导航 + GitHub 图标 + 主题 Toggle），`border-b` + 毛玻璃背景。
- 底部改为**极简页脚**（版权 + Hexo + RSS + 主题切换文案），去除访客统计图标堆叠。
- 首页改为**居中单列文章列表**（max-w-3xl），文章以轻边框卡片呈现（标题 / 日期 / 摘要 / 标签），去阴影。
- 文章详情页限宽 `max-w-3xl`；顶部标题 + 元信息；正文美化：**代码块终端风格**（暗底、细边框、Mac 红绿灯按钮）、**引用块左侧细边框**；底部加“返回顶部”悬浮按钮 + 上下篇导航。
- 移动端：隐藏侧栏，提供**抽屉式菜单**；表格 `overflow-x-auto` 横向滚动。

### 部署与路径
- 保持 Hexo `hexo generate` 纯 SSG 输出，所有页面预渲染 HTML，无运行时 API。
- **子路径路由**：`_config.yml` 已设 `root: /blog/`、`url: https://evil0618.github.io/blog`。所有静态资源与内部链接统一通过 Hexo `url_for()` / `config.root` 生成相对前缀，**禁止硬编码绝对路径 `/css/...`**（必须 `url_for('/css/...')`）。
- 移除 `jsDelivr.url` 加速前缀的可选项保留，但默认关闭以避免子路径资源错位。

## Impact
- 受影响配置：`_config.yml`、`themes/matery/_config.yml`（关闭特效、调整导航/页脚/代码块配置）。
- 受影响代码（EJS 布局）：
  - `themes/matery/layout/layout.ejs`（精简脚本加载链）
  - `themes/matery/layout/_partial/head.ejs`（引入 Tailwind + 字体 + CSS 变量 + `<meta name="theme-color">`）
  - `themes/matery/layout/_partial/header.ejs` + `navigation.ejs`（重写为吸顶极简导航 + 主题 Toggle）
  - `themes/matery/layout/_partial/footer.ejs`（极简页脚）
  - `themes/matery/layout/index.ejs`（单列文章列表）
  - `themes/matery/layout/_partial/post-detail.ejs` + `post.ejs`（限宽 + 终端代码块）
  - `themes/matery/layout/_partial/codeblock.ejs`（终端样式 + 红绿灯）
  - `themes/matery/layout/_partial/prev-next.ejs` + `back-top.ejs`（上下篇 + 返回顶部）
  - `themes/matery/layout/_partial/mobile-nav.ejs`（抽屉菜单）
- 受影响样式：`themes/matery/source/css/matery.css`、`post.css`、`dark.css`、`my.css`（重构为 Shadcn 变量体系），新增 `shadcn-theme.css`。
- **不受影响**：文章 Markdown 源文件（`source/`）、Hexo 生成器插件、`hexo-deployer-git` 部署链路。

## UI 略图（重构后）

### 首页（文章列表）
```
┌──────────────────────────────────────────────────────────────────┐
│  ▣ Logo   首页   标签   分类   关于            [GitHub] [☀/🌙]    │ ← 吸顶 border-b 毛玻璃
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                       Site Title (h1, 中等字重)                  │
│                       subtitle / 描述一行                        │
│                                                                  │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ Article Title One                              2024-06-30  │ │ ← 卡片 border rounded-lg
│   │ 摘要文本一到两行，行高 1.75，留白克制……                    │ │   hover:shadow-sm
│   │ ─────────────────────────────────────────────────────────  │ │
│   │ #tag1   #tag2   #tag3                       约 5 分钟阅读  │ │
│   └────────────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │ Article Title Two                              2024-06-28  │ │
│   │ 摘要文本……                                                │ │
│   │ #tag1   #tag2                              约 3 分钟阅读   │ │
│   └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                      ←  1  2  3  4  →                            │ ← 极简分页
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  © 2024  Author · Powered by Hexo · RSS                          │ ← 极简页脚 border-t
└──────────────────────────────────────────────────────────────────┘
```

### 文章详情页
```
┌──────────────────────────────────────────────────────────────────┐
│  ▣ Logo   首页   标签   分类   关于            [GitHub] [☀/🌙]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ┌──────────────────────────────────────┐            │
│              │                                      │            │ ← max-w-3xl 居中
│              │   Article Title One  (h1)            │            │
│              │   2024-06-30 · 约 5 分钟 · #tag1     │            │ ← 元信息 muted-foreground
│              │   ─────────────────────────────────  │            │
│              │                                      │            │
│              │   正文段落，行高 1.75，留白舒适……   │            │
│              │                                      │            │
│              │   ▎ 引用块：左侧 1px 细边框 + 斜体  │            │ ← blockquote border-l-2
│              │                                      │            │
│              │   ┌────────────────────────────────┐ │            │ ← 终端风格代码块
│              │   │ ● ● ●                 bash     │ │            │   暗底 + 细边框
│              │   │ $ npm install hexo             │ │            │   + Mac 红绿灯
│              │   └────────────────────────────────┘ │            │
│              │                                      │            │
│              └──────────────────────────────────────┘            │
│                                                                  │
│              ┌──────────────────────────────────────┐            │
│              │  ← 上一篇：Prev Title                 │            │ ← 上下篇导航
│              │              下一篇：Next Title  →    │            │
│              └──────────────────────────────────────┘            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                       [ ↑ ]      │ ← 悬浮返回顶部
│  © 2024  Author · Powered by Hexo · RSS                          │
└──────────────────────────────────────────────────────────────────┘
```

### 移动端
```
┌────────────────────────┐
│  ▣ Logo        [☰] [☀]  │ ← 抽屉触发
├────────────────────────┤
│  ┌──────────────────┐  │
│  │ Article Title    │  │ ← 单列卡片
│  │ 2024-06-30       │  │
│  │ 摘要……           │  │
│  └──────────────────┘  │
│        ...             │
├────────────────────────┤
│  © 2024 · Hexo · RSS   │
└────────────────────────┘
   抽屉滑出：
   ┌─────────────┐
   │ 首页        │
   │ 标签        │
   │ 分类        │
   │ 关于        │
   │ ─────────── │
   │ GitHub      │
   └─────────────┘
```

## 配色方案（Shadcn · Zinc 中性色）

### Light 模式（默认）
| Token | 值 | 用途 |
|---|---|---|
| `--background` | `hsl(0 0% 100%)` / `#ffffff` | 页面背景 |
| `--foreground` | `hsl(240 10% 3.9%)` / `#09090b` | 正文文字 |
| `--muted` | `hsl(240 4.8% 95.9%)` / `#f4f4f5` | 次要背景/分页 hover |
| `--muted-foreground` | `hsl(240 3.8% 46.1%)` / `#71717a` | 元信息、摘要 |
| `--border` | `hsl(240 5.9% 90%)` / `#e4e4e7` | 1px 细边框 |
| `--primary` | `hsl(240 5.9% 10%)` / `#18181b` | 主按钮/当前导航 |
| `--primary-foreground` | `hsl(0 0% 98%)` / `#fafafa` | 主按钮文字 |
| `--accent` | `hsl(240 4.8% 95.9%)` | 链接 hover 背景 |
| `--ring` | `hsl(240 5.9% 10%)` | focus 环 |

### Dark 模式
| Token | 值 | 用途 |
|---|---|---|
| `--background` | `hsl(240 10% 3.9%)` / `#09090b` | 页面背景 |
| `--foreground` | `hsl(0 0% 98%)` / `#fafafa` | 正文文字 |
| `--muted` | `hsl(240 3.7% 15.9%)` / `#27272a` | 次要背景 |
| `--muted-foreground` | `hsl(240 5% 64.9%)` / `#a1a1aa` | 元信息、摘要 |
| `--border` | `hsl(240 3.7% 15.9%)` / `#27272a` | 1px 细边框 |
| `--primary` | `hsl(0 0% 98%)` / `#fafafa` | 主按钮/当前导航 |
| `--primary-foreground` | `hsl(240 5.9% 10%)` / `#18181b` | 主按钮文字 |
| `--accent` | `hsl(240 3.7% 15.9%)` | 链接 hover 背景 |
| `--ring` | `hsl(240 4.9% 83.9%)` | focus 环 |

> 终端代码块统一：`background: #09090b`、`border: 1px solid #27272a`、文字 `#fafafa`，红绿灯 `#ff5f56 / #ffbd2e / #27c93f`。

## ADDED Requirements

### Requirement: Shadcn 设计系统层
系统 SHALL 提供一套基于 CSS 变量的 Shadcn 语义 token（`--background`/`--foreground`/`--border`/`--muted`/`--primary` 等），并支持 Light/Dark 双主题。

#### Scenario: 主题切换
- **WHEN** 用户点击导航栏主题 Toggle
- **THEN** `<html>` 添加/移除 `dark` class，所有语义 token 同步切换，选择持久化到 localStorage，无闪烁（FOUC）。

#### Scenario: 首次访问
- **WHEN** 访客首次打开站点且未设置过主题
- **THEN** 系统跟随 `prefers-color-scheme`，并设置 `<meta name="theme-color">` 匹配当前背景。

### Requirement: 极简吸顶导航栏
系统 SHALL 提供吸顶极简导航栏，含 Logo、主导航、GitHub 图标链接、主题 Toggle。

#### Scenario: 滚动悬浮
- **WHEN** 页面滚动
- **THEN** 导航栏始终吸顶，带 `border-b` + 半透明毛玻璃背景（`backdrop-blur`），当前页导航项高亮（`text-foreground`，其余 `text-muted-foreground`）。

### Requirement: 终端风格代码块
系统 SHALL 将 Markdown 代码块渲染为终端风格：暗色背景、1px 细边框、Mac 红绿灯按钮、语言标签、复制按钮。

#### Scenario: 渲染代码块
- **WHEN** 文章正文含 ` ```bash ` 代码块
- **THEN** 渲染为带红绿灯的暗色终端块，显示语言标签 `bash`，hover 显示复制按钮，复制成功有 `aria-live` 提示。

### Requirement: 移动端抽屉菜单
系统 SHALL 在移动端（< 768px）隐藏水平导航，提供汉堡按钮触发的抽屉菜单。

#### Scenario: 移动端打开菜单
- **WHEN** 移动端用户点击汉堡按钮
- **THEN** 抽屉从右侧滑入，含主导航 + GitHub 链接，`overscroll-behavior: contain`，点击遮罩或链接后关闭。

### Requirement: 返回顶部悬浮按钮
系统 SHALL 在文章详情页提供悬浮“返回顶部”按钮。

#### Scenario: 滚动后显示
- **WHEN** 用户向下滚动超过一屏
- **THEN** 右下角出现返回顶部按钮（`aria-label="返回顶部"`），点击平滑滚动回顶部。

## MODIFIED Requirements

### Requirement: 首页文章列表
原 Material Design 三列卡片网格 + 全屏 banner，改为居中单列（`max-w-3xl`）轻边框卡片列表，每项含标题、日期、摘要、标签，去除封面图与重阴影，去除首页全屏轮播 banner。

#### Scenario: 渲染文章列表
- **WHEN** 访问首页
- **THEN** 文章以单列卡片垂直排列，卡片 `border rounded-lg`，hover 时 `shadow-sm` 微弱加深，分页为极简数字/箭头样式。

### Requirement: 文章详情页阅读区
原 Materialize card 全宽布局，改为 `max-w-3xl` 居中阅读区，顶部标题 + 元信息（日期/阅读时长/标签），正文 Markdown 美化（代码块终端风格、引用块左侧细边框、标题层级），底部上下篇导航。

#### Scenario: 阅读长文
- **WHEN** 打开文章详情
- **THEN** 正文限宽 `max-w-3xl` 居中，行高 1.75，标题层级清晰，代码块/引用块按上述风格渲染。

### Requirement: 全局布局结构
原 layout 依赖 Materialize + jQuery + 多特效脚本，改为仅加载 Tailwind + 主题 CSS + 极少量原生 JS；导航吸顶、页脚极简。

#### Scenario: 加载页面
- **WHEN** 任意页面加载
- **THEN** 不再加载 Materialize CSS/JS、jQuery、樱花/星星/彩带/爱心特效脚本，首屏无彩色渐变 banner。

## REMOVED Requirements

### Requirement: 首页全屏 Banner 轮播
**Reason**: 与极简 Shadcn 风格冲突，拖慢首屏，子路径部署易资源错位。
**Migration**: 首页改为标题 + 单列文章列表，banner 图片资源保留但不强制展示。

### Requirement: 装饰特效（樱花/星星/彩带/爱心点击/背景 canvas-nest）
**Reason**: 重装饰、非内容性、影响性能与阅读专注。
**Migration**: 在 `themes/matery/_config.yml` 中将 `sakura`/`mouseStar`/`snowdown`/`clicklove`/`canvas_nest`/`ribbon`/`ribbon_dynamic` 全部设为 `enable: false`，并从 `layout.ejs` 移除对应加载块。

### Requirement: Materialize CSS / JS 与 jQuery 依赖
**Reason**: 重框架与目标轻量原生方案冲突，且 Materialize 在子路径下样式覆盖难以维护。
**Migration**: 用 Tailwind + Shadcn CSS 变量重写所有 Materialize 类名（`card`/`chip`/`row`/`col` 等），交互用原生 JS（主题切换、抽屉、返回顶部、代码复制）替代 jQuery。

## GitHub Pages 部署约束（硬性）

- 所有内部链接必须经 `url_for()` 生成（Hexo 会自动加 `config.root` 前缀 `/blog/`）。
- 所有静态资源（CSS/JS/字体/图片）路径必须经 `url_for()` 或 `config.root` 前缀，**禁止裸 `/css/...`**。
- 字体优先使用本地或同源加载；若用 Google Fonts 需配 `<link rel="preconnect">` 并保证 SSG 可用。
- `hexo generate` 产出纯静态 HTML/CSS/JS，部署到 `gh-pages` 分支后 `https://evil0618.github.io/blog/` 可直接访问，无 404。
- 保留 `hexo-deployer-git` 部署链路不变。
