interface IResolution {
  width: number
  height: number
  refreshRate?: number
}

interface IMonitor {
  id: number
  name: string
  display: Electron.Display
}

interface ICMonitor {
  id: string
  name: string
  key?: string
  currentSettings?: {
    x: number
    y: number
    width: number
    height: number
    position: { x: number; y: number }
    refreshRate: number
    orientation: number
    bitsPerPixel: number
  }
  displayId?: number
  stateFlags?: number
  attachedToDesktop?: boolean
  multiDriver?: boolean
  primaryDevice?: boolean
  customLabel?: string
  [key: string]: unknown
}

// New interface for monitor-specific favorite resolutions
interface IFavoriteResolution {
  resolution: string // Format: "widthxheight@refreshRate"
  monitorId?: string // Optional monitor ID, if undefined it's a global favorite
  label?: string // Optional label for the resolution
}

// Interface for storing monitor labels
interface IMonitorLabel {
  id: string
  label: string
}

export type { IResolution, IMonitor, ICMonitor, IFavoriteResolution, IMonitorLabel }
