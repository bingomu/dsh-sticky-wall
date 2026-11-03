/**
 * 浏览器半侧用的 HTTP 路由。
 *
 *   GET  /dsh-sticky-wall/api/health           探针
 *   GET  /dsh-sticky-wall/api/notes            整面墙
 *   POST /dsh-sticky-wall/api/notes            单入口：{ op: 'add' | 'update' | 'remove' | 'clear', ... }
 *
 * 全部同源 JSON，没有 SSE——本地单人使用，客户端每次操作后拿回整面墙。
 *
 * @module dsh-sticky-wall/lib/routes
 */

import { MAX_TEXT } from './store.js'

const ROUTE_PREFIX = '/dsh-sticky-wall/api'
const MAX_BODY = 256 * 1024
const OPS = new Set(['add', 'update', 'check', 'remove', 'restore', 'clear'])

/** 发 JSON。 */
function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

/** 成功信封。 */
function ok(res, value) {
  send(res, 200, { ok: true, value })
}

/** 失败信封。 */
function fail(res, status, code, message) {
  send(res, status, { ok: false, error: { code, message } })
}

/** 读 JSON 请求体（有上限）。 */
async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw Object.assign(new Error('body too large'), { code: 'too_large' })
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {}
  try {
    const value = JSON.parse(text)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('body must be an object')
    }
    return value
  } catch (error) {
    throw Object.assign(new Error(`invalid JSON body: ${error.message}`), { code: 'invalid_json' })
  }
}

/**
 * 同源检查：带 Origin 的请求必须是本页来源；没有 Origin 的（curl / 本地脚本）放行。
 * 防的是网页 CSRF，不是本机命令。
 */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (origin === undefined) return true
  const host = req.headers.host
  try {
    const parsed = new URL(origin)
    if (parsed.host === host) return true
    // 桌面版同源也可能是 127.0.0.1 与 localhost 互换，只比端口与主机语义。
    return parsed.port === (host === undefined ? '' : String(new URL(`http://${host}`).port))
  } catch {
    return false
  }
}

/**
 * 同源判定：没有 Origin 的是本机命令 / 同源导航，直接放行；
 * 带 Origin 的优先交给宿主连接层，不可用时退回本文件的 sameOrigin。
 */
function rejectionOf(ctx, req) {
  if (req.headers.origin === undefined) return undefined
  const connection = typeof ctx?.get === 'function' ? ctx.get('connection') : undefined
  if (connection !== null && connection !== undefined && typeof connection.requestRejection === 'function') {
    try {
      return connection.requestRejection(req)
    } catch {
      return 'error'
    }
  }
  return sameOrigin(req) ? undefined : 'forbidden'
}

/** 一次操作的结果信封。 */
function wallOf(store, extra = {}) {
  return { notes: store.snapshot(), now: Date.now(), ...extra }
}

/**
 * 注册路由。
 * @param {{ get?: (name: string) => unknown, effect?: (fn: () => unknown, label?: string) => unknown }} webCtx 带 webServer 的上下文
 * @param {{ store: import('./store.js').NotesStore, ready: () => Promise<unknown> }} deps
 * @returns {() => void} disposer
 */
export function registerRoutes(webCtx, deps) {
  const { store, ready } = deps

  const handler = async (req, res) => {
    try {
      if (rejectionOf(webCtx, req) !== undefined) {
        fail(res, 403, 'forbidden', 'untrusted origin')
        return
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const path = url.pathname
      const method = req.method ?? 'GET'

      if (method === 'GET' && path === `${ROUTE_PREFIX}/health`) {
        await ready()
        ok(res, { available: true, count: store.snapshot().length })
        return
      }

      if (method === 'GET' && path === `${ROUTE_PREFIX}/notes`) {
        await ready()
        ok(res, wallOf(store))
        return
      }

      if (method === 'POST' && path === `${ROUTE_PREFIX}/notes`) {
        await ready()
        const body = await readJson(req)
        const op = typeof body.op === 'string' ? body.op : ''
        if (!OPS.has(op)) {
          fail(res, 400, 'bad-request', `unknown op: ${op || '(empty)'}`)
          return
        }
        if (op === 'add') {
          const text = typeof body.text === 'string' ? body.text : ''
          if (text.trim().length === 0) {
            fail(res, 400, 'bad-request', 'text is required')
            return
          }
          if (text.length > MAX_TEXT) {
            fail(res, 400, 'bad-request', `text is longer than ${MAX_TEXT} characters`)
            return
          }
          const note = await store.add({
            text,
            color: body.color,
            category: typeof body.category === 'string' ? body.category : undefined,
            kind: typeof body.kind === 'string' ? body.kind : undefined,
          })
          ok(res, wallOf(store, { note }))
          return
        }
        if (op === 'update') {
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          if (id.length === 0) {
            fail(res, 400, 'bad-request', 'id is required')
            return
          }
          const note = await store.update(id, {
            text: typeof body.text === 'string' ? body.text : undefined,
            color: typeof body.color === 'string' ? body.color : undefined,
            category: typeof body.category === 'string' ? body.category : undefined,
            kind: typeof body.kind === 'string' ? body.kind : undefined,
            checked: Array.isArray(body.checked) ? body.checked : undefined,
            pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
            archived: typeof body.archived === 'boolean' ? body.archived : undefined,
          })
          ok(res, wallOf(store, { note }))
          return
        }
        if (op === 'check') {
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : ''
          if (id.length === 0 || itemId.length === 0) {
            fail(res, 400, 'bad-request', 'id and itemId are required')
            return
          }
          const note = await store.setItemDone(id, itemId, body.done === true)
          ok(res, wallOf(store, { note }))
          return
        }
        if (op === 'restore') {
          const note = await store.restore(body.note)
          ok(res, wallOf(store, { note }))
          return
        }
        if (op === 'remove') {
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          if (id.length === 0) {
            fail(res, 400, 'bad-request', 'id is required')
            return
          }
          const note = await store.remove(id)
          ok(res, wallOf(store, { note }))
          return
        }
        const count = await store.clear()
        ok(res, wallOf(store, { removed: count }))
        return
      }

      if (path === `${ROUTE_PREFIX}/notes` || path === `${ROUTE_PREFIX}/health`) {
        fail(res, 405, 'method-error', `${method} is not allowed here`)
        return
      }
      fail(res, 404, 'not-found', 'unknown route')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (error?.code === 'too_large') {
        fail(res, 413, 'too-large', message)
        return
      }
      if (error?.code === 'invalid_json') {
        fail(res, 400, 'invalid-json', message)
        return
      }
      if (typeof message === 'string' && (message.startsWith('没有这张便签') || message.startsWith('没有这条待办'))) {
        fail(res, 404, 'not-found', message)
        return
      }
      if (typeof message === 'string' && message.includes('不是待办')) {
        fail(res, 400, 'bad-request', message)
        return
      }
      if (typeof message === 'string' && message.includes('已存在')) {
        fail(res, 409, 'conflict', message)
        return
      }
      console.warn('[dsh-sticky-wall] route failed:', error)
      fail(res, 500, 'internal', message)
    }
  }

  return webCtx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
}
