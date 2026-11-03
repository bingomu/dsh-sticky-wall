/**
 * dsh-sticky-wall · 宿主半
 *
 * 便签墙：一个 JSON 文件、三个 agent 工具、一条 HTTP 路由。
 * 没有设置、没有数据库——插件只做一件事：让随手记下的想法不丢。
 *
 * @module dsh-sticky-wall
 */

import { NotesStore } from './lib/store.js'
import { registerRoutes } from './lib/routes.js'
import { registerTools } from './lib/tools.js'

export const name = 'dsh-sticky-wall'

/** 工具注册表是硬依赖；webServer 可选（纯 CLI 环境没有）。 */
export const inject = ['tools']

/**
 * 挂载宿主半。
 * @param {*} ctx cordis 插件上下文
 */
export function apply(ctx) {
  const store = new NotesStore()
  const ready = () => store.ready()

  // 启动就先读一次：坏文件尽早暴露成一条警告，而不是等用户第一次点击。
  ready().catch((error) => {
    console.warn(`[dsh-sticky-wall] 便签加载失败（${store.file}）：`, error)
  })

  try {
    const disposers = registerTools(ctx, { store, ready })
    ctx.effect(() => () => {
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch {
          // 工具随插件一起卸载。
        }
      }
    }, 'dsh-sticky-wall: tools')
  } catch (error) {
    console.warn('[dsh-sticky-wall] 工具注册失败：', error)
  }

  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['webServer'], (webCtx) => {
        const dispose = registerRoutes(webCtx, { store, ready })
        webCtx.effect(() => dispose, 'dsh-sticky-wall: routes')
      })
    } else {
      const dispose = registerRoutes(ctx, { store, ready })
      ctx.effect(() => dispose, 'dsh-sticky-wall: routes')
    }
  } catch (error) {
    console.warn('[dsh-sticky-wall] 路由注册失败：', error)
  }
}
