import {
  readFile,
  readdir,
  writeFile
} from 'fs/promises'

import {
  resolve
} from 'path'

import * as Mocha from 'mocha'

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

function clearRequireCache() {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key]
  })
}

async function doMocha() {
  const mocha = new Mocha()
  const testDir = './compiled/test'

  // Add each .js file to the mocha instance
  const fileGenerator = getFiles(testDir)

  for await (const { file } of fileGenerator) {
    if (file.endsWith(".test.js") && file.includes("queryable")) {
      mocha.addFile(file)
    }
  }

  mocha.run(() => {
    clearRequireCache()
    mocha.dispose()
  })
}

const times = <T>(t: T, n: number) => {
  const ret = [] as T[]
  for (let i = 0; i < n; i++) {
    ret[i] = t
  }
  return ret
}

function replaceSrcAlias(content: string, nestingLevel: number) {
  const equivalent = times("../", nestingLevel).join("") + "src/"

  // Hope the file doesn't have the exact string @/ in any unexpected places...
  return content.replace(/@\//g, equivalent)
}

function replaceTestAlias(content: string, nestingLevel: number) {
  const testEquivalent = times("../", nestingLevel).join("") + "test/"


  // Hope the file doesn't have the exact string @/test in any unexpected places...
  return content.replace(/@test\//g, testEquivalent)
}

async function patchInModulePaths({ file, nestingLevel }: { file: string, nestingLevel: number }) {
  const content = await readFile(file, 'utf-8')

  await writeFile(
    file,
    replaceSrcAlias(
      replaceTestAlias(
        content,
        nestingLevel
      ),
      nestingLevel
    )
  )
}

export async function postBuild() {
  const promises = [] as Promise<any>[]

  for await (const nestedFile of (getFiles('./compiled'))) {
    promises.push(patchInModulePaths(nestedFile))
  }

  await Promise.all(promises)
  await doMocha()
}
