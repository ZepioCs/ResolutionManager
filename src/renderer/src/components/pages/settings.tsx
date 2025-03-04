import { useState } from 'react'
import { observer } from 'mobx-react'
import { Card, Typography, Space, Button, Switch, Divider, Row, Col, Alert, Modal } from 'antd'
import {
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  ReloadOutlined,
  PoweroffOutlined
} from '@ant-design/icons'
import { appStore } from '../../stores/App.store'
import { appData } from '../../stores/App.data'

const { Text, Paragraph } = Typography

export const Settings = observer(() => {
  const [isCreatingFiles, setIsCreatingFiles] = useState(false)

  const createConfigFile = async (fileType: string): Promise<void> => {
    setIsCreatingFiles(true)
    try {
      let result
      switch (fileType) {
        case 'defaultResolutions':
          result = await window.api.createDefaultResolutionsFile()
          break
        case 'lastResolution':
          result = await window.api.createLastResolutionFile()
          break
        case 'settings':
          result = await window.api.createSettingsFile()
          break
        case 'monitorConfigurations':
          result = await window.api.createMonitorConfigurationsFile()
          break
        case 'monitorLabels':
          result = await window.api.createMonitorLabelsFile()
          break
        case 'all':
          result = await window.api.createAllConfigFiles()
          break
        default:
          throw new Error('Invalid file type')
      }

      console.log(`Create ${fileType} result:`, result)
      await appStore.existanceCheck()
    } catch (error) {
      console.error(`Error creating ${fileType} file:`, error)
    } finally {
      setIsCreatingFiles(false)
    }
  }

  const quitApplication = (): void => {
    Modal.confirm({
      title: 'Quit Application',
      content: 'Are you sure you want to quit the application completely?',
      okText: 'Yes, Quit',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        // Use the API to quit the app
        window.api.quitApplication()
      }
    })
  }

  const textColor = '#000'
  const secondaryTextColor = 'rgba(0, 0, 0, 0.65)'

  return (
    <div style={{ height: 'calc(100vh - 220px)', overflow: 'auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', padding: '0 16px' }}>
        <div>
          <Paragraph style={{ marginBottom: '16px', color: textColor }}>
            Configure application behavior and manage configuration files.
          </Paragraph>
        </div>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: textColor }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              <span>General Settings</span>
            </div>
          }
          bordered
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ color: textColor }}>
                  Start on System Startup
                </Text>
                <br />
                <Text style={{ color: secondaryTextColor }}>
                  Launch the application automatically when your computer starts
                </Text>
              </div>
              <Switch
                checked={appData.startOnStartup}
                onChange={() => appStore.toggleStartOnStartup()}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ color: textColor }}>
                  Apply Last Resolution on Startup
                </Text>
                <br />
                <Text style={{ color: secondaryTextColor }}>
                  Automatically apply the last used resolution when the application starts
                </Text>
              </div>
              <Switch
                checked={appData.useLastResolution}
                onChange={() => appStore.toggleLastResolution()}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong style={{ color: textColor }}>
                  Minimize to Tray When Closing
                </Text>
                <br />
                <Text style={{ color: secondaryTextColor }}>
                  Keep the application running in the system tray when you close the window
                </Text>
              </div>
              <Switch
                checked={appData.minimizeToTray}
                onChange={() => appStore.toggleMinimizeToTray()}
              />
            </div>
          </Space>
        </Card>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', color: textColor }}>
              <FileOutlined style={{ marginRight: '8px' }} />
              <span>Configuration Files</span>
            </div>
          }
          bordered
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="Configuration File Status"
              description="These files store your settings and resolution configurations. If any are missing, you can create them below."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: textColor }}>Default Resolutions:</Text>
                  {getFileStatus(appData.fileExistance.defaultResolutions)}
                </div>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => createConfigFile('defaultResolutions')}
                  disabled={appData.fileExistance.defaultResolutions || isCreatingFiles}
                  icon={<ReloadOutlined />}
                  size="small"
                >
                  Create File
                </Button>
              </Col>

              <Col span={12}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: textColor }}>Last Resolution:</Text>
                  {getFileStatus(appData.fileExistance.lastResolutions)}
                </div>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => createConfigFile('lastResolution')}
                  disabled={appData.fileExistance.lastResolutions || isCreatingFiles}
                  icon={<ReloadOutlined />}
                  size="small"
                >
                  Create File
                </Button>
              </Col>

              <Col span={12}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: textColor }}>Settings:</Text>
                  {getFileStatus(appData.fileExistance.settings)}
                </div>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => createConfigFile('settings')}
                  disabled={appData.fileExistance.settings || isCreatingFiles}
                  icon={<ReloadOutlined />}
                  size="small"
                >
                  Create File
                </Button>
              </Col>

              <Col span={12}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: textColor }}>Monitor Configurations:</Text>
                  {getFileStatus(appData.fileExistance.monitorConfigurations)}
                </div>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => createConfigFile('monitorConfigurations')}
                  disabled={appData.fileExistance.monitorConfigurations || isCreatingFiles}
                  icon={<ReloadOutlined />}
                  size="small"
                >
                  Create File
                </Button>
              </Col>

              <Col span={12}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={{ color: textColor }}>Monitor Labels:</Text>
                  {getFileStatus(appData.fileExistance.monitorLabels)}
                </div>
              </Col>
              <Col span={12}>
                <Button
                  onClick={() => createConfigFile('monitorLabels')}
                  disabled={appData.fileExistance.monitorLabels || isCreatingFiles}
                  icon={<ReloadOutlined />}
                  size="small"
                >
                  Create File
                </Button>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Button
              type="primary"
              onClick={() => createConfigFile('all')}
              disabled={
                appData.fileExistance.defaultResolutions &&
                appData.fileExistance.lastResolutions &&
                appData.fileExistance.settings &&
                appData.fileExistance.monitorConfigurations
              }
              loading={isCreatingFiles}
              icon={<ReloadOutlined />}
              block
            >
              Create All Missing Files
            </Button>
          </Space>
        </Card>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <PoweroffOutlined style={{ marginRight: '8px' }} />
              <span>Application Control</span>
            </div>
          }
          bordered
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              Use this button to completely quit the application, including the tray icon.
            </Text>
            <Button
              type="primary"
              danger
              icon={<PoweroffOutlined />}
              onClick={quitApplication}
              block
            >
              Quit Application
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
})

function getFileStatus(exists: boolean): JSX.Element {
  return exists ? (
    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
  ) : (
    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
  )
}
