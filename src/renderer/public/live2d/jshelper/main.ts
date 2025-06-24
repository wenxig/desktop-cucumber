import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const base: DefineFile = {
  "version": "Sample 1.0.0",
  "layout": {
    "center_x": 0,
    "center_y": 0,
    "width": 2
  },
  "hit_areas_custom": {
    "head_x": [
      -0.25,
      1
    ],
    "head_y": [
      0.25,
      0.2
    ],
    "body_x": [
      -0.3,
      0.2
    ],
    "body_y": [
      0.3,
      -1.9
    ]
  },
  "model": "",
  "physics": "",
  "textures": [],
  "motions": {},
  "expressions": []
}
const path_join = (...paths: string[]) => path.join(...paths.map(v => v.replaceAll(path.sep, '/'))).replaceAll(path.sep, '/')

for (const url of (await fs.readdir(path_join(__dirname, '..'))).filter(n => n.includes('musumi_'))) {
  const rootPath = path_join(__dirname, '..', url)
  const contentPath = path_join(rootPath, 'live2d', 'chara')
  const relativeContentPath = path_join('live2d', 'chara')
  const defineFilePath = path_join(rootPath, 'model.json')

  const fillerFile = (ext: string, names: string[]) => names.filter(v => path.extname(v).replaceAll('.', '') == ext)
  const contentFileNames = await fs.readdir(contentPath)

  const useMotions = (define: DefineFile) => {
    for (const file of fillerFile('mtn', contentFileNames)) {
      (define.motions[file.split('.')[0].replace(/\d+/ig, '')] ??= []).push({
        file: path_join(relativeContentPath, file)
      })
    }
  }
  const useTexture = (define: DefineFile) => {
    for (const file of fillerFile('png', contentFileNames)) {
      define.textures.push(path_join(relativeContentPath, file))
    }
  }
  const usePhysics = (define: DefineFile) => {
    for (const file of fillerFile('json', contentFileNames)) {
      if (file.includes('physics')) {
        define.physics = path_join(relativeContentPath, file)
        break
      }
    }
    return define
  }
  const useExpressions = (define: DefineFile) => {
    for (const file of contentFileNames.filter(v => v.endsWith('.exp.json'))) {
      define.expressions.push({
        name: file.split('.')[0],
        file: path_join(relativeContentPath, file)
      })
    }
  }
  const useModel = (define: DefineFile) => {
    const file = fillerFile('moc', contentFileNames).at(0)
    if (!file) return define
    define.model = path_join(relativeContentPath, file)
    return define
  }
  const _base = JSON.parse(JSON.stringify(base))
  const main = () => {
    useTexture(_base)
    useMotions(_base)
    usePhysics(_base)
    useExpressions(_base)
    useModel(_base)
  }
  main()
  await fs.writeFile(defineFilePath, JSON.stringify(_base))
  console.log(_base)
}