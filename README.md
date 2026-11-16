# Dynamic Survey for Obsidian

## 功能
- JSON 驱动的步进式问卷（single / multiple / text / textarea）
- 每份问卷单独设置 `targetFolder`
- 默认笔记名：`{{date}} {{survey_name}}.md`
- 同日重复填写默认生成 `(2)`、`(3)`，也支持 `append` / `overwrite` 模式
- 支持 `{{date}}`、`{{time}}`、`{{datetime}}`、`{{survey_name}}` 和题目 ID

## 内置模板：今日情绪复盘
「今日情绪复盘」是随插件源码分发的一级内置（出厂）模板，离线可用，不依赖网络，macOS 桌面端与 Android 移动端行为一致：

- **首次安装**时自动实例化到用户设置（`data.json`）成为可编辑的工作副本；
- 工作副本可以**编辑、停用（`enabled: false`）、复制**，删除也不会影响出厂定义；
- 出厂定义以深度冻结对象随代码内置，任何时候都可通过设置页的
  **「恢复内置模板」**一键恢复（覆盖被改坏的工作副本；若无工作副本则新建）；
- 出厂内容：
  - 今日环境（single：🌟 好 / ⛅ 一般 / ☔ 糟糕）
  - 今日状态（multiple：👍 有收获 / 👎 被掏空 / 😰 焦虑 / 😎 安宁 / 🐷 轻松 / 🐶 劳累 / 😁 开心 / 🫣 心累 / 🥛 养生 / 🍻 放纵）
  - 4F 情绪记录（7 个 textarea 逐步提问：Fact【1】【2】、Feel【3】【4】、Focus【5】【6】、Future【7】）
- 默认输出 `{{date}} {{survey_name}}.md`，`targetFolder` 独立配置（默认 `复盘/情绪记录`）。

## 移动端 / 折叠屏
- `manifest.json` 保持 `"isDesktopOnly": false`；运行时只用 Obsidian API，无 Node/Electron 依赖；
- 手机模式（`body.is-mobile`，含华为 Mate X7 等折叠屏摊开状态）下问卷弹窗锁定为
  手机宽度（≤480px）并水平居中，摊开大屏不会拉宽界面；
- 底部「上一步 / 下一步 / 完成并保存」吸底显示，软键盘打开时仍可操作；
- 单行输入框支持键盘回车直接推进（`enterkeyhint`）；
- 长问卷与长选项列表在弹窗内滚动（320–480px 视口已验证）。

## 构建
```bash
npm install
npm run build   # tsc 类型检查 + esbuild 打包 → 根目录 main.js
node esbuild.test.mjs && node test/out/unit.cjs   # 单元测试
node test/shipped/smoke.cjs                        # 产物冒烟测试
```
把 `main.js`、`manifest.json`、`styles.css`（即 `dist/dynamic-survey/` 三个文件）放入：
`.obsidian/plugins/dynamic-survey/`

## 关键配置
```json
{
  "targetFolder": "复盘/情绪记录",
  "fileNameTemplate": "{{date}} {{survey_name}}",
  "collisionMode": "increment"
}
```
`collisionMode` 可取 `increment`、`append`、`overwrite`。
