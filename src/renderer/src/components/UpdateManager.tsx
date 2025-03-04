import { useState, useEffect } from 'react'
import { Button, Progress, Space, Typography, Alert } from 'antd'
import { CloudDownloadOutlined, SyncOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

interface UpdateInfo {
  version: string
  files: Array<{ url: string; sha512: string; size: number }>
  path: string
  sha512: string
  releaseDate: string
}

export const UpdateManager: React.FC = () => {
  const [checking, setChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string>('')

  // Get the current app version from package.json
  useEffect(() => {
    // The version is set in the window object by the main process
    setCurrentVersion(window.electron.process.versions.app || '')
  }, [])

  // Check update status on component mount
  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const status = await window.api.getUpdateStatus()
        setUpdateAvailable(status.updateAvailable)
        setUpdateDownloaded(status.updateDownloaded)
      } catch (error) {
        console.error('Error checking update status:', error)
      }
    }

    checkStatus()

    // Set up event listeners for update events
    const removeUpdateAvailableListener = window.api.onUpdateAvailable((info) => {
      setUpdateAvailable(true)
      setUpdateInfo(info)
    })

    const removeUpdateNotAvailableListener = window.api.onUpdateNotAvailable(() => {
      setUpdateAvailable(false)
      setChecking(false)
    })

    const removeUpdateDownloadedListener = window.api.onUpdateDownloaded((info) => {
      setUpdateDownloaded(true)
      setUpdateInfo(info)
      setDownloadProgress(100)
    })

    const removeUpdateErrorListener = window.api.onUpdateError((error) => {
      setUpdateError(error)
      setChecking(false)
    })

    const removeUpdateProgressListener = window.api.onUpdateProgress((progressObj) => {
      setDownloadProgress(progressObj.percent)
    })

    // Clean up event listeners
    return (): void => {
      removeUpdateAvailableListener()
      removeUpdateNotAvailableListener()
      removeUpdateDownloadedListener()
      removeUpdateErrorListener()
      removeUpdateProgressListener()
    }
  }, [])

  const checkForUpdates = async (): Promise<void> => {
    setChecking(true)
    setUpdateError(null)

    try {
      const result = await window.api.checkForUpdates()
      if (!result.updateAvailable) {
        // If no update is available, we'll get a notification via the event listener
        // but we'll also update the UI here for immediate feedback
        setChecking(false)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateError('Failed to check for updates')
      setChecking(false)
    }
  }

  const installUpdate = (): void => {
    window.api.installUpdate()
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {updateError && (
        <Alert
          message="Update Error"
          description={updateError}
          type="error"
          showIcon
          closable
          onClose={() => setUpdateError(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text strong>Current Version: {currentVersion}</Text>
          {updateInfo && updateAvailable && (
            <div>
              <Text type="success">New Version Available: {updateInfo.version}</Text>
            </div>
          )}
        </div>

        {!updateDownloaded ? (
          <Button
            type="primary"
            icon={<SyncOutlined spin={checking} />}
            loading={checking}
            onClick={checkForUpdates}
            disabled={updateDownloaded}
          >
            {checking ? 'Checking...' : 'Check for Updates'}
          </Button>
        ) : (
          <Button type="primary" icon={<CloudDownloadOutlined />} onClick={installUpdate}>
            Restart and Install
          </Button>
        )}
      </div>

      {updateAvailable && !updateDownloaded && downloadProgress > 0 && (
        <div style={{ marginTop: '10px' }}>
          <Text>Downloading update...</Text>
          <Progress percent={Math.round(downloadProgress)} status="active" />
        </div>
      )}

      {!updateAvailable && !checking && !updateDownloaded && (
        <div style={{ marginTop: '10px' }}>
          <Alert
            message="No Updates Available"
            description="You are using the latest version of the application."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        </div>
      )}

      {updateDownloaded && (
        <div style={{ marginTop: '10px' }}>
          <Alert
            message="Update Ready to Install"
            description={`Version ${updateInfo?.version} has been downloaded and is ready to install. Click the button above to restart and install the update.`}
            type="success"
            showIcon
          />
        </div>
      )}
    </Space>
  )
}
