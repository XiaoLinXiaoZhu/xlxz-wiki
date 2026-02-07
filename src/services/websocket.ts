/**
 * WebSocket 客户端
 * 连接后端 WebSocket，接收文件变更和索引更新推送
 */
import { useWikiStore } from '@/stores/wiki'
import type { WsMessage } from '@shared/types'

let ws: WebSocket | null = null
let reconnectTimer: number | null = null

/** 重连间隔（ms） */
const RECONNECT_INTERVAL = 3000

/** 最大重连次数 */
const MAX_RECONNECT = 10

let reconnectCount = 0

/**
 * 初始化 WebSocket 连接
 */
export function initWebSocket(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${location.host}/ws`

  console.log('[WS] 正在连接:', url)
  ws = new WebSocket(url)

  ws.onopen = () => {
    console.log('[WS] 已连接')
    reconnectCount = 0
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WsMessage
      handleMessage(msg)
    } catch {
      console.warn('[WS] 无法解析消息:', event.data)
    }
  }

  ws.onclose = () => {
    console.log('[WS] 连接已关闭')
    ws = null
    scheduleReconnect()
  }

  ws.onerror = () => {
    // onclose 会紧随其后触发，在那里处理重连
    ws?.close()
  }
}

/**
 * 处理服务器推送的消息
 */
function handleMessage(msg: WsMessage): void {
  const store = useWikiStore()

  switch (msg.type) {
    case 'file-changed': {
      const { path, action } = msg.payload
      console.log(`[WS] 文件${action === 'create' ? '新增' : action === 'delete' ? '删除' : '变更'}: ${path}`)

      // 如果当前正在查看该文件且文件被更新，重新加载
      if (action === 'update' && store.currentFile === path) {
        store.loadFile(path)
      }

      // 文件新增或删除时，刷新文件树
      if (action === 'create' || action === 'delete') {
        store.fetchFileTree()
      }
      break
    }

    case 'index-updated': {
      console.log('[WS] 索引已更新')
      store.updateIndex(msg.payload)
      break
    }
  }
}

/**
 * 安排重连
 */
function scheduleReconnect(): void {
  if (reconnectTimer !== null) return
  if (reconnectCount >= MAX_RECONNECT) {
    console.warn('[WS] 已达最大重连次数，停止重连')
    return
  }

  reconnectCount++
  console.log(`[WS] ${RECONNECT_INTERVAL}ms 后重连 (第 ${reconnectCount} 次)`)

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    initWebSocket()
  }, RECONNECT_INTERVAL)
}

/**
 * 关闭 WebSocket 连接
 */
export function closeWebSocket(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}
