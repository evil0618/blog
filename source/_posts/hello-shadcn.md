---
title: Hello, Shadcn
date: 2026-06-30 12:00:00
categories:
  - 公告
tags:
  - Shadcn
  - UI
---

欢迎来到全新重构的博客。

本次重构将原 matery 主题改造为严格契合 Shadcn UI 美学的极简风格，主要改动：

- **设计系统**：Light/Dark 双 HSL 语义 token（Zinc 色阶）+ Tailwind + Inter 字体
- **首页**：居中单列 `max-w-3xl` 轻边框卡片列表，去除全屏 banner 与重阴影
- **文章详情页**：阅读区限宽，终端风格代码块（Mac 红绿灯 + 复制按钮），引用块左侧细边框，上下篇导航
- **导航**：sticky 吸顶 + backdrop-blur，移动端右侧抽屉
- **部署**：完美适配 GitHub Pages `/blog/` 子路径，所有资源经 `url_for()` 处理

> 支持暗色模式，点击右上角月亮图标切换。

```javascript
function greet(name) {
  console.log('Hello, ' + name);
}
greet('Shadcn');
```

开始写作吧 —— 在 `source/_posts/` 下新建 Markdown 文件即可。
