import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'

import { NotesStore } from '../lib/store.js'
import { registerTools } from '../lib/tools.js'

const dirs = []
let harness = null

async function build() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-sticky-wall-tools-'))
  dirs.push(dir)
  const store = new NotesStore({ dir })
  const defs = new Map()
  const ctx = {
    tools: {
      register: (definition) => {
        defs.set(definition.name, definition)
        return () => defs.delete(definition.name)
      },
    },
  }
  const disposers = registerTools(ctx, { store, ready: () => store.ready() })
  harness = { store, defs, disposers }
  return harness
}

afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop(), { recursive: true, force: true })
})

test('registers three tools with closed schemas', async () => {
  const box = await build()
  assert.deepEqual([...box.defs.keys()], ['sticky_wall_add', 'sticky_wall_list', 'sticky_wall_remove'])
  assert.equal(box.disposers.length, 3)
  for (const definition of box.defs.values()) {
    assert.equal(definition.parameters.type, 'object')
    assert.equal(definition.parameters.additionalProperties, false)
    assert.equal(typeof definition.description, 'string')
    assert.equal(typeof definition.execute, 'function')
    assert.equal(typeof definition.output.render, 'function')
  }
})

test('sticky_wall_add writes to the wall and sticky_wall_list reads it back', async () => {
  const box = await build()
  const added = await box.defs.get('sticky_wall_add').execute({ text: '把想法贴上去', color: 'sky', category: '产品' })
  assert.match(added.text, /已贴到便签墙/)
  assert.equal(box.store.snapshot().length, 1)
  assert.equal(box.store.snapshot()[0].color, 'sky')
  assert.equal(box.store.snapshot()[0].category, '产品')

  const listed = await box.defs.get('sticky_wall_list').execute({})
  assert.match(listed.text, /便签墙 1 张/)
  assert.match(listed.text, /【产品】把想法贴上去/)
})

test('sticky_wall_list filters by query and reports an empty wall', async () => {
  const box = await build()
  assert.equal((await box.defs.get('sticky_wall_list').execute({})).text, '便签墙是空的。')

  await box.defs.get('sticky_wall_add').execute({ text: '买牛奶' })
  await box.defs.get('sticky_wall_add').execute({ text: '写周报' })

  const hit = await box.defs.get('sticky_wall_list').execute({ query: '牛奶' })
  assert.match(hit.text, /买牛奶/)
  assert.doesNotMatch(hit.text, /写周报/)

  const miss = await box.defs.get('sticky_wall_list').execute({ query: '不存在的词' })
  assert.match(miss.text, /没有包含/)
})

test('sticky_wall_list hides archived notes unless asked', async () => {
  const box = await build()
  const added = await box.defs.get('sticky_wall_add').execute({ text: '收起来的想法', category: '个人' })
  const id = box.store.snapshot()[0].id
  await box.store.update(id, { archived: true })

  const active = await box.defs.get('sticky_wall_list').execute({})
  assert.equal(active.text, '便签墙是空的。')

  const all = await box.defs.get('sticky_wall_list').execute({ includeArchived: true })
  assert.match(all.text, /已归档/)
  assert.match(all.text, /收起来的想法/)
  assert.match(added.text, new RegExp(id))
})

test('sticky_wall_list filters by category', async () => {
  const box = await build()
  await box.defs.get('sticky_wall_add').execute({ text: '产品上的一个想法', category: '产品' })
  await box.defs.get('sticky_wall_add').execute({ text: '生活上的一个想法', category: '个人' })

  const hit = await box.defs.get('sticky_wall_list').execute({ category: '产品' })
  assert.match(hit.text, /产品上的一个想法/)
  assert.doesNotMatch(hit.text, /生活上的一个想法/)

  const miss = await box.defs.get('sticky_wall_list').execute({ category: '不存在' })
  assert.match(miss.text, /分类「不存在」里没有便签/)
})

test('todo notes are added as todos and listed with progress', async () => {
  const box = await build()
  await box.defs.get('sticky_wall_add').execute({ text: '买牛奶\n写周报\n回邮件', kind: 'todo', category: '待办' })
  const note = box.store.snapshot()[0]
  assert.equal(note.kind, 'todo')
  assert.equal(note.items.length, 3)

  await box.store.setItemDone(note.id, note.items[0].id, true)
  await box.store.setItemDone(note.id, note.items[2].id, true)
  const listed = await box.defs.get('sticky_wall_list').execute({})
  assert.match(listed.text, /待办 2\/3/)
})

test('sticky_wall_remove tears a note off by id', async () => {
  const box = await build()
  const added = await box.defs.get('sticky_wall_add').execute({ text: '待撕' })
  const id = box.store.snapshot()[0].id
  const removed = await box.defs.get('sticky_wall_remove').execute({ id })
  assert.match(removed.text, /已撕掉便签/)
  assert.equal(box.store.snapshot().length, 0)
  assert.match(added.text, new RegExp(id))
})

test('sticky_wall_add rejects empty text and sticky_wall_remove rejects an unknown id', async () => {
  const box = await build()
  await assert.rejects(() => box.defs.get('sticky_wall_add').execute({ text: '  ' }), /不能为空/)
  await assert.rejects(() => box.defs.get('sticky_wall_remove').execute({ id: 'missing' }), /没有这张便签/)
})
