# Checklist

> 变更 ID：`refactor-blog-ui-to-shadcn`
> 验收前逐项核验，通过后勾选。

## 设计系统与主题
- [x] `themes/matery/source/css/shadcn-theme.css` 存在且定义了 Light/Dark 两套语义 token（background/foreground/border/muted/primary/accent/ring），值为 spec.md 配色表中的 Zinc 色阶
- [x] `head.ejs` 引入 Tailwind（darkMode class）、Inter 字体（preconnect + font-display:swap）、`<meta name="theme-color">`
- [x] 防 FOUC 内联脚本在 `<head>` 首屏渲染前为 `<html>` 设置 `dark` class（基于 localStorage / prefers-color-scheme）
- [x] 主题 Toggle 点击可切换 Light/Dark，localStorage 持久化，`theme-color` meta 同步更新，无闪烁（`#theme-toggle` 绑定在 app.js，HTML 源码含按钮 + 防 FOUC 脚本）

## 布局与组件
- [x] 顶部导航栏吸顶（sticky），`border-b` + `backdrop-blur`，含 Logo / 主导航 / GitHub 图标链接 / 主题 Toggle
- [x] 当前页导航项高亮（基于 Hexo `is_*()` 判断），其余项 `text-muted-foreground`（about 页 HTML 验证：`bg-accent text-foreground` 高亮"关于"项）
- [x] 图标按钮与主题 Toggle 有 `aria-label`，交互元素有 `focus-visible:ring`
- [x] 页脚极简（`border-t`）：版权 + Hexo，无访客统计图标堆叠与运行时长脚本
- [x] 移动端（< 768px）隐藏水平导航，汉堡按钮触发右侧抽屉，`overscroll-behavior: contain`，遮罩/链接点击后关闭（`#mobile-overlay` + `#mobile-drawer` + Escape 关闭 + body `overflow-hidden`）

## 首页文章列表
- [x] 首页无全屏 banner 轮播 / 背景视频，改为标题块 + 居中 `max-w-3xl` 单列卡片（index.ejs 验证通过；当前仓库无文章故 public/index.html 暂未生成，但布局源码与测试文章渲染验证通过）
- [x] 文章卡片 `border rounded-lg`，含标题 / 日期 / 摘要 / 标签，无封面图与重阴影，`hover:shadow-sm`
- [x] 分页为极简数字/箭头样式，当前页 `bg-primary text-primary-foreground`

## 文章详情页
- [x] 阅读区限宽 `max-w-3xl` 居中，顶部标题 + 元信息（日期/分类，muted-foreground）
- [x] 代码块终端风格：暗底 `hsl(var(--terminal-bg))` + 1px 细边框 + Mac 红绿灯按钮 + 语言标签 + 复制按钮，复制有 `aria-live` 提示
- [x] 引用块 `border-l-2 pl-4`，正文行高 ~1.75，标题层级清晰
- [x] 表格 `overflow-x-auto` 横向滚动不破坏布局
- [x] 底部上下篇导航卡片（`border rounded-lg`，左右分栏，空态"已是最早/最新"）
- [x] 悬浮返回顶部按钮（`fixed bottom-6 right-6`，滚动超一屏显示，`aria-label="返回顶部"`，平滑滚动尊重 prefers-reduced-motion）

## 移除项验证
- [x] `themes/matery/_config.yml` 中 sakura/mouseStar/snowdown/clicklove/canvas_nest/ribbon/ribbon_dynamic/background/video/music/musics/instantpage/busuanziStatistics 均 `enable: false`
- [x] `layout.ejs` 不再加载 Materialize CSS/JS、jQuery、masonry、aos、scrollProgress、lightgallery 及所有特效脚本（仅 6 行：head + header + body + footer + back-top + baidu-analytics）
- [x] `jsDelivr.url` 已置空，渲染 HTML 中 `jsDelivr.url` 计数为 0
- [x] 无彩色渐变 banner / 樱花 / 星星 / 彩带 / 爱心点击特效（bg-cover 计数 0）
- [x] 额外：post.ejs 不再调用 `_partial/post-cover` 与 `_partial/post-detail-toc.ejs`（移除全屏 banner + jQuery TOC）
- [x] 额外：tags/categories/about/friends/contact/archive/category/tag.ejs 不再调用 `_partial/bg-cover`（Task 8 修复）

## 子路径与 SSG 部署
- [x] 所有 EJS 中内部链接与静态资源均经 `url_for()`，无裸 `/css/`、`/js/`、`/medias/` 绝对路径
- [x] `npx hexo clean && npx hexo generate` 无报错，产出 `public/` 纯静态 HTML（exit 0，151 files 无文章 / 159 files 含测试文章）
- [x] `public/about/index.html` 等渲染 HTML 中 CSS/JS/字体/图片链接均带 `/blog/` 前缀（grep 验证：`/blog/css/shadcn-theme.css`、`/blog/js/app.js`、`/blog/medias/avatar.jpg`、`/blog/favicon.png`）
- [x] `favicon` / `logo` / 文章内图片路径均正确带子路径前缀，无 404
- [x] 保留 `hexo-deployer-git` 部署链路不变，`_config.yml` 的 `url`/`root`/`deploy` 配置未被破坏（`url: https://evil0618.github.io/blog`, `root: /blog/`）

## Web Interface Guidelines 合规抽检
- [x] 无 `transition: all`（用 `transition-colors` / `transition-shadow` / `transition-opacity` 等具体属性）
- [x] 无 `outline-none` 无 focus 替换；用 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- [x] 图片有 `width`/`height` 或 `loading="lazy"`（avatar `width="96" height="96"`，友链 avatar `width="48" height="48" loading="lazy"`）
- [x] 装饰图标 `aria-hidden="true"`，图标按钮有 `aria-label`（GitHub `aria-label="GitHub"`、主题切换 `aria-label="切换主题"`、返回顶部 `aria-label="返回顶部"`、复制代码 `aria-label="复制代码"`）
- [x] 日期/数字渲染无硬编码格式风险（Hexo `date(post.date, 'YYYY-MM-DD')` filter）
- [x] 动画尊重 `prefers-reduced-motion`（shadcn-theme.css `@media (prefers-reduced-motion: reduce)` 关闭 transition + scroll-behavior；app.js 返回顶部 `prefersReducedMotion() ? 'auto' : 'smooth'`）
