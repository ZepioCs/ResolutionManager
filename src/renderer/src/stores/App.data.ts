import { makeAutoObservable } from 'mobx'
import { IResolution, ICMonitor } from '../interfaces'

class AppData {
  constructor() {
    makeAutoObservable(this)
  }

  private _isCollapsed: boolean = false
  private _selectedPage: string = '1'
  private _pageHeader: string = ''
  private _dataLoaded: boolean = false
  private _isStartOnStartup: boolean = false
  private _useLastResolution: boolean = false
  private _minimizeToTray: boolean = false
  private _lastResolutions: IResolution[] = []
  private _allDisplays: ICMonitor[] = []
  private _customResolutions: IResolution[] = []
  private _defaultResolutions: IResolution[] = []
  private _resolutions: IResolution[] = []
  private _appPath: string = ''
  private _fileExistance: {
    settings: boolean
    lastResolutions: boolean
    defaultResolutions: boolean
    monitorConfigurations: boolean
    monitorLabels: boolean
  } = {
    settings: false,
    lastResolutions: false,
    defaultResolutions: false,
    monitorConfigurations: false,
    monitorLabels: false
  }

  get isCollapsed(): boolean {
    return this._isCollapsed
  }
  set isCollapsed(value: boolean) {
    this._isCollapsed = value
  }

  get selectedPage(): string {
    return this._selectedPage
  }
  set selectedPage(value: string) {
    this._selectedPage = value
  }

  get pageHeader(): string {
    return this._pageHeader
  }
  set pageHeader(value: string) {
    this._pageHeader = value
  }

  get dataLoaded(): boolean {
    return this._dataLoaded
  }
  set dataLoaded(value: boolean) {
    this._dataLoaded = value
  }

  get startOnStartup(): boolean {
    return this._isStartOnStartup
  }
  set startOnStartup(value: boolean) {
    this._isStartOnStartup = value
  }

  get useLastResolution(): boolean {
    return this._useLastResolution
  }
  set useLastResolution(value: boolean) {
    this._useLastResolution = value
  }

  get minimizeToTray(): boolean {
    return this._minimizeToTray
  }
  set minimizeToTray(value: boolean) {
    this._minimizeToTray = value
  }

  get lastResolutions(): IResolution[] {
    return this._lastResolutions
  }
  set lastResolutions(value: IResolution[]) {
    this._lastResolutions = value
  }

  get allDisplays(): ICMonitor[] {
    return this._allDisplays
  }
  set allDisplays(value: ICMonitor[]) {
    this._allDisplays = value
  }

  get customResolutions(): IResolution[] {
    return this._customResolutions
  }
  set customResolutions(value: IResolution[]) {
    this._customResolutions = value
  }

  get defaultResolutions(): IResolution[] {
    return this._defaultResolutions
  }
  set defaultResolutions(value: IResolution[]) {
    this._defaultResolutions = value
  }

  get resolutions(): IResolution[] {
    return this._resolutions
  }
  set resolutions(value: IResolution[]) {
    this._resolutions = value
  }

  get appPath(): string {
    return this._appPath
  }
  set appPath(value: string) {
    this._appPath = value
  }

  get fileExistance(): {
    settings: boolean
    lastResolutions: boolean
    defaultResolutions: boolean
    monitorConfigurations: boolean
    monitorLabels: boolean
  } {
    return this._fileExistance
  }
  set fileExistance(value: {
    settings: boolean
    lastResolutions: boolean
    defaultResolutions: boolean
    monitorConfigurations: boolean
    monitorLabels: boolean
  }) {
    this._fileExistance = value
  }
}

export const appData = new AppData()
