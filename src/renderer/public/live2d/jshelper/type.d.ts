interface DefineFile {
  version: string
  layout: Record<string, number>
  hit_areas_custom: Record<string, [x: number, y: number]>
  model: string
  physics: string
  textures: string[]
  motions: Record<string, { file: string }[]>
  expressions: {
    name: string,
    file: string
  }[]
}