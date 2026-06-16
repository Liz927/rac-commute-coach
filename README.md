# RAC Commute Coach

手机端 RAC 备考通勤学习 PWA。它是一个纯前端静态网页，没有登录、后端或云同步；学习数据保存在当前浏览器的 `localStorage`。

## 本地使用

```bash
npm install
npm run dev
```

打开 Vite 显示的本地地址即可。

## 发布成静态网页

推荐用 GitHub Pages：

1. 在 GitHub 新建一个仓库，例如 `rac-commute-coach`。
2. 把本项目推到该仓库的 `main` 或 `master` 分支。
3. 打开 GitHub 仓库的 `Settings` -> `Pages`。
4. 在 `Build and deployment` 里把 `Source` 选为 `GitHub Actions`。
5. 等待 `Deploy static site to GitHub Pages` 工作流完成。
6. GitHub 会生成类似下面的网址：

```text
https://你的用户名.github.io/rac-commute-coach/
```

手机打开这个网址后，用浏览器菜单选择“添加到主屏幕”。

## 日常流程

1. 晚上让 ChatGPT 生成当天 RAC Day Markdown。
2. 手机上打开网页，点“新增”，粘贴 Markdown。
3. 点“解析 Markdown”，再点“保存 Day”。
4. 通勤时阅读、做题、标记“想问 / 不确定 / 重要”。
5. 晚上在 Day 页面底部点“生成今日问题包”，复制给 ChatGPT。

## 备份

数据只在当前浏览器里。换手机、清浏览器数据或换浏览器前，请在“备份”页先 `Export JSON`，到新设备后用 `Import JSON` 恢复。
