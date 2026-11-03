import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'

import { NotesStore, sortNotes, cleanColor, COLORS } from '../lib/store.js'

const dirs = []
async function freshStore() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-sticky-wall-store-'))
  dirs.push(dir)
  return new NotesStore({ dir })
}

afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop(), { recursive: true, force: true })
})

test('add stores a trimmed note and persists it', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '  第一张便签\n第二行  ', color: 'sky', category: '  产品   想法 ' })
  assert.equal(note.text, '第一张便签\n第二行')
  assert.equal(note.color, 'sky')
  assert.equal(note.category, '产品 想法')
  assert.equal(note.pinned, false)

  const wall = store.snapshot()
  assert.equal(wall.length, 1)
  assert.equal(wall[0].id, note.id)

  const disk = JSON.parse(await readFile(join(store.dir, 'notes.json'), 'utf8'))
  assert.equal(disk.version, 1)
  assert.equal(disk.notes.length, 1)
  assert.equal(disk.notes[0].text, note.text)
})

test('empty text is rejected', async () => {
  const store = await freshStore()
  await store.ready()
  assert.throws(() => store.add({ text: '   ' }), /空/)
})

test('unknown colour falls back to amber', async () => {
  assert.equal(cleanColor('neon'), 'amber')
  assert.equal(cleanColor(undefined), 'amber')
  for (const color of COLORS) assert.equal(cleanColor(color), color)
})

test('legacy colour names migrate to the current palette', async () => {
  assert.equal(cleanColor('green'), 'mint')
  assert.equal(cleanColor('peach'), 'peach')
  assert.equal(cleanColor('coral'), 'coral')
  assert.equal(cleanColor('lime'), 'lime')
  assert.equal(COLORS.length, 9)
})

test('update, pin, recolour and remove', async () => {
  const store = await freshStore()
  const first = await store.add({ text: '一' })
  const second = await store.add({ text: '二' })
  await store.update(first.id, { text: '改过的', category: '工作' })
  await store.update(second.id, { pinned: true, color: 'plain' })

  let wall = store.snapshot()
  assert.equal(wall[0].id, second.id, 'pinned note comes first')
  assert.equal(wall[0].color, 'plain')
  assert.equal(wall[1].text, '改过的')
  assert.equal(wall[1].category, '工作')

  const removed = await store.remove(first.id)
  assert.equal(removed.id, first.id)
  wall = store.snapshot()
  assert.deepEqual(wall.map((note) => note.id), [second.id])
})

test('sortNotes puts pinned first, then most recently touched', () => {
  const base = { pinned: false, createdAt: 1, updatedAt: 1 }
  const sorted = sortNotes([
    { ...base, id: 'a', updatedAt: 10 },
    { ...base, id: 'b', pinned: true, updatedAt: 2 },
    { ...base, id: 'c', updatedAt: 20 },
  ])
  assert.deepEqual(sorted.map((note) => note.id), ['b', 'c', 'a'])
})

test('archive and restore keep the note out of the wall flow', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '旧想法' })
  await store.update(note.id, { archived: true })
  let saved = store.get(note.id)
  assert.equal(typeof saved.archivedAt, 'number')

  await store.ready()
  const disk = JSON.parse(await readFile(join(store.dir, 'notes.json'), 'utf8'))
  assert.equal(typeof disk.notes[0].archivedAt, 'number')

  await store.update(note.id, { archived: false })
  saved = store.get(note.id)
  assert.equal(saved.archivedAt, undefined)
})

test('todo notes use stable item ids and keep done across reorder/insert', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '买牛奶\n写周报\n回邮件', kind: 'todo' })
  assert.equal(note.kind, 'todo')
  assert.equal(note.items.length, 3)
  assert.equal(new Set(note.items.map((item) => item.id)).size, 3)

  const target = note.items.find((item) => item.text === '写周报')
  await store.setItemDone(note.id, target.id, true)

  // 重排 + 插入新行：写周报的勾选还在、id 不变，新行默认未完成。
  await store.update(note.id, { text: '新任务\n回邮件\n写周报\n买牛奶' })
  const changed = store.get(note.id)
  assert.equal(changed.items.length, 4)
  assert.equal(changed.items.find((item) => item.text === '写周报').id, target.id)
  assert.equal(changed.items.find((item) => item.text === '写周报').done, true)
  assert.equal(changed.items.find((item) => item.text === '新任务').done, false)

  // 同一位置改写文字：通过位置兜底保住勾选和 id。
  await store.update(note.id, { text: '新任务\n回邮件\n写周报（今天）\n买牛奶' })
  const edited = store.get(note.id).items.find((item) => item.text === '写周报（今天）')
  assert.equal(edited.id, target.id)
  assert.equal(edited.done, true)

  await store.update(note.id, { kind: 'note' })
  assert.equal(store.get(note.id).kind, 'note')
  assert.equal(store.get(note.id).items, undefined)
})

test('legacy checked indexes migrate to item done state', async () => {
  const store = await freshStore()
  await mkdir(store.dir, { recursive: true })
  await writeFile(join(store.dir, 'notes.json'), JSON.stringify({
    version: 1,
    notes: [{ id: 'n-legacy', text: '一\n二\n三', kind: 'todo', checked: [1], color: 'amber', createdAt: 5, updatedAt: 5 }],
  }), 'utf8')
  await store.ready()
  const note = store.get('n-legacy')
  assert.deepEqual(note.items.map((item) => item.done), [false, true, false])
  assert.equal(new Set(note.items.map((item) => item.id)).size, 3)
})

test('unknown kind falls back to note', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '普通便签', kind: 'someday' })
  assert.equal(note.kind, 'note')
})

test('checking todo items does not bump the sort time', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '一\n二', kind: 'todo' })
  const before = store.get(note.id).updatedAt
  await new Promise((resolve) => setTimeout(resolve, 5))
  await store.setItemDone(note.id, note.items[0].id, true)
  assert.equal(store.get(note.id).updatedAt, before)
  await new Promise((resolve) => setTimeout(resolve, 5))
  await store.update(note.id, { text: '一\n二\n三' })
  assert.ok(store.get(note.id).updatedAt > before)
})

test('remove then restore keeps the note id, items and done state', async () => {
  const store = await freshStore()
  const note = await store.add({ text: '一\n二', kind: 'todo', category: '待办' })
  await store.setItemDone(note.id, note.items[0].id, true)
  const snapshot = JSON.parse(JSON.stringify(store.get(note.id)))
  await store.remove(note.id)
  await store.restore(snapshot)
  const restored = store.get(note.id)
  assert.equal(restored.id, note.id)
  assert.deepEqual(restored.items, snapshot.items)
  assert.equal(restored.category, '待办')
})

test('clear empties the wall', async () => {
  const store = await freshStore()
  await store.add({ text: 'a' })
  await store.add({ text: 'b' })
  assert.equal(await store.clear(), 2)
  assert.equal(store.snapshot().length, 0)
})

test('a failed mutation does not block later writes', async () => {
  const store = await freshStore()
  await assert.rejects(() => store.update('missing', { text: 'x' }), /没有这张便签/)
  const note = await store.add({ text: '还能继续写' })
  assert.equal(store.snapshot()[0].id, note.id)
})

test('loading tolerates a missing file', async () => {
  const store = await freshStore()
  await store.ready()
  assert.deepEqual(store.snapshot(), [])
})

test('a corrupt file is backed up and the wall starts empty', async () => {
  const store = await freshStore()
  await mkdir(store.dir, { recursive: true })
  await writeFile(join(store.dir, 'notes.json'), '{ not json', 'utf8')
  await store.ready()
  assert.deepEqual(store.snapshot(), [])
  const leftovers = await readFile(join(store.dir, 'notes.json'), 'utf8').catch(() => null)
  assert.equal(leftovers, null, 'the corrupt original was moved aside')
})

test('bad records are dropped without discarding the good ones', async () => {
  const store = await freshStore()
  await mkdir(store.dir, { recursive: true })
  await writeFile(join(store.dir, 'notes.json'), JSON.stringify({
    version: 1,
    notes: [
      { id: 'good', text: '留下', color: 'rose', pinned: true, createdAt: 5 },
      { id: '', text: '坏的', createdAt: 6 },
      null,
    ],
  }), 'utf8')
  await store.ready()
  const wall = store.snapshot()
  assert.equal(wall.length, 1)
  assert.equal(wall[0].id, 'good')
  assert.equal(wall[0].updatedAt, 5, 'updatedAt falls back to createdAt')
})
