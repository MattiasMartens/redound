import {
  postBuild
} from './build'

const TscWatchClient = require('tsc-watch/client')
const watch = new TscWatchClient()

watch.on('success', async () => {
  await postBuild()
})

watch.start('--project', '.')
