import {
  postBuild
} from './build'

import { exec } from 'child_process'

async function main() {
  await new Promise(resolve => exec('tsc', resolve))
  await postBuild()
}

main()