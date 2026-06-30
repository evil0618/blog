# Tasks

> 变更 ID：`refactor-blog-ui-to-shadcn`
> 依赖原则：Task 1（设计系统地基）是所有后续样式任务的前置；Task 2/3/4 之间无强依赖可并行；Task 5/6 依赖 Task 1；Task 7（验证）依赖全部完成。

- [x] Task 1: 搭建 Shadcn 设计系统地基（CSS 变量 + Tailwind + 字体）
  - [x] SubTask 1.1: 新建 `themes/matery/source/css/shadcn-theme.css`，定义 Light/Dark 两套 Shadcn 语义 token（`--background/--foreground/--border/--muted/--primary/--accent/--ring` 等，Zinc 色阶，按 spec.md 配色表）
  - [x] SubTask 1.2: 在 `themes/matery/layout/_partial/head.ejs` 引入 Tailwind（CDN play 模式，配 `darkMode: 'class'` + 扩展颜色映射到 CSS 变量）+ Inter 字体（`<link rel="preconnect">` + `font-display: swap`）+ `<meta name="theme-color">`
  - [x] SubTask 1.3: 在 `head.ejs` 注入防 FOUC 内联脚本：读取 localStorage 主题，先于渲染为 `<html>` 加 `dark` class
  - [x] SubTask 1.4: 引入新的 `themes/matery/source/js/app.js`（原生 JS 主题 Toggle + 抽屉 + 返回顶部，操作 `dark` class + localStorage + 同步 `theme-color` meta）

- [x] Task 2: 关闭装饰特效与重框架依赖（配置层）
  - [x] SubTask 2.1: 在 `themes/matery/_config.yml` 将 `sakura`/`mouseStar`/`snowdown`/`clicklove`/`canvas_nest`/`ribbon`/`ribbon_dynamic`/`background`/`video`/`music`/`musics`/`instantpage`/`busuanziStatistics` 设为 `enable: false`
  - [x] SubTask 2.2: 在 `themes/matery/_config.yml` 关闭 `jsDelivr.url`（置空）以避免子路径资源错位
  - [x] SubTask 2.3: 精简 `themes/matery/layout/layout.ejs`：移除 Materialize JS、jQuery、masonry、aos、scrollProgress、lightgallery、matery.js 以及所有特效脚本加载块；仅保留 head + header + body + footer + back-top + baidu-analytics

- [x] Task 3: 重写全局布局（导航 + 页脚 + 移动端抽屉）
  - [x] SubTask 3.1: 重写 `themes/matery/layout/_partial/header.ejs`：吸顶 `sticky top-0 border-b backdrop-blur` 导航栏，左 Logo + 主导航，右 GitHub 图标链接 + 主题 Toggle 按钮（`aria-label`，`focus-visible:ring`）
  - [x] SubTask 3.2: 重写 `themes/matery/layout/_partial/navigation.ejs`：主导航项用语义 token，当前页高亮（基于 `is_home()/is_tag()/...` 判断）
  - [x] SubTask 3.3: 重写 `themes/matery/layout/_partial/footer.ejs`：极简页脚 `border-t`，仅版权 + Hexo + RSS，去除访客统计图标堆叠与运行时长脚本
  - [x] SubTask 3.4: 重写 `themes/matery/layout/_partial/mobile-nav.ejs`：移动端汉堡按钮 + 右侧抽屉（原生 JS 切换 `hidden`，`overscroll-behavior: contain`，遮罩点击关闭），< 768px 隐藏水平导航

- [x] Task 4: 重写首页文章列表
  - [x] SubTask 4.1: 重写 `themes/matery/layout/index.ejs`：移除 `_partial/index-cover`/`bg-cover`/`bg-video` 调用，改为居中 `max-w-3xl` 单列容器 + 站点标题块
  - [x] SubTask 4.2: 文章卡片改为轻边框 `border rounded-lg`（标题 / 日期 / 摘要 / 标签），`hover:shadow-sm`，所有链接 `url_for()`，去除封面图与重阴影（修复 `post.categories[0]` Query 对象访问 bug → 改用 `.first()`）
  - [x] SubTask 4.3: 重写 `themes/matery/layout/_partial/paging.ejs` 为极简数字/箭头分页（语义 token，当前页 `bg-primary text-primary-foreground`）

- [x] Task 5: 重写文章详情页与代码块
  - [x] SubTask 5.1: 重写 `themes/matery/layout/_partial/post-detail.ejs`：阅读区 `max-w-3xl` 居中，顶部标题 + 元信息（日期/阅读时长/标签，`text-muted-foreground`），正文包裹
  - [x] SubTask 5.2: 重写 `themes/matery/layout/_partial/codeblock.ejs`：终端风格代码块（暗底 `hsl(var(--terminal-bg))` + `border` + Mac 红绿灯按钮 + 语言标签 + 复制按钮，复制用原生 JS + `aria-live` 提示）
  - [x] SubTask 5.3: 在 `themes/matery/source/css/post.css` 美化正文 Markdown：引用块 `border-l-2 pl-4`，标题层级，表格 `overflow-x-auto`，链接 hover 强调色
  - [x] SubTask 5.4: 重写 `themes/matery/layout/_partial/prev-next.ejs` 为上下篇导航卡片（`border rounded-lg`，左右分栏，空态回退"已是最早/最新"）
  - [x] SubTask 5.5: 重写 `themes/matery/layout/_partial/back-top.ejs` 为悬浮返回顶部按钮（`fixed bottom-6 right-6`，滚动超一屏显示，`aria-label="返回顶部"`，平滑滚动）

- [x] Task 6: 重构样式层与子路径校验
  - [x] SubTask 6.1: 重写 `themes/matery/source/css/matery.css`：移除 Materialize 覆盖样式，改为基于 Shadcn token 的基础排版/布局类 + Materialize 遗留类向后兼容垫片
  - [x] SubTask 6.2: 重写 `themes/matery/source/css/post.css`：正文阅读排版、引用块、表格样式
  - [x] SubTask 6.3: 重写 `themes/matery/source/css/dark.css`：移除原 Materialize dark 覆盖，改为 `.dark` token 切换（仅保留过渡 `transition`）
  - [x] SubTask 6.4: 全局扫描所有 EJS 与 CSS，确保无裸 `/css/`、`/js/`、`/medias/` 绝对路径，统一 `url_for()`

- [x] Task 7: 构建验证与 GitHub Pages 子路径校验
  - [x] SubTask 7.1: 运行 `npx hexo clean && npx hexo generate`，确认无报错、产出 `public/` 纯静态 HTML（exit 0，151-159 files）
  - [x] SubTask 7.2: 检查 `public/index.html` 与示例文章 HTML，确认 CSS/JS/字体/图片链接均带 `/blog/` 前缀，无 404 绝对路径（用临时测试文章验证，已删除）
  - [x] SubTask 7.3: 验证渲染 HTML 含 Light/Dark 切换、吸顶导航、抽屉菜单、终端代码块、返回顶部、上下篇导航、分页结构（HTML 源码核验通过；运行时预览未执行因 sandbox 无浏览器）
  - [x] SubTask 7.4: 按 `checklist.md` 逐项核验并勾选

- [x] Task 8: 修复遗留布局文件（验证发现的新问题）
  - [x] SubTask 8.1: 重写 `themes/matery/layout/post.ejs`：移除 `_partial/post-cover` 调用（全屏 banner），移除 TOC 条件分支与 `_partial/post-detail-toc.ejs` 调用（jQuery 已移除会报错），直接调用 `_partial/post-detail.ejs`；保留 verifyPassword 守卫（`url_for(theme.libs.js.crypto)`）
  - [x] SubTask 8.2: 重写 `themes/matery/layout/tags.ejs` / `categories.ejs` / `archive.ejs` / `category.ejs` / `tag.ejs`：移除 `_partial/bg-cover`，改为 shadcn 风格 `<main class="mx-auto max-w-5xl px-4 py-12">` + 简洁 `<header>` 标题块；archive 重写为按年 section + 轻边框卡片时间线
  - [x] SubTask 8.3: 重写 `themes/matery/layout/about.ejs`：移除 `_partial/bg-cover` 与 post-statis/aos/card 等 Materialize 标记，改为 `max-w-3xl` 单列布局 + 头像 + 简介 + 保留 myProjects/mySkills/myGallery 条件调用
  - [x] SubTask 8.4: 重写 `themes/matery/layout/friends.ejs`：从 270+ 行精简到 22 行，移除内嵌 `<style>` 彩色渐变、jQuery masonry；改为 `grid sm:grid-cols-2 lg:grid-cols-3` shadcn 卡片网格
  - [x] SubTask 8.5: 重写 `themes/matery/layout/contact.ejs`（移除 jQuery 弹幕 AV.init/barrager）与 `themes/matery/layout/404.ejs`（极简 `max-w-3xl py-24 text-center`）
  - [x] SubTask 8.6: 重新运行 `npx hexo clean && npx hexo generate`，确认 `public/tags/index.html` / `public/categories/index.html` / `public/about/index.html` / `public/friends/index.html` / `public/contact/index.html` 等均无 jQuery 报错，无全屏 banner，统一 shadcn 头部（exit 0，159 files，bg-cover/jsDelivr/post-cover 计数均为 0）

# Task Dependencies
- [Task 2][Task 3][Task 4][Task 5][Task 6] 依赖 [Task 1]
- [Task 7] 依赖 [Task 1..6] 全部完成
- [Task 3][Task 4][Task 5][Task 6] 之间无强依赖，可并行
- [Task 8] 由 [Task 7] 验证发现，依赖 [Task 1..6] 完成
