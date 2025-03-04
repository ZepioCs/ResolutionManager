import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { is } from '@electron-toolkit/utils'
import path from 'path'
import fs from 'fs'

// Configure logging
log.transports.file.level = 'debug' // Set to debug for more detailed logs
autoUpdater.logger = log

// Log important autoUpdater events
log.info('App version:', app.getVersion())
log.info('Electron version:', process.versions.electron)

// Configure autoUpdater
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// For development testing
if (is.dev) {
  // In development, we can use a local file path for testing
  autoUpdater.forceDevUpdateConfig = true
  log.info(
    'Running in development mode with forceDevUpdateConfig:',
    autoUpdater.forceDevUpdateConfig
  )
}

// Variables to track update state
let updateAvailable = false
let updateDownloaded = false
let mainWindow: BrowserWindow | null = null

/**
 * Initialize the auto updater
 * @param window The main application window
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  log.info('Initializing auto-updater')
  log.info('Current app version:', app.getVersion())

  // Check for updates immediately when the app starts
  // In production builds, we always check
  // In development, we only check if forceDevUpdateConfig is true
  if (app.isPackaged || (is.dev && autoUpdater.forceDevUpdateConfig)) {
    setTimeout(() => {
      log.info('Checking for updates after startup delay')
      checkForUpdates()
    }, 3000) // Wait 3 seconds after app start
  }

  // Set up event handlers
  setupAutoUpdaterEvents()
}

/**
 * Check for updates manually
 * @returns Promise that resolves with update check result
 */
export async function checkForUpdates(): Promise<{ updateAvailable: boolean }> {
  // In development, only check if forceDevUpdateConfig is true
  if (!app.isPackaged && !autoUpdater.forceDevUpdateConfig) {
    log.info('Skipping update check in development mode')
    return { updateAvailable: false }
  }

  try {
    log.info('Manually checking for updates...')

    // Log the GitHub configuration from dev-app-update.yml or electron-builder.yml
    try {
      let configPath = path.join(process.cwd(), 'dev-app-update.yml')
      if (!fs.existsSync(configPath) && app.isPackaged) {
        configPath = path.join(process.resourcesPath, 'app-update.yml')
      }

      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        log.info('Update config file content:', configContent)
      } else {
        log.warn('Update config file not found at:', configPath)
      }
    } catch (configError) {
      log.error('Error reading update config:', configError)
    }

    await autoUpdater.checkForUpdates()
    log.info('Check for updates completed, updateAvailable:', updateAvailable)
    return { updateAvailable }
  } catch (error) {
    log.error('Error checking for updates:', error)
    return { updateAvailable: false }
  }
}

/**
 * Set up all the event handlers for the auto updater
 */
function setupAutoUpdaterEvents(): void {
  // When checking for updates
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
  })

  // When an update is available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info)
    updateAvailable = true

    // Notify the renderer process that an update is available
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }

    // Show a notification to the user
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) of ResolutionManager is available.`,
      detail:
        'The update is being downloaded in the background. You will be notified when it is ready to install.',
      buttons: ['OK']
    })
  })

  // When no update is available
  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available:', info)
    updateAvailable = false

    // Notify the renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available')
    }
  })

  // When the update has been downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info)
    updateDownloaded = true

    // Notify the renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }

    // Prompt the user to restart the app to install the update
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `A new version (${info.version}) of ResolutionManager has been downloaded.`,
        detail: 'Would you like to restart the application now to install the update?',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  // When there's an error with the update
  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err)

    // Notify the renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message)
    }
  })

  // Progress of download
  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`)

    // Send progress to renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progressObj)
    }
  })
}

/**
 * Install the downloaded update
 */
export function installUpdate(): void {
  if (updateDownloaded) {
    log.info('Installing update...')
    autoUpdater.quitAndInstall(false, true)
  } else {
    log.warn('Attempted to install update, but no update has been downloaded')
  }
}

/**
 * Get the current update status
 */
export function getUpdateStatus(): { updateAvailable: boolean; updateDownloaded: boolean } {
  return { updateAvailable, updateDownloaded }
}
