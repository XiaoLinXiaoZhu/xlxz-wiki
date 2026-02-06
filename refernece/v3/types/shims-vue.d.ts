// 全局 Vue SFC 与临时模块声明，降低类型耦合，保证本仓库可独立通过类型检查
declare module '*.vue' {
  type DefineComponent = any
  const component: DefineComponent
  export default component
}

declare module '@temp/wiki-index' {
  const data: any
  export default data
}

// 让 TS 识别 Vite HMR 上的 import.meta.hot
interface ImportMetaEnv {}
interface ImportMeta {
  readonly env: ImportMetaEnv
  hot?: {
    accept: (dep?: any, callback?: (...args: any[]) => void) => void
  }
}


