import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IResolution, IFavoriteResolution, IMonitorLabel } from '../renderer/src/interfaces'

// Define types for monitor data
interface Monitor {
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
}

interface CustomMonitor {
  id: string
  name: string
  [key: string]: unknown
}

interface MonitorConfig {
  id: string
  width: number
  height: number
  refreshRate?: number
  timestamp: number
}

// Result type for file operations
interface FileOperationResult {
  success: boolean
  error?: string
}

// Define update info interface
interface UpdateInfo {
  version: string
  files: Array<{ url: string; sha512: string; size: number }>
  path: string
  sha512: string
  releaseDate: string
}

// Custom APIs for renderer
const api = {
  getLoginItemSettings: (): Promise<Electron.LoginItemSettings> =>
    ipcRenderer.invoke('get-login-item-settings'),
  setLoginItemSettings: (openAtLogin: boolean): void =>
    ipcRenderer.send('set-login-item-settings', openAtLogin),
  getPath: (path: string): Promise<string> => ipcRenderer.invoke('get-path', path),
  writeFileSync: (path: string, data: string): void =>
    ipcRenderer.send('write-file-sync', { path, data }),
  readFileSync: (path: string, encoding: string): Promise<string> =>
    ipcRenderer.invoke('read-file-sync', { path, encoding }),
  existsSync: (path: string): Promise<boolean> => ipcRenderer.invoke('exists-sync', path),
  getMonitors: (): Promise<Monitor[]> => ipcRenderer.invoke('get-monitors'),
  getCustomMonitors: (): Promise<CustomMonitor[]> => ipcRenderer.invoke('get-custom-monitors'),
  setResolution: (resolution: {
    id: string
    width: number
    height: number
    refreshRate?: number
  }): void => ipcRenderer.send('set-resolution', resolution),
  getAvailableResolutions: (
    monitorId: string
  ): Promise<Array<{ width: number; height: number; refreshRate?: number }>> =>
    ipcRenderer.invoke('get-available-resolutions', monitorId),
  getMonitorConfigurations: (): Promise<Record<string, MonitorConfig>> =>
    ipcRenderer.invoke('get-monitor-configurations'),
  applySavedConfiguration: (monitorId: string): Promise<FileOperationResult> =>
    ipcRenderer.invoke('apply-saved-configuration', monitorId),
  checkConfigFiles: (): Promise<{
    defaultResolutions: boolean
    lastResolution: boolean
    settings: boolean
    monitorConfigurations: boolean
  }> => ipcRenderer.invoke('check-config-files'),
  createDefaultResolutionsFile: (): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-default-resolutions-file'),
  createLastResolutionFile: (): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-last-resolution-file'),
  createSettingsFile: (): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-settings-file'),
  createMonitorConfigurationsFile: (): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-monitor-configurations-file'),
  createMonitorLabelsFile: (): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-monitor-labels-file'),
  createAllConfigFiles: (): Promise<Record<string, FileOperationResult>> =>
    ipcRenderer.invoke('create-all-config-files'),
  onResolutionChangeResult: (
    callback: (result: { success: boolean; error?: string }) => void
  ): (() => void) => {
    const listener = (
      _: Electron.IpcRendererEvent,
      result: { success: boolean; error?: string }
    ): void => callback(result)
    ipcRenderer.on('resolution-change-result', listener)
    return (): void => {
      ipcRenderer.removeListener('resolution-change-result', listener)
    }
  },
  setMinimizeToTray: (value: boolean): void => ipcRenderer.send('set-minimize-to-tray', value),
  getMinimizeToTray: (): Promise<boolean> => ipcRenderer.invoke('get-minimize-to-tray'),
  quitApplication: (): void => ipcRenderer.send('quit-application'),
  checkForUpdates: (): Promise<{ updateAvailable: boolean }> =>
    ipcRenderer.invoke('check-for-updates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
  getUpdateStatus: (): Promise<{ updateAvailable: boolean; updateDownloaded: boolean }> =>
    ipcRenderer.invoke('get-update-status'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on('update-available', listener)
    return () => {
      ipcRenderer.removeListener('update-available', listener)
    }
  },
  onUpdateNotAvailable: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('update-not-available', listener)
    return () => {
      ipcRenderer.removeListener('update-not-available', listener)
    }
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on('update-downloaded', listener)
    return () => {
      ipcRenderer.removeListener('update-downloaded', listener)
    }
  },
  onUpdateError: (callback: (error: string) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on('update-error', listener)
    return () => {
      ipcRenderer.removeListener('update-error', listener)
    }
  },
  onUpdateProgress: (callback: (progressObj: { percent: number }) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, progressObj: { percent: number }): void =>
      callback(progressObj)
    ipcRenderer.on('update-progress', listener)
    return () => {
      ipcRenderer.removeListener('update-progress', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('favorites', {
      updateFavorites: (favorites: IFavoriteResolution[]) =>
        ipcRenderer.send('favorites-updated', favorites),
      updateMonitorLabels: (labels: IMonitorLabel[]) =>
        ipcRenderer.send('monitor-labels-updated', labels),
      onApplyFavorite: (callback: (resolution: IResolution, monitorId?: string) => void) =>
        ipcRenderer.on(
          'apply-favorite-resolution',
          (_event, resolution: IResolution, monitorId?: string) => callback(resolution, monitorId)
        ),
      onRequestFavorites: (callback: () => void) =>
        ipcRenderer.on('request-favorites', () => callback())
    })
  } catch (error: unknown) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
