/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  const taskLists: MarkdownIt.PluginWithOptions<{
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }>
  export default taskLists
}

/** 由 vite define 注入的应用版本号（来自 package.json） */
declare const __APP_VERSION__: string
