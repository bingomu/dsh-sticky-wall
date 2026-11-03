#!/usr/bin/env node
/**
 * demo 便签工具（开发/展示用，不是插件运行时的一部分）。
 *
 *   node design/demo-notes.mjs seed  [origin]   灌入 12 张 demo 便签（保留用户自己的便签）
 *   node design/demo-notes.mjs clear [origin]   只删这 12 张 demo 便签，不动其它便签
 *
 * origin 默认 http://127.0.0.1:51469（DSH Web 当前端口，重启后会变，可显式传入）。
 * 灌入是幂等的：同一段正文已经在墙上就跳过。
 */

const DEMO = [
  { text: '如果想法都有一个落脚点？不用打开文档，也不用想放在哪。', color: 'amber', category: '产品想法', pinned: true },
  { text: '试试一个更安静的早晨：七点起床，先不看手机。', color: 'mint', category: '个人' },
  { text: '一键完成日常工作的工具。', color: 'violet', category: '下一个插件' },
  { text: '《设计中的设计》第三章：留白不是空的，是让视线有地方停。', color: 'sky', category: '阅读' },
  { text: '便签要能被 agent 读到——在对话里说「记到便签墙」，它就应该出现在这里。', color: 'peach', category: '产品想法' },
  { text: '把发布流程画成一张图：Skill → 插件 → DSH → GitHub → X。', color: 'rose', category: '灵感' },
  { text: '周五前：写完 v1.1 的 release notes，附两张图。', color: 'lime', category: '待办' },
  { text: '京都：早上七点的鸭川，带一杯便利店咖啡。', color: 'plain', category: '旅行' },
  { text: '「好的工具应该消失在使用里。」', color: 'coral', category: '摘录' },
  { text: '给每张便签一个分类，像书脊上的标签。', color: 'amber', category: '产品想法' },
  { text: '周末把桌面清空一次，只留正在做的三件事。', color: 'sky', category: '个人' },
  { text: '便签墙可以有一个「今天」视图：只看今天贴的。', color: 'violet', category: '灵感' },
]

const action = process.argv[2] ?? 'seed'
const origin = process.argv[3] ?? process.env.NOTES_ORIGIN ?? 'http://127.0.0.1:51469'
const base = `${origin}/dsh-sticky-wall/api/notes`

async function readWall() {
  const response = await fetch(base)
  const body = await response.json()
  if (body?.ok !== true) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
  return body.value.notes
}

async function post(op) {
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(op),
  })
  const body = await response.json()
  if (body?.ok !== true) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
  return body.value
}

async function seed() {
  const notes = await readWall()
  const existing = new Set(notes.map((note) => note.text))
  let added = 0
  // 逆序写入：第一张最后写，成为最新的卡，铺满时就从左上开始。
  for (const note of [...DEMO].reverse()) {
    if (existing.has(note.text)) continue
    await post({ op: 'add', text: note.text, color: note.color, category: note.category })
    added += 1
  }
  const wall = await readWall()
  const first = wall.find((note) => note.text === DEMO[0].text)
  if (first !== undefined && first.pinned !== true) {
    await post({ op: 'update', id: first.id, pinned: true })
  }
  console.log(`seeded ${added} demo notes; wall now has ${wall.length} notes`)
}

async function clear() {
  const notes = await readWall()
  const demoTexts = new Set(DEMO.map((note) => note.text))
  let removed = 0
  for (const note of notes) {
    if (!demoTexts.has(note.text)) continue
    await post({ op: 'remove', id: note.id })
    removed += 1
  }
  console.log(`removed ${removed} demo notes; wall now has ${notes.length - removed} notes`)
}

const main = action === 'clear' ? clear : seed
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
