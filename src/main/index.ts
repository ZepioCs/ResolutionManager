import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import monitor from 'monitorres'
import path from 'path'
import { createTray, destroyTray, isForceQuit } from './tray'

// Cast monitor to our extended interface
const monitorLib = monitor

// Configuration for monitor settings
interface MonitorConfig {
  id: string
  width: number
  height: number
  refreshRate?: number
  timestamp: number
}

// Path to store monitor configurations
const getMonitorConfigPath = async (): Promise<string> => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'monitorConfigurations.json')
}

// Default resolutions for when the file doesn't exist
const defaultResolutionsList = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 }
]

// Get paths for configuration files
const getDefaultResolutionsPath = async (): Promise<string> => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'defaultResolutions.json')
}

const getLastResolutionPath = async (): Promise<string> => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'lastResolution.json')
}

const getSettingsPath = async (): Promise<string> => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'settings.json')
}

const getMonitorLabelsPath = async (): Promise<string> => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'monitorLabels.json')
}

// Helper function to log with timestamp
function logWithTime(message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, ...args)
}

// Global reference to the main window
let mainWindow: BrowserWindow | null = null
// Flag to track if we should minimize to tray
let minimizeToTray = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 800,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()

      // Request favorites from renderer once the window is ready
      mainWindow.webContents.on('did-finish-load', () => {
        logWithTime('Main window finished loading, requesting favorites')
        if (mainWindow) {
          mainWindow.webContents.send('request-favorites')
        }
      })
    } else {
      logWithTime('Main window is not ready to show')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle close event
  mainWindow.on('close', (event) => {
    // If force quit is true or minimize to tray is false, allow the window to close
    if (isForceQuit() || !minimizeToTray) {
      return true
    }

    // Otherwise, prevent default and hide the window
    event.preventDefault()
    if (mainWindow) {
      mainWindow.hide()
    }
    return false
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Create the tray icon
  createTray(mainWindow)
}

// Check if configuration files exist
async function checkConfigFiles(): Promise<Record<string, boolean>> {
  try {
    const defaultResolutionsPath = await getDefaultResolutionsPath()
    const lastResolutionPath = await getLastResolutionPath()
    const settingsPath = await getSettingsPath()
    const monitorConfigPath = await getMonitorConfigPath()
    const monitorLabelsPath = await getMonitorLabelsPath()

    return {
      defaultResolutions: fs.existsSync(defaultResolutionsPath),
      lastResolution: fs.existsSync(lastResolutionPath),
      settings: fs.existsSync(settingsPath),
      monitorConfigurations: fs.existsSync(monitorConfigPath),
      monitorLabels: fs.existsSync(monitorLabelsPath)
    }
  } catch (error) {
    logWithTime('Error checking config files:', error)
    return {
      defaultResolutions: false,
      lastResolution: false,
      settings: false,
      monitorConfigurations: false,
      monitorLabels: false
    }
  }
}

// Create default configuration files
async function createDefaultResolutionsFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultResolutionsPath = await getDefaultResolutionsPath()
    fs.writeFileSync(defaultResolutionsPath, JSON.stringify(defaultResolutionsList, null, 2))
    logWithTime('Created default resolutions file at:', defaultResolutionsPath)
    return { success: true }
  } catch (error) {
    logWithTime('Error creating default resolutions file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function createLastResolutionFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const lastResolutionPath = await getLastResolutionPath()
    // Create an empty last resolution file with a placeholder
    const emptyLastResolution = {
      monitor: '',
      resolution: '1920x1080'
    }
    fs.writeFileSync(lastResolutionPath, JSON.stringify(emptyLastResolution, null, 2))
    logWithTime('Created last resolution file at:', lastResolutionPath)
    return { success: true }
  } catch (error) {
    logWithTime('Error creating last resolution file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function createSettingsFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const settingsPath = await getSettingsPath()
    // Create default settings
    const defaultSettings = {
      startOnBoot: false,
      useLastResolution: false,
      minimizeToTray: false
    }
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2))
    logWithTime('Created settings file at:', settingsPath)
    return { success: true }
  } catch (error) {
    logWithTime('Error creating settings file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function createMonitorConfigurationsFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const monitorConfigPath = await getMonitorConfigPath()
    // Create an empty monitor configurations file
    fs.writeFileSync(monitorConfigPath, JSON.stringify({}, null, 2))
    logWithTime('Created monitor configurations file at:', monitorConfigPath)
    return { success: true }
  } catch (error) {
    logWithTime('Error creating monitor configurations file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function createMonitorLabelsFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const monitorLabelsPath = await getMonitorLabelsPath()
    // Create an empty monitor labels file
    const emptyMonitorLabels = []
    fs.writeFileSync(monitorLabelsPath, JSON.stringify(emptyMonitorLabels, null, 2))
    logWithTime('Created monitor labels file at:', monitorLabelsPath)
    return { success: true }
  } catch (error) {
    logWithTime('Error creating monitor labels file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this _ occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle the IPC calls from the renderer process.
  ipcMain.handle('get-login-item-settings', () => {
    return app.getLoginItemSettings()
  })

  ipcMain.on('set-login-item-settings', (_, options) => {
    app.setLoginItemSettings(options)
  })

  ipcMain.handle('get-path', (_, path) => {
    logWithTime('get-path: path:', path)
    return app.getPath(path)
  })

  ipcMain.on('write-file-sync', (_, options) => {
    try {
      fs.writeFileSync(options.path, options.data)
      logWithTime('Successfully wrote file:', options.path)
    } catch (error) {
      logWithTime('Error writing file:', options.path, error)
    }
  })

  // Add handler for minimize to tray setting
  ipcMain.on('set-minimize-to-tray', async (_, value) => {
    try {
      const settingsPath = await getSettingsPath()
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8')
        const settings = JSON.parse(data)
        settings.minimizeToTray = value
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      }
      minimizeToTray = value
      logWithTime('Set minimize to tray:', value)
    } catch (error) {
      logWithTime('Error setting minimize to tray:', error)
    }
  })

  // Add handler for quit-application event
  ipcMain.on('quit-application', () => {
    logWithTime('Received quit-application event, forcing app to quit')

    // Call destroyTray to clean up
    destroyTray()

    // Force quit the app
    app.exit(0)
  })

  ipcMain.handle('read-file-sync', (_, options) => {
    logWithTime(
      'read-file-sync: options.path:',
      options.path,
      'options.encoding:',
      options.encoding
    )
    try {
      return fs.readFileSync(options.path, options.encoding)
    } catch (error) {
      logWithTime('Error reading file:', options.path, error)
      throw error
    }
  })

  ipcMain.handle('exists-sync', (_, path) => {
    logWithTime('exists-sync: path:', path)
    return fs.existsSync(path)
  })

  // Get minimize to tray setting
  ipcMain.handle('get-minimize-to-tray', async () => {
    try {
      const settingsPath = await getSettingsPath()
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8')
        const settings = JSON.parse(data)
        minimizeToTray = settings.minimizeToTray || false
        return minimizeToTray
      }
      return false
    } catch (error) {
      logWithTime('Error getting minimize to tray setting:', error)
      return false
    }
  })

  // New IPC handlers for config file management
  ipcMain.handle('check-config-files', async () => {
    return await checkConfigFiles()
  })

  ipcMain.handle('create-default-resolutions-file', async () => {
    return await createDefaultResolutionsFile()
  })

  ipcMain.handle('create-last-resolution-file', async () => {
    return await createLastResolutionFile()
  })

  ipcMain.handle('create-settings-file', async () => {
    return await createSettingsFile()
  })

  ipcMain.handle('create-monitor-configurations-file', async () => {
    return await createMonitorConfigurationsFile()
  })

  ipcMain.handle('create-monitor-labels-file', async () => {
    return await createMonitorLabelsFile()
  })

  // Create all missing config files at once
  ipcMain.handle('create-all-config-files', async () => {
    const configStatus = await checkConfigFiles()
    const results: Record<string, { success: boolean; error?: string }> = {}

    if (!configStatus.defaultResolutions) {
      results.defaultResolutions = await createDefaultResolutionsFile()
    }

    if (!configStatus.lastResolution) {
      results.lastResolution = await createLastResolutionFile()
    }

    if (!configStatus.settings) {
      results.settings = await createSettingsFile()
    }

    if (!configStatus.monitorConfigurations) {
      results.monitorConfigurations = await createMonitorConfigurationsFile()
    }

    if (!configStatus.monitorLabels) {
      results.monitorLabels = await createMonitorLabelsFile()
    }

    return results
  })

  // Enhanced monitor information
  ipcMain.handle('get-monitors', () => {
    const displays = screen.getAllDisplays()
    logWithTime('Retrieved all displays:', displays.length)
    return displays.map((display) => {
      return {
        displayId: display.id,
        width: display.bounds.width,
        height: display.bounds.height,
        x: display.bounds.x,
        y: display.bounds.y,
        scaleFactor: display.scaleFactor,
        rotation: display.rotation,
        touchSupport: display.touchSupport,
        accelerometerSupport: display.accelerometerSupport,
        colorDepth: display.colorDepth,
        colorSpace: display.colorSpace,
        depthPerComponent: display.depthPerComponent,
        size: display.size,
        workArea: display.workArea,
        workAreaSize: display.workAreaSize,
        internal: display.internal,
        monochrome: display.monochrome,
        isPrimary: display.id === screen.getPrimaryDisplay().id
      }
    })
  })

  // Enhanced custom monitors with more details
  ipcMain.handle('get-custom-monitors', () => {
    try {
      const customMonitors = monitorLib.getAllMonitors()
      logWithTime('Retrieved custom monitors:', customMonitors.length)
      return customMonitors
    } catch (error) {
      logWithTime('Error getting custom monitors:', error)
      // Fallback to Electron's display API if custom monitor library fails
      return screen.getAllDisplays().map((display) => ({
        id: display.id.toString(),
        name: `Display ${display.id}`,
        displayId: display.id,
        width: display.bounds.width,
        height: display.bounds.height,
        bounds: display.bounds,
        isPrimary: display.id === screen.getPrimaryDisplay().id
      }))
    }
  })

  // Get available resolutions for a specific monitor
  ipcMain.handle('get-available-resolutions', (_, monitorId) => {
    try {
      if (monitorLib.getAvailableResolutions) {
        const resolutions = monitorLib.getAvailableResolutions(monitorId)
        logWithTime(
          `Retrieved ${resolutions.length} available resolutions for monitor ${monitorId}`
        )
        return resolutions
      } else {
        // Fallback to common resolutions if the function doesn't exist
        logWithTime('getAvailableResolutions not available in monitor library, using fallback')
        return [
          { width: 1920, height: 1080 },
          { width: 1680, height: 1050 },
          { width: 1600, height: 900 },
          { width: 1440, height: 900 },
          { width: 1366, height: 768 },
          { width: 1280, height: 1024 },
          { width: 1280, height: 800 },
          { width: 1280, height: 720 },
          { width: 1024, height: 768 }
        ]
      }
    } catch (error) {
      logWithTime('Error getting available resolutions:', error)
      return []
    }
  })

  // Enhanced set resolution with refresh rate and error handling
  ipcMain.on('set-resolution', (event, { id, width, height, refreshRate }) => {
    logWithTime('set-resolution request:', { id, width, height, refreshRate })
    logWithTime('refreshRate type:', typeof refreshRate, 'value:', refreshRate)

    try {
      if (!monitorLib.setMonitorResolution) {
        throw new Error('setMonitorResolution function not available')
      }

      if (refreshRate !== undefined && refreshRate !== null) {
        logWithTime('Using setMonitorResolution with refresh rate:', refreshRate)
        monitorLib.setMonitorResolution(id, width, height, refreshRate)
        logWithTime('Successfully set resolution with refresh rate')
      } else {
        logWithTime('Using setMonitorResolution without refresh rate')
        monitorLib.setMonitorResolution(id, width, height)
        logWithTime('Successfully set resolution')
      }
      event.reply('resolution-change-result', { success: true })

      // Save the configuration
      saveMonitorConfiguration({ id, width, height, refreshRate, timestamp: Date.now() }).catch(
        (err) => logWithTime('Error saving monitor configuration:', err)
      )
    } catch (error) {
      logWithTime('Error setting resolution:', error)
      event.reply('resolution-change-result', {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })

  // Save monitor configuration
  async function saveMonitorConfiguration(config: MonitorConfig): Promise<void> {
    try {
      const configPath = await getMonitorConfigPath()
      let configurations: Record<string, MonitorConfig> = {}

      // Read existing configurations if available
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8')
        configurations = JSON.parse(data)
      }

      // Update configuration for this monitor
      configurations[config.id] = config

      // Write back to file
      fs.writeFileSync(configPath, JSON.stringify(configurations, null, 2))
      logWithTime('Saved monitor configuration for monitor:', config.id)
    } catch (error) {
      logWithTime('Error saving monitor configuration:', error)
      throw error
    }
  }

  // Get saved monitor configurations
  ipcMain.handle('get-monitor-configurations', async () => {
    try {
      const configPath = await getMonitorConfigPath()
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(data)
      }
      return {}
    } catch (error) {
      logWithTime('Error getting monitor configurations:', error)
      return {}
    }
  })

  // Apply saved configuration for a monitor
  ipcMain.handle('apply-saved-configuration', async (_, monitorId) => {
    try {
      const configPath = await getMonitorConfigPath()
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8')
        const configurations = JSON.parse(data)

        if (configurations[monitorId]) {
          const config = configurations[monitorId]

          if (config.refreshRate && monitorLib.setMonitorResolution) {
            monitorLib.setMonitorResolution(
              monitorId,
              config.width,
              config.height,
              config.refreshRate
            )
          } else {
            monitorLib.setMonitorResolution(monitorId, config.width, config.height)
          }

          logWithTime('Applied saved configuration for monitor:', monitorId)
          return { success: true }
        }
      }
      return { success: false, error: 'No saved configuration found' }
    } catch (error) {
      logWithTime('Error applying saved configuration:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up before quitting
app.on('before-quit', () => {
  destroyTray()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
