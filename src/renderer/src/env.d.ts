/// <reference types="vite/client" />

declare module 'pixi-live2d-display/cubism2' {
  // 先把主模块的所有声明都导出过来
  export * from 'pixi-live2d-display'
  // 再把默认导出也映射过去（如果你平时是这样 import P from ...）
  import P from 'pixi-live2d-display'
  export default P
}