import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = resolve(root, '.tmp/runtime')
const backend = resolve(runtime, 'backend')
const backendSha = 'bf8010db3b4256915dd0d05de93ea7fa29957e2e'
const patch = resolve(root, 'integration/backend.patch')

function git(args, cwd = root, allowFailure = false) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `git ${args[0]} failed`)
  }
  return result
}

try {
  if (!existsSync(patch)) throw new Error('Missing integration/backend.patch')
  mkdirSync(runtime, { recursive: true })

  if (!existsSync(backend)) {
    console.log('Downloading the pinned backend source…')
    git(['clone', '--filter=blob:none', '--no-checkout',
      'https://github.com/Perry-Utkonos/Perry-Utkonos-backend.git', backend])
    git(['fetch', '--depth', '1', 'origin', backendSha], backend)
    git(['checkout', '--detach', backendSha], backend)
  }

  if (!existsSync(resolve(backend, '.git'))) {
    throw new Error(`${backend} exists but is not a Git checkout`)
  }
  if (git(['rev-parse', 'HEAD'], backend).stdout.trim() !== backendSha) {
    throw new Error('The runtime backend checkout is at another commit; local files were left untouched')
  }

  if (git(['apply', '--check', patch], backend, true).status === 0) {
    git(['apply', patch], backend)
    console.log('Applied the backend integration patch.')
  } else if (git(['apply', '--reverse', '--check', patch], backend, true).status === 0) {
    console.log('The backend integration patch is already applied.')
  } else {
    throw new Error('The backend patch does not apply cleanly; local files were left untouched')
  }

  const envPath = resolve(runtime, 'compose.env')
  if (!existsSync(envPath)) {
    const secret = () => randomBytes(48).toString('base64url')
    writeFileSync(envPath, [
      `POSTGRES_PASSWORD=${secret()}`,
      `JWT_SIGNING_KEY=${secret()}`,
      'WEB_PORT=8080',
      '',
    ].join('\n'), { flag: 'wx', mode: 0o600 })
    console.log('Created .tmp/runtime/compose.env with local secrets.')
  } else {
    console.log('Kept the existing local secrets in .tmp/runtime/compose.env.')
  }

  console.log('Ready: docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml up --build -d')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
