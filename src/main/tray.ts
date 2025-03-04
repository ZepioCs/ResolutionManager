import { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { IResolution, IFavoriteResolution, IMonitorLabel } from '../renderer/src/interfaces'
import fs from 'fs'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let favoriteResolutions: IFavoriteResolution[] = []
let monitorLabels: IMonitorLabel[] = []
// Add a flag to force quit the app
let forceQuit = false

// Function to load favorites from localStorage file
async function loadFavoritesFromStorage(): Promise<void> {
  try {
    const userDataPath = app.getPath('userData')
    const localStoragePath = path.join(userDataPath, 'Local Storage', 'leveldb')

    // Check if we can access the localStorage directly
    if (fs.existsSync(localStoragePath)) {
      console.log('Attempting to load favorites from localStorage file')

      // Since directly reading from leveldb is complex, we'll use a simpler approach
      // Try to read from a custom favorites file if it exists
      const favoritesPath = path.join(userDataPath, 'favorites.json')

      if (fs.existsSync(favoritesPath)) {
        const data = fs.readFileSync(favoritesPath, 'utf-8')
        const favorites = JSON.parse(data)

        if (Array.isArray(favorites)) {
          // Filter out invalid favorites
          const validFavorites = favorites.filter(
            (favorite) =>
              favorite &&
              typeof favorite === 'object' &&
              typeof favorite.resolution === 'string' &&
              (favorite.resolution.match(/^(\d+)x(\d+)@(\d+)$/) ||
                favorite.resolution.match(/^(\d+)x(\d+)$/))
          )

          if (validFavorites.length !== favorites.length) {
            console.warn(
              `Filtered out ${favorites.length - validFavorites.length} invalid favorites when loading`
            )

            // Save the cleaned favorites back to file
            fs.writeFileSync(favoritesPath, JSON.stringify(validFavorites))
            console.log('Saved cleaned favorites to file during load')
          }

          favoriteResolutions = validFavorites
          console.log('Loaded favorites from file:', favoriteResolutions)

          // Also load monitor labels
          loadMonitorLabelsFromStorage()

          updateTrayMenu()
          return
        }
      }
    }

    console.log('No favorites file found, using empty favorites list')
  } catch (error) {
    console.error('Error loading favorites from storage:', error)
  }
}

// Function to load monitor labels from localStorage file
async function loadMonitorLabelsFromStorage(): Promise<void> {
  try {
    const userDataPath = app.getPath('userData')
    const labelsPath = path.join(userDataPath, 'monitorLabels.json')

    if (fs.existsSync(labelsPath)) {
      const data = fs.readFileSync(labelsPath, 'utf-8')
      const labels = JSON.parse(data)

      if (Array.isArray(labels)) {
        monitorLabels = labels
        console.log('Loaded monitor labels from file:', monitorLabels)
        return
      }
    }

    console.log('No monitor labels file found, using empty labels list')
  } catch (error) {
    console.error('Error loading monitor labels from storage:', error)
  }
}

// Get the display name for a monitor (custom label or default name)
function getMonitorDisplayName(monitorId: string): string {
  const label = monitorLabels.find((label) => label.id === monitorId)?.label
  if (label) return label

  return `Monitor ${monitorId}`
}

// Create the tray icon
export function createTray(window: BrowserWindow): void {
  mainWindow = window

  // Get the appropriate icon path
  const iconPath = path.join(__dirname, '../../build/icon.ico')

  // Create the tray icon
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  // Set tooltip
  tray.setToolTip('Resolution Manager')

  // Try to load favorites from storage
  loadFavoritesFromStorage()

  // Set up context menu
  updateTrayMenu()

  // Set up click behavior
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    }
  })

  // Set up IPC listener for favorites updates
  ipcMain.on('favorites-updated', (_event, favorites: IFavoriteResolution[]) => {
    console.log('Received favorites update:', favorites)

    // Only update and save if there are actual favorites
    if (Array.isArray(favorites) && favorites.length > 0) {
      // Filter out invalid favorites
      const validFavorites = favorites.filter(
        (favorite) =>
          favorite &&
          typeof favorite === 'object' &&
          typeof favorite.resolution === 'string' &&
          (favorite.resolution.match(/^(\d+)x(\d+)@(\d+)$/) ||
            favorite.resolution.match(/^(\d+)x(\d+)$/))
      )

      if (validFavorites.length !== favorites.length) {
        console.warn(
          `Filtered out ${favorites.length - validFavorites.length} invalid favorites from update`
        )
      }

      // Only proceed if we have valid favorites
      if (validFavorites.length > 0) {
        favoriteResolutions = validFavorites
        updateTrayMenu()

        // Save favorites to a file for future use
        try {
          const userDataPath = app.getPath('userData')
          const favoritesPath = path.join(userDataPath, 'favorites.json')
          fs.writeFileSync(favoritesPath, JSON.stringify(validFavorites))
          console.log('Saved favorites to file')
        } catch (error) {
          console.error('Error saving favorites to file:', error)
        }
      } else {
        console.log('No valid favorites after filtering, not updating')
      }
    } else {
      console.log('Received empty favorites update, not saving to file')
    }
  })

  // Set up IPC listener for monitor labels updates
  ipcMain.on('monitor-labels-updated', (_event, labels: IMonitorLabel[]) => {
    console.log('Received monitor labels update:', labels)

    // Only update and save if there are actual labels
    if (Array.isArray(labels) && labels.length > 0) {
      monitorLabels = labels
      updateTrayMenu()

      // Save monitor labels to a file for future use
      try {
        const userDataPath = app.getPath('userData')
        const labelsPath = path.join(userDataPath, 'monitorLabels.json')
        fs.writeFileSync(labelsPath, JSON.stringify(labels))
        console.log('Saved monitor labels to file')
      } catch (error) {
        console.error('Error saving monitor labels to file:', error)
      }
    } else {
      console.log('Received empty monitor labels update, not saving to file')
    }
  })
}

// Update the tray menu with current favorites
function updateTrayMenu(): void {
  if (!tray) return

  console.log('Updating tray menu with favorites:', favoriteResolutions)

  // Filter out invalid favorites
  const validFavorites = favoriteResolutions.filter(
    (favorite) =>
      favorite &&
      typeof favorite === 'object' &&
      typeof favorite.resolution === 'string' &&
      (favorite.resolution.match(/^(\d+)x(\d+)@(\d+)$/) ||
        favorite.resolution.match(/^(\d+)x(\d+)$/))
  )

  if (validFavorites.length !== favoriteResolutions.length) {
    console.warn(
      `Filtered out ${favoriteResolutions.length - validFavorites.length} invalid favorites`
    )
    // Update the favorites array with only valid entries
    favoriteResolutions = validFavorites

    // Save the cleaned favorites back to file
    try {
      const userDataPath = app.getPath('userData')
      const favoritesPath = path.join(userDataPath, 'favorites.json')
      fs.writeFileSync(favoritesPath, JSON.stringify(validFavorites))
      console.log('Saved cleaned favorites to file')
    } catch (error) {
      console.error('Error saving cleaned favorites to file:', error)
    }
  }

  // Group favorites by monitor
  const monitorGroups: { [key: string]: IFavoriteResolution[] } = {}
  const globalFavorites: IFavoriteResolution[] = []

  // Separate favorites into monitor-specific and global groups
  validFavorites.forEach((favorite) => {
    if (favorite.monitorId) {
      if (!monitorGroups[favorite.monitorId]) {
        monitorGroups[favorite.monitorId] = []
      }
      monitorGroups[favorite.monitorId].push(favorite)
    } else {
      globalFavorites.push(favorite)
    }
  })

  // Create menu template
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    { label: 'Resolution Manager', enabled: false },
    { type: 'separator' }
  ]

  // Add global favorites submenu if there are any
  if (globalFavorites.length > 0) {
    menuTemplate.push({
      label: 'Global Favorites',
      submenu: globalFavorites.map((favorite) => createFavoriteMenuItem(favorite))
    })
  }

  // Add monitor-specific favorites submenus
  Object.keys(monitorGroups).forEach((monitorId) => {
    menuTemplate.push({
      label: `${getMonitorDisplayName(monitorId)} Favorites`,
      submenu: monitorGroups[monitorId].map((favorite) =>
        createFavoriteMenuItem(favorite, monitorId)
      )
    })
  })

  // Add separator and standard menu items
  menuTemplate.push(
    { type: 'separator' },
    {
      label: 'Show App',
      click: (): void => {
        if (mainWindow) {
          mainWindow.show()
        }
      }
    },
    {
      label: 'Quit',
      click: (): void => {
        // Set force quit flag to true before quitting
        forceQuit = true
        app.quit()
      }
    }
  )

  const contextMenu = Menu.buildFromTemplate(menuTemplate)
  tray.setContextMenu(contextMenu)
}

// Helper function to create a menu item for a favorite resolution
function createFavoriteMenuItem(
  favorite: IFavoriteResolution,
  monitorId?: string
): Electron.MenuItemConstructorOptions {
  // Check if favorite or resolution is undefined
  if (!favorite || typeof favorite.resolution !== 'string') {
    console.warn('Invalid favorite resolution:', favorite)
    return { label: 'Invalid Resolution', enabled: false }
  }

  // Handle both formats: "widthxheight" and "widthxheight@refreshRate"
  // If no refresh rate is specified, we'll default to 60Hz
  let width: number, height: number, refreshRate: number | undefined

  // First try the standard format with refresh rate
  const matchWithRefresh = favorite.resolution.match(/^(\d+)x(\d+)@(\d+)$/)
  if (matchWithRefresh) {
    width = parseInt(matchWithRefresh[1])
    height = parseInt(matchWithRefresh[2])
    refreshRate = parseInt(matchWithRefresh[3])
  } else {
    // Try the format without refresh rate
    const matchNoRefresh = favorite.resolution.match(/^(\d+)x(\d+)$/)
    if (matchNoRefresh) {
      width = parseInt(matchNoRefresh[1])
      height = parseInt(matchNoRefresh[2])
      refreshRate = 60 // Default to 60Hz
    } else {
      console.warn('Invalid resolution format:', favorite.resolution)
      return { label: 'Invalid Resolution', enabled: false }
    }
  }

  // Create label with optional custom label
  let label = `${width}x${height} @ ${refreshRate}Hz`
  if (favorite.label) {
    label = `${label} (${favorite.label})`
  }

  return {
    label,
    click: (): void => {
      // Send message to renderer to apply this resolution
      if (mainWindow) {
        mainWindow.webContents.send(
          'apply-favorite-resolution',
          {
            width,
            height,
            refreshRate
          } as IResolution,
          monitorId || favorite.monitorId
        )
      }
    }
  }
}

// Clean up tray when app is quitting
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

// Export the force quit flag
export function isForceQuit(): boolean {
  return forceQuit
}
