import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, test } from 'node:test'

import { NotesStore } from '../lib/store.js'
import { registerRoutes } from '../lib/routes.js'

const dirs = []
const BASE = '/dsh-sticky-wall/api'

async function harness() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-sticky-wall-routes-'))
  dirs.push(dir)
  const store = new NotesStore({ dir })
  let route = null
  const webCtx = {
    get: () => undefined,
    webServer: {
      register: (registered) => {
        route = registered
        return () => { route = null }
      },
    },
    effect: (fn) => fn(),
  }
  const dispose = registerRoutes(webCtx, { store, ready: () => store.ready() })
  return { store, route, dispose, request: (options) => request(route, options) }
}

function request(route, { method = 'GET', path = `${BASE}/notes`, body, origin, host = '127.0.0.1:59530' } = {}) {
  const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  const req = Readable.from(payload)
  req.method = method
  req.url = path
  req.headers = { host, ...(origin === undefined ? {} : { origin }) }
  const res = {
    status: 0,
    headers: {},
    body: null,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(text) {
      this.body = JSON.parse(text)
    },
  }
  return route.handler(req, res).then(() => res)
}

afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop(), { recursive: true, force: true })
})

test('health probes the route', async () => {
  const box = await harness()
  const res = await box.request({ path: `${BASE}/health` })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { ok: true, value: { available: true, count: 0 } })
})

test('GET returns an empty wall', async () => {
  const box = await harness()
  const res = await box.request({})
  assert.equal(res.status, 200)
  assert.equal(res.body.ok, true)
  assert.deepEqual(res.body.value.notes, [])
  assert.equal(typeof res.body.value.now, 'number')
})

test('POST add / update / remove round-trips and echoes the wall', async () => {
  const box = await harness()
  const added = await box.request({ method: 'POST', body: { op: 'add', text: '想法一', color: 'rose', category: '产品想法', kind: 'todo' } })
  assert.equal(added.status, 200)
  assert.equal(added.body.value.notes.length, 1)
  const id = added.body.value.note.id
  assert.equal(added.body.value.note.color, 'rose')
  assert.equal(added.body.value.note.category, '产品想法')
  assert.equal(added.body.value.note.kind, 'todo')

  const todo = await box.request({ method: 'POST', body: { op: 'update', id, kind: 'todo' } })
  assert.equal(todo.body.value.note.kind, 'todo')
  assert.equal(todo.body.value.note.items.length, 1)
  const itemId = todo.body.value.note.items[0].id
  const checked = await box.request({ method: 'POST', body: { op: 'check', id, itemId, done: true } })
  assert.equal(checked.body.value.note.items[0].done, true)

  const pinned = await box.request({ method: 'POST', body: { op: 'update', id, pinned: true, category: '个人' } })
  assert.equal(pinned.body.value.note.pinned, true)
  assert.equal(pinned.body.value.note.category, '个人')

  const archived = await box.request({ method: 'POST', body: { op: 'update', id, archived: true } })
  assert.equal(typeof archived.body.value.note.archivedAt, 'number')

  const removed = await box.request({ method: 'POST', body: { op: 'remove', id } })
  assert.equal(removed.body.value.notes.length, 0)

  const restored = await box.request({ method: 'POST', body: { op: 'restore', note: removed.body.value.note } })
  assert.equal(restored.body.value.notes.length, 1)
  assert.equal(restored.body.value.notes[0].id, id)
})

test('POST clear empties the wall', async () => {
  const box = await harness()
  await box.request({ method: 'POST', body: { op: 'add', text: 'a' } })
  const res = await box.request({ method: 'POST', body: { op: 'clear' } })
  assert.equal(res.body.value.removed, 1)
  assert.deepEqual(res.body.value.notes, [])
})

test('unknown op is a 400', async () => {
  const box = await harness()
  const res = await box.request({ method: 'POST', body: { op: 'explode' } })
  assert.equal(res.status, 400)
  assert.equal(res.body.ok, false)
})

test('add without text is a 400', async () => {
  const box = await harness()
  const res = await box.request({ method: 'POST', body: { op: 'add', text: '   ' } })
  assert.equal(res.status, 400)
})

test('removing an unknown note is a 404', async () => {
  const box = await harness()
  const res = await box.request({ method: 'POST', body: { op: 'remove', id: 'nope' } })
  assert.equal(res.status, 404)
  assert.equal(res.body.error.code, 'not-found')
})

test('invalid JSON is a 400', async () => {
  const box = await harness()
  const req = Readable.from([Buffer.from('{oops')])
  req.method = 'POST'
  req.url = `${BASE}/notes`
  req.headers = { host: '127.0.0.1:59530' }
  const res = { status: 0, writeHead(status) { this.status = status }, end() {} }
  await box.route.handler(req, res)
  assert.equal(res.status, 400)
})

test('a foreign origin is rejected', async () => {
  const box = await harness()
  const res = await box.request({ origin: 'http://evil.example' })
  assert.equal(res.status, 403)
  assert.equal(res.body.ok, false)
})

test('the same origin is allowed', async () => {
  const box = await harness()
  const res = await box.request({ origin: 'http://127.0.0.1:59530' })
  assert.equal(res.status, 200)
})

test('wrong methods and unknown paths are errors', async () => {
  const box = await harness()
  assert.equal((await box.request({ method: 'DELETE' })).status, 405)
  assert.equal((await box.request({ path: `${BASE}/nope` })).status, 404)
})

test('the disposer removes the route', async () => {
  const box = await harness()
  assert.equal(typeof box.dispose, 'function')
})
