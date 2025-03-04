import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { is } from '@electron-toolkit/utils'

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

// For development testing
if (is.dev) {
  // In development, we can use a local file path for testing
  autoUpdater.forceDevUpdateConfig = true
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

  // Check for updates immediately when the app starts
  // In production builds, we always check
  // In development, we only check if forceDevUpdateConfig is true
  if (app.isPackaged || (is.dev && autoUpdater.forceDevUpdateConfig)) {
    setTimeout(() => {
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
    return { updateAvailable: false }
  }

  try {
    await autoUpdater.checkForUpdates()
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
    autoUpdater.quitAndInstall(false, true)
  }
}

/**
 * Get the current update status
 */
export function getUpdateStatus(): { updateAvailable: boolean; updateDownloaded: boolean } {
  return { updateAvailable, updateDownloaded }
}
