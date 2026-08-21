# TODO任务管理器

公开时间:2026-08-11

<p font color="#FF000" font-size:20px align="center">此版本为测试版本的第一版本,如有错误可指出，谢谢</p>

---

在线地址: https://sunZshanY.github.io/TODO/ & https://omia.pages.dev

桌面版下载: https://github.com/sunZshanY/TODO/releases/latest （TodoFluent-win32-x64.zip，解压后运行 TodoFluent.exe）

---

# 更新内容（2026-08-21）
1. 修复：AI 助手现在可读取当前待办计划 —— 发送消息时自动注入任务列表作为上下文（含优先级/截止日期/备注），可结合计划帮你拆解、分析和建议；计划为空时也会如实告知，避免 AI 编造任务
2. 新增：AI 历史对话管理（自动保存、一键新对话、删除单条/全部）
3. 新增：手机端适配，768px 以下切换为「任务 / 工具」双 Tab 布局
4. 新增：AI 测试连接按钮与 API Key 格式校验（sk- 开头），报错时显示请求地址与接口格式
5. 优化：AI 兼容 DeepSeek / OpenAI / Anthropic 接口格式（自动识别），桌面版通过 IPC 请求绕过浏览器 CORS
6. 部署：新增 GitHub Actions 自动构建发布到 GitHub Pages 与 Releases

---

# 更新内容（2026-08-20）
1. 新增云端同步：基于 GitHub Gist 实现网页版与桌面版数据互通（双向合并、自动同步、删除同步）
2. ~~桌面版打包为绿色免安装 exe，通过 GitHub Actions 自动发布到 Releases~~  (暂未发布exe 现版本为zip压缩为主)
3. 部署改用 GitHub Actions 自动构建发布到 GitHub Pages

### 云端同步使用说明
1. 点击左侧「云端同步」卡片的设置按钮
2. 在 [GitHub Token 页面](https://github.com/settings/tokens/new?scopes=gist) 生成一个只勾选 `gist` 权限的 Token，填入并保存
3. Gist ID 可留空，首次点击「同步」会自动创建私有 Gist
4. 在网页版和桌面版配置同一个 Token 后，点击「同步」即可双向合并任务数据；也可开启自动同步定时执行

---

# 更新内容（2026-08-11）
1. 新增时间卡片
2. 新增ai助手
3. 新增任务卡片

### 后续内容如有问题可进行pr提交
