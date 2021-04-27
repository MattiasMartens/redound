import {
  postBuild
} from './build'

const TscWatchClient = require('tsc-watch/client')
const watch = new TscWatchClient()

let isExecuting = false
watch.on('success', async () => {
  if (!isExecuting) {
    isExecuting = true
    await postBuild()
    isExecuting = false
  }
})

watch.start('--project', '.')
