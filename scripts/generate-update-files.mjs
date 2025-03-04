import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get the package.json to read the version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
const version = packageJson.version

console.log(`Generating update files for version ${version}`)

// Paths to the installer files
const installerPath = path.join(__dirname, '../dist/ResolutionManager-Setup-' + version + '.exe')
const portablePath = path.join(__dirname, '../dist/ResolutionManager-Portable-' + version + '.exe')

// Check if the installer exists
if (!fs.existsSync(installerPath)) {
  console.error(`Installer not found at: ${installerPath}`)
  console.error('Please build the application first using: bun run build:win')
  process.exit(1)
}

// Generate SHA512 hash for the installer
function generateSha512(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)
  return hashSum.digest('base64')
}

const installerSha512 = generateSha512(installerPath)
const installerSize = fs.statSync(installerPath).size

let portableSha512 = ''
let portableSize = 0

if (fs.existsSync(portablePath)) {
  portableSha512 = generateSha512(portablePath)
  portableSize = fs.statSync(portablePath).size
}

// Create the latest.yml file
const latestYml = `version: ${version}
files:
  - url: ResolutionManager-Setup-${version}.exe
    sha512: ${installerSha512}
    size: ${installerSize}
${
  portableSha512
    ? `  - url: ResolutionManager-Portable-${version}.exe
    sha512: ${portableSha512}
    size: ${portableSize}`
    : ''
}
path: ResolutionManager-Setup-${version}.exe
sha512: ${installerSha512}
releaseDate: ${new Date().toISOString()}`

// Write the latest.yml file
const latestYmlPath = path.join(__dirname, '../dist/latest.yml')
fs.writeFileSync(latestYmlPath, latestYml)

console.log(`Generated latest.yml at: ${latestYmlPath}`)
console.log('')
console.log('To complete the update process:')
console.log('1. Upload this file to your GitHub release at:')
console.log(`   https://github.com/zepiocs/ResolutionManager/releases/tag/v${version}`)
console.log('')
console.log('2. Make sure the following files are in your release:')
console.log(`   - ResolutionManager-Setup-${version}.exe`)
if (portableSha512) {
  console.log(`   - ResolutionManager-Portable-${version}.exe`)
}
console.log('   - latest.yml')
console.log('')
console.log('3. After uploading, your auto-update system should work correctly.')
