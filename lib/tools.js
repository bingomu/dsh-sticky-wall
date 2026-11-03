/**
 * 三个 agent 工具：贴一张、读整面墙、撕一张。
 *
 * 工具结果直接渲染成模型能读的一段话（output.render），不 import @deepseek-ai/*，
 * 避免 profile 里同名的 SDK 包遮蔽宿主内置版本。
 *
 * @module dsh-sticky-wall/lib/tools
 */

import { COLORS } from './store.js'

/** 工具参数：对象根、additionalProperties 关闭。 */
function schema(properties, required = []) {
  return { type: 'object', properties, required, additionalProperties: false }
}

/** 一行便签摘要：置顶标记 + 分类 + 内容（换行压成空格）+ id。 */
function line(note, index) {
  const pin = note.pinned ? '📌 ' : ''
  const category = note.category !== '' ? `【${note.category}】` : ''
  const text = note.text.replace(/\s*\n\s*/g, ' ⏎ ')
  const archived = note.archivedAt !== undefined ? '（已归档）' : ''
  let progress = ''
  if (note.kind === 'todo' && Array.isArray(note.items)) {
    const done = note.items.filter((item) => item.done === true).length
    progress = `（待办 ${done}/${note.items.length}）`
  }
  return `${index + 1}. ${pin}${category}${text}${progress}${archived}  [${note.id}]`
}

/**
 * 注册三个工具。
 * @param {*} ctx 插件上下文（需已 inject 'tools'）
 * @param {{ store: import('./store.js').NotesStore, ready: () => Promise<unknown> }} deps
 * @returns {Array<() => void>} disposers
 */
export function registerTools(ctx, deps) {
  const { store, ready } = deps
  const disposers = []

  disposers.push(ctx.tools.register({
    name: 'sticky_wall_add',
    description:
      '把一条想法贴到用户的便签墙上（跨会话，用户在任何对话都能看到）。'
      + '用户说「记到便签 / 贴到便签墙 / 先记下来 / 存个想法」时直接调用，不要反问。'
      + 'text 写成用户以后自己看得懂的一句话或一段话。',
    parameters: schema({
      text: { type: 'string', description: '便签正文，最多 4000 字。' },
      color: {
        type: 'string',
        enum: COLORS,
        description: '可选纸色：amber（暖黄）、peach（蜜桃橙）、rose（樱花粉）、coral（珊瑚红）、sky（天蓝）、mint（薄荷绿）、lime（嫩绿）、violet（淡紫）、plain（燕麦）。',
      },
      category: { type: 'string', description: '可选的分类小标题，例如「产品想法」「个人」。最多 24 字。' },
      kind: { type: 'string', enum: ['note', 'todo'], description: '可选类型：note 普通便签（默认），todo 待办便签（正文按行拆成待办项）。' },
    }, ['text']),
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: value.text }] },
    async execute(args) {
      await ready()
      const text = typeof args?.text === 'string' ? args.text : ''
      if (text.trim().length === 0) throw new Error('text 不能为空')
      const note = await store.add({
        text,
        color: typeof args?.color === 'string' ? args.color : undefined,
        category: typeof args?.category === 'string' ? args.category : undefined,
        kind: typeof args?.kind === 'string' ? args.kind : undefined,
      })
      return { text: `已贴到便签墙：${note.text.replace(/\s*\n\s*/g, ' / ')}（id ${note.id}）` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'sticky_wall_list',
    description: '列出便签墙上的便签（置顶在前，最近改动在前；默认不含已归档）。需要 id 去撕掉某张时先调用它。',
    parameters: schema({
      query: { type: 'string', description: '可选：只看正文或分类里包含这个词的便签。' },
      category: { type: 'string', description: '可选：只看这个分类的便签。' },
      includeArchived: { type: 'boolean', description: '是否把已归档的便签也列出来，默认 false。' },
      limit: { type: 'number', description: '最多列几张，默认 50。' },
    }),
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: value.text }] },
    async execute(args) {
      await ready()
      const query = typeof args?.query === 'string' ? args.query.trim().toLowerCase() : ''
      const category = typeof args?.category === 'string' ? args.category.trim() : ''
      const includeArchived = args?.includeArchived === true
      const limit = Number.isFinite(args?.limit) ? Math.min(Math.max(Math.trunc(args.limit), 1), 500) : 50
      const notes = store.snapshot().filter((note) => {
        if (!includeArchived && note.archivedAt !== undefined) return false
        if (category !== '' && note.category !== category) return false
        if (query === '') return true
        return note.text.toLowerCase().includes(query) || note.category.toLowerCase().includes(query)
      })
      if (notes.length === 0) {
        if (category !== '') return { text: `分类「${category}」里没有便签。` }
        return { text: query === '' ? '便签墙是空的。' : `没有包含「${query}」的便签。` }
      }
      const shown = notes.slice(0, limit)
      const tail = notes.length > shown.length ? `\n……还有 ${notes.length - shown.length} 张未列出。` : ''
      return { text: `便签墙 ${notes.length} 张：\n${shown.map(line).join('\n')}${tail}` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'sticky_wall_remove',
    description: '从便签墙上撕掉一张便签（用户说「删掉那张便签」时用）。不知道 id 就先 sticky_wall_list。',
    parameters: schema({
      id: { type: 'string', description: '便签 id，形如 n-xxxxx-xxxx。' },
    }, ['id']),
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: value.text }] },
    async execute(args) {
      await ready()
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      if (id.length === 0) throw new Error('id 不能为空')
      const note = await store.remove(id)
      return { text: `已撕掉便签：${note.text.replace(/\s*\n\s*/g, ' / ')}（${note.id}）` }
    },
  }))

  return disposers
}
