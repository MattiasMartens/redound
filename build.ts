import {
  readFile,
  readdir,
  writeFile
} from 'fs/promises'

import {
  resolve
} from 'path'

async function* getFiles(dir: string, nestingLevel = 0): AsyncGenerator<{ file: string, nestingLevel: number }> {
  const directoryEntities = await readdir(dir, { withFileTypes: true })
  for (const directoryEntity of directoryEntities) {
    const res = resolve(dir, directoryEntity.name)
    if (directoryEntity.isDirectory()) {
      yield* getFiles(res, nestingLevel + 1)
    } else {
      yield { file: res, nestingLevel }
    }
  }
}

const TscWatchClient = require('tsc-watch/client')
const watch = new TscWatchClient()

const times = <T>(t: T, n: number) => {
  const ret = [] as T[]
  for (let i = 0; i < n; i++) {
    ret[i] = t
  }
  return ret
}

async function patchInModulePaths({ file, nestingLevel }: { file: string, nestingLevel: number }) {
  const equivalent = times("../", nestingLevel).join("")
  const content = await readFile(file, 'utf-8')

  // Hope the file doesn't have the exact string @/ in any unexpected places...
  const replaced = content.replace(/@\//g, equivalent)
  await writeFile(file, replaced)
}

watch.on('success', async () => {
  const promises = [] as Promise<any>[]

  for await (const nestedFile of (getFiles('./dist'))) {
    patchInModulePaths(nestedFile)
  }

  await Promise.all(promises)
})

watch.start('--project', 'src')
