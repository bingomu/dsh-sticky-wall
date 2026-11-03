/**
 * 便签墙的本地存储。
 *
 * 一个 JSON 文件，读一次、写整份、原子替换。数据在 `DSH_HOME/notes/notes.json`，
 * 删掉文件就等于清空。没有数据库、没有设置、没有迁移。
 *
 * @module dsh-sticky-wall/lib/store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

/** 单条便签最多字数。 */
export const MAX_TEXT = 4000
/** 便签总量上限；超出时丢掉最老的未置顶便签。 */
export const MAX_NOTES = 500
/** 便签纸色板；和 client.js 的 tint 一一对应。 */
export const COLORS = ['amber', 'peach', 'rose', 'coral', 'sky', 'mint', 'lime', 'violet', 'plain']

/** 旧版本用过的颜色名 → 当前色名。 */
const COLOR_ALIASES = { green: 'mint' }

/** DSH 主目录：DSH_HOME 优先，否则 ~/.dsh。 */
export function dshHome() {
  const override = process.env.DSH_HOME
  return resolve(override !== undefined && override.length > 0 ? override : join(homedir(), '.dsh'))
}

/** 新便签 id。 */
function newId() {
  return `n-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

/** 新待办项 id。 */
function newItemId() {
  return `i-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

/** 一行一条待办，忽略空行。 */
function itemLines(text) {
  return String(text ?? '').split('\n').map((line) => line.trim()).filter((line) => line !== '')
}

/** 清洗磁盘上的待办项；缺 id / 重复 id 的补一个，坏条目丢弃。 */
function cleanItems(value) {
  if (!Array.isArray(value)) return []
  const used = new Set()
  const items = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const text = typeof entry.text === 'string' ? entry.text.replace(/\s+/g, ' ').trim() : ''
    if (text === '') continue
    let id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : newItemId()
    if (used.has(id)) id = newItemId()
    used.add(id)
    items.push({ id, text: text.slice(0, MAX_TEXT), done: entry.done === true })
  }
  return items
}

/**
 * 把旧待办项与新正文对齐：
 *   1. 先按「文字相同」找（重排也能跟住）；
 *   2. 再按「同一位置 + 旧文字已消失」兜底（原地改写也能保住勾选）；
 *   3. 都找不到就是新条目，done = false。
 * 返回的条目 id 稳定，勾选跟着条目走，不再跟行号走。
 */
function reconcileItems(previous, text) {
  const lines = itemLines(text)
  const old = Array.isArray(previous) ? previous : []
  const used = new Set()
  const items = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    let match = old.findIndex((item, position) => !used.has(position) && item.text === line)
    if (match < 0) {
      const candidate = old[index]
      if (candidate !== undefined && !used.has(index) && !lines.includes(candidate.text)) match = index
    }
    if (match >= 0) {
      const found = old[match]
      used.add(match)
      items.push({ id: found.id, text: line, done: found.done === true })
    } else {
      items.push({ id: newItemId(), text: line, done: false })
    }
  }
  return items
}

/** 清洗正文：统一换行、去首尾空白、截断。 */
function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n/g, '\n').replace(/^\s+|\s+$/g, '').slice(0, MAX_TEXT)
}

/** 清洗分类：一行小标题，最多 24 字；空串表示不分类。 */
export function cleanCategory(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 24)
}

/** 清洗便签类型：只有 todo / note 两种。 */
export function cleanKind(value) {
  return value === 'todo' ? 'todo' : 'note'
}

/** 清洗勾选状态：非负整数、去重、升序；界面按行号使用。 */
export function cleanChecked(value) {
  if (!Array.isArray(value)) return []
  const set = new Set()
  for (const item of value) {
    if (Number.isInteger(item) && item >= 0 && item <= 10000) set.add(item)
  }
  return [...set].sort((a, b) => a - b)
}

/** 清洗纸色：旧色名迁移，不认识的颜色退回 amber。 */
export function cleanColor(value) {
  if (typeof value !== 'string') return 'amber'
  const migrated = COLOR_ALIASES[value] ?? value
  return COLORS.includes(migrated) ? migrated : 'amber'
}

/** 一条便签是否合法（读盘时用；坏条目直接丢弃，不让整个文件作废）。 */
function isNote(value) {
  return typeof value === 'object' && value !== null
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.text === 'string' && value.text.length > 0
    && typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
}

/** 把读到的条目补齐成当前形状。待办以 items 为准，text 由 items 派生。 */
function normalize(note) {
  const kind = cleanKind(note.kind)
  let text = cleanText(note.text)
  let items
  if (kind === 'todo') {
    const stored = cleanItems(note.items)
    if (stored.length > 0) {
      items = stored
    } else {
      // 兼容旧版：只有正文 + 行号 checked，没有 items。
      const legacyDone = new Set(cleanChecked(note.checked))
      items = itemLines(text).map((line, index) => ({
        id: newItemId(),
        text: line,
        done: legacyDone.has(index),
      }))
    }
    text = items.map((item) => item.text).join('\n')
  }
  return {
    id: note.id,
    text,
    color: cleanColor(note.color),
    category: cleanCategory(note.category),
    kind,
    ...(kind === 'todo' ? { items } : {}),
    archivedAt: typeof note.archivedAt === 'number' && Number.isFinite(note.archivedAt) ? note.archivedAt : undefined,
    pinned: note.pinned === true,
    createdAt: note.createdAt,
    updatedAt: typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt) ? note.updatedAt : note.createdAt,
  }
}

/** 墙上的顺序：置顶优先，其次最近改动。 */
export function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
  })
}

export class NotesStore {
  /**
   * @param {{ dir?: string }} [options]
   */
  constructor(options = {}) {
    this.dir = options.dir ?? join(dshHome(), 'sticky-wall')
    this.file = join(this.dir, 'notes.json')
    // 旧版本的数据目录（只用于一次性迁移；显式传 dir 的测试/诊断不迁移）。
    this.legacyFile = options.dir === undefined ? join(dshHome(), 'notes', 'notes.json') : undefined
    this.notes = []
    this.loaded = false
    /** 串行化写入，避免两次点击互相覆盖。 */
    this.queue = Promise.resolve()
    this.loading = undefined
  }

  /** 只加载一次；并发的调用等同一个 promise。 */
  ready() {
    if (this.loaded) return Promise.resolve(this)
    if (this.loading === undefined) {
      this.loading = this.load().catch((error) => {
        this.loading = undefined
        throw error
      })
    }
    return this.loading
  }

  /** 读盘。文件不存在 = 空墙；文件坏了 = 备份后从空墙开始。 */
  async load() {
    const apply = (text) => {
      const parsed = JSON.parse(text)
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.notes) ? parsed.notes : []
      this.notes = list.filter(isNote).map(normalize)
      this.prune()
    }
    try {
      apply(await readFile(this.file, 'utf8'))
    } catch (error) {
      if (error?.code === 'ENOENT') {
        await this.migrateLegacy(apply)
      } else {
        const backup = `${this.file}.corrupt-${Date.now()}`
        try {
          await rename(this.file, backup)
          console.warn(`[dsh-sticky-wall] notes.json 读取失败，已备份到 ${backup}:`, error)
        } catch (renameError) {
          console.warn('[dsh-sticky-wall] notes.json 读取失败，且备份失败:', renameError)
        }
        this.notes = []
      }
    }
    this.loaded = true
    return this
  }

  /** 从旧目录 ~/.dsh/notes 复制一次数据到新目录；旧文件保留作备份。 */
  async migrateLegacy(apply) {
    if (this.legacyFile === undefined) return
    try {
      apply(await readFile(this.legacyFile, 'utf8'))
      await this.save()
      console.warn(`[dsh-sticky-wall] 已迁移旧便签：${this.legacyFile} → ${this.file}`)
    } catch (error) {
      if (error?.code !== 'ENOENT') console.warn('[dsh-sticky-wall] 旧便签迁移失败：', error)
    }
  }

  /** 写盘（原子替换）。 */
  async save() {
    await mkdir(this.dir, { recursive: true })
    const tmp = `${this.file}.tmp`
    const payload = JSON.stringify({ version: 1, notes: this.notes }, null, 2)
    await writeFile(tmp, payload, 'utf8')
    await rename(tmp, this.file)
  }

  /** 串行执行一次修改：确保 ready → 改内存 → 写盘。 */
  mutate(fn) {
    const run = this.queue.then(async () => {
      await this.ready()
      const result = await fn()
      this.prune()
      await this.save()
      return result
    })
    // 一次失败（例如 id 不存在）不能让后面的写入永远挂在这个 rejected 链上。
    this.queue = run.then(() => undefined, () => undefined)
    return run
  }

  /** 超出上限时丢掉最老的未置顶便签。 */
  prune() {
    if (this.notes.length <= MAX_NOTES) return
    const order = [...this.notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? 1 : -1
      return (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt)
    })
    const drop = new Set(order.slice(0, this.notes.length - MAX_NOTES).map((note) => note.id))
    this.notes = this.notes.filter((note) => !drop.has(note.id))
  }

  /** 全部便签（墙上的顺序，副本；items 也复制，避免调用方改到内部状态）。 */
  snapshot() {
    return sortNotes(this.notes).map((note) => ({
      ...note,
      ...(Array.isArray(note.items) ? { items: note.items.map((item) => ({ ...item })) } : {}),
    }))
  }

  /** 找一条。 */
  get(id) {
    return this.notes.find((note) => note.id === id)
  }

  /**
   * 贴一张新便签。
   * @param {{ text: string, color?: string, category?: string, kind?: string }} input
   */
  add(input) {
    const text = cleanText(input.text)
    if (text.length === 0) throw new Error('便签内容是空的')
    const now = Date.now()
    const kind = cleanKind(input.kind)
    const note = {
      id: newId(),
      text,
      color: cleanColor(input.color),
      category: cleanCategory(input.category),
      kind,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    if (kind === 'todo') {
      note.items = reconcileItems([], text)
      note.text = note.items.map((item) => item.text).join('\n')
    }
    return this.mutate(() => {
      this.notes.push(note)
      return note
    })
  }

  /**
   * 改一张便签。
   * @param {string} id
   * @param {{ text?: string, color?: string, category?: string, kind?: string, checked?: number[], pinned?: boolean, archived?: boolean }} patch
   */
  update(id, patch = {}) {
    return this.mutate(() => {
      const note = this.get(id)
      if (note === undefined) throw new Error(`没有这张便签：${id}`)
      let previousItems = note.kind === 'todo' && Array.isArray(note.items)
        ? note.items.map((item) => ({ ...item }))
        : []
      if (patch.text !== undefined) {
        const text = cleanText(patch.text)
        if (text.length === 0) throw new Error('便签内容不能为空')
        note.text = text
      }
      if (patch.color !== undefined) note.color = cleanColor(patch.color)
      if (patch.category !== undefined) note.category = cleanCategory(patch.category)
      if (patch.kind !== undefined) note.kind = cleanKind(patch.kind)
      // 旧客户端还可能传行号 checked：先按位置映射到旧条目上。
      if (patch.checked !== undefined && previousItems.length > 0) {
        const done = new Set(cleanChecked(patch.checked))
        previousItems = previousItems.map((item, index) => ({ ...item, done: done.has(index) }))
      }
      if (note.kind === 'todo') {
        note.items = reconcileItems(previousItems, note.text)
        note.text = note.items.map((item) => item.text).join('\n')
      } else {
        delete note.items
      }
      if (patch.pinned !== undefined) note.pinned = patch.pinned === true
      if (patch.archived !== undefined) {
        if (patch.archived === true) {
          if (note.archivedAt === undefined) note.archivedAt = Date.now()
        } else {
          delete note.archivedAt
        }
      }
      // 勾选待办不该把便签移到墙顶：只有内容/属性变化才刷新排序时间。
      if (['text', 'color', 'category', 'kind', 'pinned', 'archived'].some((key) => patch[key] !== undefined)) {
        note.updatedAt = Date.now()
      }
      return note
    })
  }

  /**
   * 勾选/取消一条待办。不刷新 updatedAt，卡片不会被移到墙顶。
   * @param {string} id
   * @param {string} itemId
   * @param {boolean} done
   */
  setItemDone(id, itemId, done) {
    return this.mutate(() => {
      const note = this.get(id)
      if (note === undefined) throw new Error(`没有这张便签：${id}`)
      if (note.kind !== 'todo' || !Array.isArray(note.items)) throw new Error('这张便签不是待办')
      const item = note.items.find((entry) => entry.id === itemId)
      if (item === undefined) throw new Error(`没有这条待办：${itemId}`)
      item.done = done === true
      return note
    })
  }

  /**
   * 撤销删除：把移除时的便签快照放回原位（保留 id、条目 id、勾选与归档状态）。
   * @param {Record<string, any>} snapshot
   */
  restore(snapshot) {
    return this.mutate(() => {
      if (snapshot === null || typeof snapshot !== 'object') throw new Error('无法恢复这张便签')
      const id = typeof snapshot.id === 'string' && snapshot.id !== '' ? snapshot.id : newId()
      if (this.get(id) !== undefined) throw new Error('便签已存在，无法恢复')
      const text = cleanText(snapshot.text)
      if (text.length === 0) throw new Error('便签内容为空，无法恢复')
      const kind = cleanKind(snapshot.kind)
      const now = Date.now()
      const note = {
        id,
        text,
        color: cleanColor(snapshot.color),
        category: cleanCategory(snapshot.category),
        kind,
        pinned: snapshot.pinned === true,
        createdAt: typeof snapshot.createdAt === 'number' && Number.isFinite(snapshot.createdAt) ? snapshot.createdAt : now,
        updatedAt: typeof snapshot.updatedAt === 'number' && Number.isFinite(snapshot.updatedAt) ? snapshot.updatedAt : now,
      }
      if (kind === 'todo') {
        const items = cleanItems(snapshot.items)
        note.items = items.length > 0 ? items : reconcileItems([], text)
        note.text = note.items.map((item) => item.text).join('\n')
      }
      if (typeof snapshot.archivedAt === 'number' && Number.isFinite(snapshot.archivedAt)) note.archivedAt = snapshot.archivedAt
      this.notes.push(note)
      return note
    })
  }

  /** 撕掉一张便签。 */
  remove(id) {
    return this.mutate(() => {
      const index = this.notes.findIndex((note) => note.id === id)
      if (index < 0) throw new Error(`没有这张便签：${id}`)
      const [note] = this.notes.splice(index, 1)
      return note
    })
  }

  /** 清空整面墙。 */
  clear() {
    return this.mutate(() => {
      const count = this.notes.length
      this.notes = []
      return count
    })
  }
}
