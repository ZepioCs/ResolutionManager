import { ElectronAPI } from '@electron-toolkit/preload'

// Enhanced monitor interface
interface EnhancedMonitor {
  id: string
  name: string
  displayId: number
  width: number
  height: number
  [key: string]: unknown // Use unknown instead of any
}

// Resolution change result
interface ResolutionChangeResult {
  success: boolean
  error?: string
}

// Monitor configuration
interface MonitorConfig {
  id: string
  width: number
  height: number
  refreshRate?: number
  timestamp: number
}

// File operation result
interface FileOperationResult {
  success: boolean
  error?: string
}

// Config files status
interface ConfigFilesStatus {
  defaultResolutions: boolean
  lastResolution: boolean
  settings: boolean
  monitorConfigurations: boolean
  monitorLabels: boolean
}

interface ResolutionAPI {
  getLoginItemSettings: () => Promise<Electron.LoginItemSettings>
  setLoginItemSettings: (options: boolean) => void
  getPath: (path: string) => Promise<string>
  writeFileSync: (path: string, data: string) => void
  readFileSync: (path: string, encoding: string) => Promise<string>
  existsSync: (path: string) => Promise<boolean>
  getMonitors: () => Promise<
    Array<{
      displayId: number
      width: number
      height: number
      x: number
      y: number
      scaleFactor: number
      rotation: number
      touchSupport: string
      accelerometerSupport: string
      colorDepth: number
      colorSpace: string
      depthPerComponent: number
      size: { width: number; height: number }
      workArea: { x: number; y: number; width: number; height: number }
      workAreaSize: { width: number; height: number }
      internal: boolean
      monochrome: boolean
      isPrimary: boolean
    }>
  >
  getCustomMonitors: () => Promise<Array<EnhancedMonitor>>
  setResolution: (resolution: {
    id: string
    width: number
    height: number
    refreshRate?: number
  }) => void
  // New APIs
  getAvailableResolutions: (
    monitorId: string
  ) => Promise<Array<{ width: number; height: number; refreshRate?: number }>>
  getMonitorConfigurations: () => Promise<Record<string, MonitorConfig>>
  applySavedConfiguration: (monitorId: string) => Promise<ResolutionChangeResult>
  // Config file management
  checkConfigFiles: () => Promise<ConfigFilesStatus>
  createDefaultResolutionsFile: () => Promise<FileOperationResult>
  createLastResolutionFile: () => Promise<FileOperationResult>
  createSettingsFile: () => Promise<FileOperationResult>
  createMonitorConfigurationsFile: () => Promise<FileOperationResult>
  createMonitorLabelsFile: () => Promise<FileOperationResult>
  createAllConfigFiles: () => Promise<Record<string, FileOperationResult>>
  // Event listeners
  onResolutionChangeResult: (callback: (result: ResolutionChangeResult) => void) => () => void
  // Minimize to tray settings
  setMinimizeToTray: (value: boolean) => void
  getMinimizeToTray: () => Promise<boolean>
  // Application control
  quitApplication: () => void
}

interface FavoritesAPI {
  updateFavorites: (favorites: IFavoriteResolution[]) => void
  updateMonitorLabels: (labels: IMonitorLabel[]) => void
  onApplyFavorite: (callback: (resolution: IResolution, monitorId?: string) => void) => void
  onRequestFavorites: (callback: () => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ResolutionAPI
    favorites?: FavoritesAPI
  }
}
