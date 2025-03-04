import { makeAutoObservable } from 'mobx'
import { appData } from './App.data'
import type { IResolution } from '../interfaces'
import { notification } from 'antd'

class AppStore {
  constructor() {
    makeAutoObservable(this)
  }

  async init(): Promise<void> {
    appData.dataLoaded = false

    appData.isCollapsed = false
    appData.selectedPage = '1'
    appData.startOnStartup = (await window.api.getLoginItemSettings()).openAtLogin
    await this.initData()
    await this.loadData()
    await this.existanceCheck()
    appData.appPath = await window.api.getPath('userData')

    appData.dataLoaded = true
  }

  // Helper Functions
  async initData(): Promise<void> {
    appData.allDisplays = await window.api.getCustomMonitors()
    console.log('Displays:', appData.allDisplays)
    console.log('Trying to get default resolutions...')
    try {
      const defaultResolutionsPath =
        (await window.api.getPath('userData')) + '/defaultResolutions.json'
      if (defaultResolutionsPath) {
        const defaultResolutionsData = await window.api.readFileSync(
          defaultResolutionsPath,
          'utf-8'
        )
        console.log('defaultResolutionsData:', defaultResolutionsData)
        appData.defaultResolutions = JSON.parse(defaultResolutionsData)
        this.reSortResolutions()
      } else {
        throw new Error('Could not get path for default resolutions')
      }
    } catch (error) {
      console.error('Could not get default resolutions:', error)
    }
    if (appData.useLastResolution) {
      this.applyLastResolution()
    }
  }

  // Refresh monitor data from the system
  async refreshMonitors(): Promise<boolean> {
    try {
      appData.allDisplays = await window.api.getCustomMonitors()
      console.log('Refreshed displays:', appData.allDisplays)
      return true
    } catch (error) {
      console.error('Error refreshing monitor data:', error)
      return false
    }
  }

  async existanceCheck(): Promise<void> {
    try {
      const configStatus = await window.api.checkConfigFiles()
      appData.fileExistance = {
        settings: configStatus.settings,
        lastResolutions: configStatus.lastResolution,
        defaultResolutions: configStatus.defaultResolutions,
        monitorConfigurations: configStatus.monitorConfigurations,
        monitorLabels: configStatus.monitorLabels
      }
      console.log('File existence status:', appData.fileExistance)
    } catch (error) {
      console.error('Error checking file existence:', error)
      // Fallback to the old method if the new API fails
      const settingsPath = (await window.api.getPath('userData')) + '/settings.json'
      const lastResolutionPath = (await window.api.getPath('userData')) + '/lastResolution.json'
      const defaultResolutionsPath =
        (await window.api.getPath('userData')) + '/defaultResolutions.json'
      const monitorConfigPath =
        (await window.api.getPath('userData')) + '/monitorConfigurations.json'
      const monitorLabelsPath = (await window.api.getPath('userData')) + '/monitorLabels.json'

      appData.fileExistance = {
        settings: await window.api.existsSync(settingsPath),
        lastResolutions: await window.api.existsSync(lastResolutionPath),
        defaultResolutions: await window.api.existsSync(defaultResolutionsPath),
        monitorConfigurations: await window.api.existsSync(monitorConfigPath),
        monitorLabels: await window.api.existsSync(monitorLabelsPath)
      }
      console.log('File existence status (fallback method):', appData.fileExistance)
    }
  }

  reSortResolutions(): void {
    // First ensure all resolutions have the correct types
    const validatedDefaultResolutions = appData.defaultResolutions.map((res) => ({
      width: Number(res.width),
      height: Number(res.height),
      refreshRate: res.refreshRate !== undefined ? Number(res.refreshRate) : undefined
    }))

    const validatedCustomResolutions = appData.customResolutions.map((res) => ({
      width: Number(res.width),
      height: Number(res.height),
      refreshRate: res.refreshRate !== undefined ? Number(res.refreshRate) : undefined
    }))

    // Update the arrays with validated data
    appData.defaultResolutions = validatedDefaultResolutions
    appData.customResolutions = validatedCustomResolutions

    // Now sort with proper type handling
    appData.resolutions = [...appData.defaultResolutions, ...appData.customResolutions].sort(
      (a, b) => {
        // First sort by width (descending)
        if (a.width > b.width) {
          return -1
        } else if (a.width < b.width) {
          return 1
        }

        // If widths are equal, sort by height (descending)
        if (a.height > b.height) {
          return -1
        } else if (a.height < b.height) {
          return 1
        }

        // If width and height are equal, sort by refresh rate (descending)
        const aRefresh = a.refreshRate || 0
        const bRefresh = b.refreshRate || 0

        if (aRefresh > bRefresh) {
          return -1
        } else if (aRefresh < bRefresh) {
          return 1
        }

        // Everything is equal
        return 0
      }
    )

    console.log('Sorted resolutions:', appData.resolutions)
  }

  addResolution(resolution: IResolution): void {
    // Ensure proper types for the resolution
    const validatedResolution = {
      width: Number(resolution.width),
      height: Number(resolution.height),
      refreshRate: resolution.refreshRate !== undefined ? Number(resolution.refreshRate) : undefined
    }

    console.log('Adding validated resolution:', validatedResolution)

    appData.customResolutions.push(validatedResolution)
    this.reSortResolutions()
    this.saveData()
  }

  removeResolution(resolution: IResolution): void {
    appData.customResolutions = appData.customResolutions.filter((res) => res !== resolution)
    this.reSortResolutions()
    this.saveData()
  }

  // Needed Functions
  switchPage(page: string, header: string): void {
    appData.selectedPage = page
    appData.pageHeader = header
  }

  async saveData(): Promise<void> {
    const settingsPath = (await window.api.getPath('userData')) + '/settings.json'
    const customResolutionsPath = (await window.api.getPath('userData')) + '/customResolutions.json'

    try {
      console.log('settingsPath:', settingsPath)
      if (await window.api.existsSync(settingsPath)) {
        await window.api.writeFileSync(
          settingsPath,
          JSON.stringify({
            startOnStartup: appData.startOnStartup,
            useLastResolution: appData.useLastResolution
          })
        )
      } else {
        throw new Error(
          `Could not save settings to file, please create a 'settings.json' file in the '${settingsPath}'!`
        )
      }

      // Save custom resolutions
      await window.api.writeFileSync(
        customResolutionsPath,
        JSON.stringify(appData.customResolutions)
      )
      console.log('Custom resolutions saved successfully')
    } catch (error) {
      console.error('Error saving data:', error)
      notification.error({
        message: 'Error',
        description: `Could not save data to file: ${error}`
      })
    }
  }

  async loadData(): Promise<void> {
    const settingsPath = (await window.api.getPath('userData')) + '/settings.json'
    const customResolutionsPath = (await window.api.getPath('userData')) + '/customResolutions.json'

    try {
      console.log('settingsPath:', settingsPath)
      if (await window.api.existsSync(settingsPath)) {
        const settingsData = await window.api.readFileSync(settingsPath, 'utf-8')
        console.log('settingsData:', settingsData)
        const settingsJson = JSON.parse(settingsData)
        appData.startOnStartup = settingsJson['startOnStartup']
        appData.useLastResolution = settingsJson['useLastResolution']
        appData.minimizeToTray = settingsJson['minimizeToTray'] || false
        window.api.setMinimizeToTray(appData.minimizeToTray)
      } else {
        notification.error({
          message: 'Error',
          description: `Could not load settings from file, please create a 'settings.json' file in the '${settingsPath}'!`
        })
      }

      // Load custom resolutions
      if (await window.api.existsSync(customResolutionsPath)) {
        const customResolutionsData = await window.api.readFileSync(customResolutionsPath, 'utf-8')
        console.log('customResolutionsData:', customResolutionsData)

        // Parse custom resolutions and ensure proper types
        const parsedResolutions = JSON.parse(customResolutionsData)

        // Ensure all properties are the correct type
        const validatedResolutions = parsedResolutions.map(
          (res: {
            width: number | string
            height: number | string
            refreshRate?: number | string
          }) => ({
            width: Number(res.width),
            height: Number(res.height),
            refreshRate: res.refreshRate !== undefined ? Number(res.refreshRate) : undefined
          })
        )

        console.log('Validated custom resolutions:', validatedResolutions)
        appData.customResolutions = validatedResolutions
        this.reSortResolutions() // Re-sort after loading
        console.log('Custom resolutions loaded successfully')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      notification.error({
        message: 'Error',
        description: `Could not load data: ${error}`
      })
      notification.info({
        message: 'Info',
        description: `Use this template for settings: \n${JSON.stringify(
          {
            startOnStartup: false,
            useLastResolution: false,
            minimizeToTray: false
          },
          null,
          4
        )}`
      })
    }

    try {
      console.log('Loading last resolutions...')
      const lastResolutionsPath = (await window.api.getPath('userData')) + '/lastResolution.json'
      if (await window.api.existsSync(lastResolutionsPath)) {
        const lastResolutionsData = await window.api.readFileSync(lastResolutionsPath, 'utf-8')
        const parsedLastResolutions = JSON.parse(lastResolutionsData)

        // If it's a single resolution object
        if (parsedLastResolutions.resolution) {
          // Convert to array format if needed
          appData.lastResolutions = [
            {
              width: Number(parsedLastResolutions.resolution.split('x')[0]),
              height: Number(parsedLastResolutions.resolution.split('x')[1]),
              refreshRate:
                parsedLastResolutions.refreshRate !== undefined
                  ? Number(parsedLastResolutions.refreshRate)
                  : undefined
            }
          ]
        } else {
          // It's already an array
          appData.lastResolutions = Array.isArray(parsedLastResolutions)
            ? parsedLastResolutions.map(
                (res: {
                  width: number | string
                  height: number | string
                  refreshRate?: number | string
                }) => ({
                  width: Number(res.width),
                  height: Number(res.height),
                  refreshRate: res.refreshRate !== undefined ? Number(res.refreshRate) : undefined
                })
              )
            : []
        }

        console.log('Loaded last resolutions:', appData.lastResolutions)
      }
    } catch (error) {
      console.error('Could not load last resolutions:', error)
    }
  }

  async setResolution(monitor: string, resolution: IResolution): Promise<void> {
    // Apply the resolution...
    console.log('Setting resolution (raw):', monitor, resolution)
    console.log('Resolution types (raw):', {
      width: typeof resolution.width,
      height: typeof resolution.height,
      refreshRate: typeof resolution.refreshRate
    })
    console.log('Resolution values (raw):', {
      width: resolution.width,
      height: resolution.height,
      refreshRate: resolution.refreshRate
    })

    // Ensure proper types for the resolution
    const validatedResolution = {
      width: Number(resolution.width),
      height: Number(resolution.height),
      refreshRate: resolution.refreshRate !== undefined ? Number(resolution.refreshRate) : undefined
    }

    console.log('Validated resolution:', validatedResolution)
    console.log('Validated resolution types:', {
      width: typeof validatedResolution.width,
      height: typeof validatedResolution.height,
      refreshRate: typeof validatedResolution.refreshRate
    })
    console.log('Validated resolution values:', {
      width: validatedResolution.width,
      height: validatedResolution.height,
      refreshRate: validatedResolution.refreshRate
    })
    console.log('Is width NaN:', isNaN(validatedResolution.width))
    console.log('Is height NaN:', isNaN(validatedResolution.height))
    console.log(
      'Is refreshRate NaN:',
      validatedResolution.refreshRate !== undefined ? isNaN(validatedResolution.refreshRate) : 'N/A'
    )

    try {
      // Check if we have a refresh rate to set
      if (
        validatedResolution.refreshRate !== undefined &&
        validatedResolution.refreshRate !== null
      ) {
        // Use the method with refresh rate if available
        console.log('Using setResolution with refresh rate:', validatedResolution.refreshRate)
        window.api.setResolution({
          id: monitor,
          width: validatedResolution.width,
          height: validatedResolution.height,
          refreshRate: validatedResolution.refreshRate
        })
      } else {
        // Use the standard method without refresh rate
        console.log('Using setResolution without refresh rate')
        window.api.setResolution({
          id: monitor,
          width: validatedResolution.width,
          height: validatedResolution.height
        })
      }

      // Add to last resolutions if not already there
      const existingIndex = appData.lastResolutions.findIndex(
        (res) =>
          res.width === validatedResolution.width &&
          res.height === validatedResolution.height &&
          res.refreshRate === validatedResolution.refreshRate
      )

      if (existingIndex === -1) {
        // Add to the beginning of the array
        appData.lastResolutions.unshift(validatedResolution)

        // Keep only the last 5 resolutions
        if (appData.lastResolutions.length > 5) {
          appData.lastResolutions = appData.lastResolutions.slice(0, 5)
        }
      } else if (existingIndex > 0) {
        // Move to the beginning of the array if not already there
        const [item] = appData.lastResolutions.splice(existingIndex, 1)
        appData.lastResolutions.unshift(item)
      }

      if (appData.useLastResolution) {
        const resolutionString = `${validatedResolution.width}x${validatedResolution.height}`
        const monitorId = monitor
        const lastResolutionJson = {
          resolution: resolutionString,
          monitor: monitorId,
          refreshRate: validatedResolution.refreshRate
        }
        // Save the resolution to a file
        const lastResolutionPath = (await window.api.getPath('userData')) + '/lastResolution.json'
        console.log('lastResolutionPath:', lastResolutionPath)
        await window.api.writeFileSync(lastResolutionPath, JSON.stringify(lastResolutionJson))
      }
    } catch (error) {
      console.error('Error setting resolution:', error)
    }
  }

  async applyLastResolution(): Promise<void> {
    try {
      const resolutionPath = (await window.api.getPath('userData')) + '/' + 'lastResolution.json'
      if (resolutionPath) {
        const resolutionData = await window.api.readFileSync(resolutionPath, 'utf-8')
        const resolutionJson = JSON.parse(resolutionData)
        console.log('data: ', resolutionData, 'json: ', resolutionJson)
        const newRes: IResolution = {
          width: parseInt(resolutionJson['resolution'].split('x')[0]),
          height: parseInt(resolutionJson['resolution'].split('x')[1]),
          refreshRate: resolutionJson['refreshRate']
        }
        const monitorId = resolutionJson['monitor']
        this.setResolution(monitorId, newRes)
      } else {
        console.error('Could not get path for last resolution')
      }
    } catch (error) {
      console.error('Could not apply last resolution:', error)
    }
  }

  toggleLastResolution(): void {
    appData.useLastResolution = !appData.useLastResolution
    this.saveSettings()
  }

  toggleMinimizeToTray(): void {
    appData.minimizeToTray = !appData.minimizeToTray
    window.api.setMinimizeToTray(appData.minimizeToTray)
    this.saveSettings()
  }

  async saveSettings(): Promise<void> {
    try {
      const settingsPath = (await window.api.getPath('userData')) + '/settings.json'
      if (await window.api.existsSync(settingsPath)) {
        const settingsData = await window.api.readFileSync(settingsPath, 'utf-8')
        const settings = JSON.parse(settingsData)
        settings.startOnStartup = appData.startOnStartup
        settings.useLastResolution = appData.useLastResolution
        settings.minimizeToTray = appData.minimizeToTray
        window.api.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      }
    } catch (error) {
      console.error('Could not save settings:', error)
    }
  }

  toggleStartOnStartup(): void {
    window.api.setLoginItemSettings(!appData.startOnStartup)
    appData.startOnStartup = !appData.startOnStartup
  }

  toggleCollapsed(): void {
    appData.isCollapsed = !appData.isCollapsed
  }
}

export const appStore = new AppStore()
