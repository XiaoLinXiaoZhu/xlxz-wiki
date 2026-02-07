/**
 * WebSocket 处理
 * 管理客户端连接，广播文件变更和索引更新
 */
import type { ServerWebSocket } from 'bun'
import type { WsMessage } from '../../shared/types'

/** 所有已连接的 WebSocket 客户端 */
const clients = new Set<ServerWebSocket<unknown>>()

/** 注册新的 WebSocket 连接 */
export function addClient(ws: ServerWebSocket<unknown>) {
  clients.add(ws)
  console.log(`[WS] 客户端已连接 (当前 ${clients.size} 个)`)
}

/** 移除断开的 WebSocket 连接 */
export function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws)
  console.log(`[WS] 客户端已断开 (当前 ${clients.size} 个)`)
}

/** 处理客户端发来的消息 */
export function handleMessage(_ws: ServerWebSocket<unknown>, message: string) {
  try {
    const msg = JSON.parse(message) as WsMessage
    if (msg.type === 'refresh-index') {
      console.log('[WS] 收到刷新索引请求')
      // TODO: Day 3 接入 WikiIndexer 重建索引
    }
  } catch {
    console.warn('[WS] 无法解析消息:', message)
  }
}

/** 向所有客户端广播消息 */
export function broadcast(message: WsMessage) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    try {
      client.send(data)
    } catch {
      // 发送失败，移除该客户端
      clients.delete(client)
    }
  }
}

/** 获取当前连接数 */
export function getClientCount(): number {
  return clients.size
}
