# 开发说明 · dsh-sticky-wall

## 结构

```
index.js                宿主半：装配 store / routes / tools
lib/store.js            本地 JSON 存储（原子写、串行队列、待办 items、归档、数量上限）
lib/routes.js           /dsh-sticky-wall/api：list / add / update / check / remove / restore / clear
lib/tools.js            sticky_wall_add / sticky_wall_list / sticky_wall_remove
client.js               浏览器半：侧边栏入口 + main 面板（plain JS，__ModuleLoader__ 注册）
cordis.patch.yml        插入 Host 行
locale/*.json           插件管理器标题/描述
icon.svg                图标
design/                 设计稿 HTML + 渲染图 + demo 数据脚本（不进 npm 包）
tests/                  node:test（store / routes / tools）
```

## 数据模型

`~/.dsh/sticky-wall/notes.json`：

```jsonc
{
  "version": 1,
  "notes": [{
    "id": "n-…",
    "text": "…",                 // 普通便签正文；待办时由 items 派生
    "color": "amber|peach|rose|coral|sky|mint|lime|violet|plain",
    "category": "可选分类",
    "kind": "note|todo",
    "items": [{ "id": "i-…", "text": "第一行", "done": false }],
    "pinned": false,
    "archivedAt": 0,             // 有值 = 已归档
    "createdAt": 0,
    "updatedAt": 0
  }]
}
```

- 待办的对齐规则：先按文字匹配旧条目，再按同位置兜底，都找不到才新建；因此重排、插入、
  原地改写都能尽量保住勾选。完全重复的两行仍无法区分。
- `updatedAt` 只在内容/属性变化时更新；勾选不会把卡片移到墙顶。
- 旧版 `checked: number[]`（行号）在读盘时迁移成条目 `done`。

## 测试

```bash
npm run check   # 五个文件语法检查
npm test        # node:test，37 项
```

测试不依赖 DSH。

## 本地安装 / 联调

```bash
# 在 DSH 插件管理器里安装本目录（workspace link），或用 CLI：
dsh plugin --profile <你的 profile> add "link:/仓库绝对路径"
```

- 改 `client.js`：刷新页面即可。
- 改宿主（`index.js`/`lib/*`）：重启 `dsh web`，或在插件管理器里停用再启用。

## 设计稿与 demo 数据

- `design/demo.html`：静态设计稿，支持 `?lang=zh|en` 与 `?theme=light|dark`。
  四张图（中/英 × 亮/暗）由 headless Chrome 渲染：

  ```bash
  for lang in zh en; do for theme in light dark; do
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      --headless --no-sandbox --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=2 --window-size=1100,1060 \
      --screenshot="$PWD/design/demo-$lang-$theme.png" \
      "file://$PWD/design/demo.html?lang=$lang&theme=$theme"
  done; done
  ```
- `design/demo-notes.mjs`：把设计稿的 12 张示例便签灌进当前墙（幂等），或只清理它们。

  ```bash
  node design/demo-notes.mjs seed  http://127.0.0.1:<port>
  node design/demo-notes.mjs clear http://127.0.0.1:<port>
  ```

## 发布（维护者）

本插件走 **GitHub-only** 发布，不依赖 npm。

1. `npm run check && npm test`
2. `pnpm pack`，确认 tarball 只包含 `index.js`、`client.js`、`lib`、patch、locale、icon、README、LICENSE、CHANGELOG
3. 提交并打 tag：`git add -A && git commit -m "feat: dsh-sticky-wall v1.0.0" && git tag v1.0.0`
4. 建仓库并推送：
   ```bash
   gh repo create bingomu/dsh-sticky-wall --public --source=. --remote=origin --push
   git push origin v1.0.0
   gh repo edit bingomu/dsh-sticky-wall \
     --description "Sticky-note wall for DeepSeek Harness" \
     --add-topic dsh-plugin --add-topic dsh --add-topic deepseek-harness \
     --add-topic sticky-notes --add-topic notes --add-topic todo
   ```
5. `gh release create v1.0.0 --title "v1.0.0 · Sticky Wall" --notes-file <notes.md>`
6. 干净 profile 用 tarball URL 安装验证：`dsh plugin --profile <p> add https://github.com/bingomu/dsh-sticky-wall/archive/refs/tags/v1.0.0.tar.gz`

以后要上 npm 时再补 `npm publish`；`prepublishOnly` 已配置。
