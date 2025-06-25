import type { Rectangle } from "electron"
type Api = {
  tiggerTaskBarHideStatue: []
  moudleDone: []
}
export type Inject = {
  api<T extends keyof Api>(k: T, ...args: Api[T]): void
  sharedValue: {
    sync(name: string, v: any): void
    boot<T>(name: string): T
    watch<T>(name: string, cb: (v: T) => void): () => void
  }
  event<T extends keyof On['event']>(event: T, callback: (...p: On['event'][T]) => void): () => void
}

export type On = {
  event: {
    'workspace-changed': [is: 'show' | 'hide']
  }
}


export interface MoudlesJson {
  moudle: Moudle[]
}
export interface Moudle {
  url: string,
  type: 'github',
  enable: boolean
}