import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import { Select, Button, List, notification, Card, Typography, Space, Badge, Collapse } from 'antd'
import { appData } from '../../stores/App.data'
import { appStore } from '../../stores/App.store'
import { ICMonitor, IResolution } from '../../interfaces'
import { DesktopOutlined, BugOutlined } from '@ant-design/icons'

const { Option } = Select
const { Title, Text } = Typography
const { Panel } = Collapse

export const ChangeResolution = observer(() => {
  const [selectedMonitor, setSelectedMonitor] = React.useState<ICMonitor>()
  const [selectedResolution, setSelectedResolution] = React.useState<IResolution>()
  const [isChangingResolution, setIsChangingResolution] = React.useState(false)

  useEffect(() => {
    appStore.init()

    // Set up listener for resolution change results
    const unsubscribe = window.api.onResolutionChangeResult((result) => {
      setIsChangingResolution(false)
      if (result.success) {
        notification.success({
          message: 'Success',
          description: 'Resolution changed successfully',
          placement: 'topRight'
        })
      } else {
        notification.error({
          message: 'Error',
          description: result.error || 'Failed to change resolution',
          placement: 'topRight'
        })
      }
    })

    return (): void => {
      // Clean up listener when component unmounts
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const applyResolution = (monitor: string, resolution: IResolution): void => {
    if (!monitor) {
      notification.warning({
        message: 'Warning',
        description: 'Please select a monitor first',
        placement: 'topRight'
      })
      return
    }

    setIsChangingResolution(true)
    appStore.setResolution(monitor, resolution)
  }

  return (
    <div style={{ height: 'calc(100vh - 220px)' }}>
      {appData.dataLoaded ? (
        <div>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text style={{ marginBottom: '16px' }}>
                Choose a resolution and monitor to change your display settings.
              </Text>
            </div>

            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DesktopOutlined style={{ marginRight: '8px' }} />
                  <span>Display Settings</span>
                </div>
              }
              bordered
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>Resolution:</Text>
                  <Select
                    placeholder="Select a resolution"
                    style={{ width: '100%', marginTop: '8px' }}
                    onChange={(value) => {
                      try {
                        // Parse the resolution string
                        let width, height, refreshRate

                        console.log('Raw resolution value:', value)

                        // Parse the resolution string (format: "widthxheight@refreshRate")
                        const match = value.match(/^(\d+)x(\d+)(?:@(\d+))?$/)

                        if (match) {
                          width = Number(match[1])
                          height = Number(match[2])
                          refreshRate = match[3] ? Number(match[3]) : undefined

                          console.log('Parsed with regex:', { width, height, refreshRate })
                        } else {
                          // Fallback to the old parsing logic
                          if (value.includes('@')) {
                            // Format with refresh rate: "1920x1080@60"
                            const parts = value.split('@')
                            const dimensionParts = parts[0].split('x')

                            width = Number(dimensionParts[0])
                            height = Number(dimensionParts[1])
                            refreshRate = Number(parts[1])

                            console.log('Parsed with @ split:', { width, height, refreshRate })
                          } else if (value.includes('x')) {
                            // Format without refresh rate: "1920x1080"
                            const parts = value.split('x')
                            width = Number(parts[0])
                            height = Number(parts[1])

                            console.log('Parsed with x split:', { width, height })
                          }
                        }

                        console.log('Final parsed resolution:', { width, height, refreshRate })
                        console.log('Types:', {
                          width: typeof width,
                          height: typeof height,
                          refreshRate: typeof refreshRate
                        })

                        // Create resolution object with proper types
                        const resolution: IResolution = {
                          width: width,
                          height: height
                        }

                        if (refreshRate) {
                          resolution.refreshRate = refreshRate
                        }

                        setSelectedResolution(resolution)
                      } catch (error) {
                        console.error('Error parsing resolution:', error)
                        notification.error({
                          message: 'Error',
                          description: 'Failed to parse resolution format',
                          placement: 'topRight'
                        })
                      }
                    }}
                  >
                    {appData.resolutions.map((resolution) => {
                      // Create a unique key and label
                      const key = `${resolution.width}x${resolution.height}${
                        resolution.refreshRate ? '@' + resolution.refreshRate : ''
                      }`
                      const label = `${resolution.width}x${resolution.height}${
                        resolution.refreshRate ? ' @ ' + resolution.refreshRate + 'Hz' : ''
                      }`

                      return (
                        <Option key={key} value={key}>
                          {label}
                        </Option>
                      )
                    })}
                  </Select>
                </div>

                <div>
                  <Text strong>Monitor:</Text>
                  <Select
                    placeholder="Select a monitor"
                    style={{ width: '100%', marginTop: '8px' }}
                    labelInValue
                    onChange={(e) => {
                      setSelectedMonitor(
                        appData.allDisplays.find((monitor) => monitor.id === e.value)
                      )
                    }}
                  >
                    {appData.allDisplays.map((monitor) => {
                      const isPrimary = monitor.primaryDevice || monitor.id === '0'
                      const monitorName = monitor.name || `Monitor ${monitor.id}`
                      const currentResolution = monitor.currentSettings
                        ? `${monitor.currentSettings.width}x${monitor.currentSettings.height}`
                        : ''

                      return (
                        <Option key={monitor.id} value={monitor.id}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>
                              {isPrimary && (
                                <Badge
                                  count="Primary"
                                  style={{
                                    backgroundColor: '#1890ff',
                                    marginRight: '8px'
                                  }}
                                />
                              )}
                              {monitorName}
                            </span>
                            {currentResolution && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {currentResolution}
                              </Text>
                            )}
                          </div>
                        </Option>
                      )
                    })}
                  </Select>
                </div>

                <Button
                  type="primary"
                  style={{ width: '100%' }}
                  disabled={!selectedResolution || !selectedMonitor || isChangingResolution}
                  loading={isChangingResolution}
                  onClick={() => {
                    if (selectedMonitor && selectedResolution) {
                      applyResolution(selectedMonitor.id, selectedResolution)
                    }
                  }}
                >
                  Apply Resolution
                </Button>
              </Space>
            </Card>

            <Card
              title="Recent Resolutions"
              size="small"
              bordered
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
            >
              {appData.lastResolutions.length > 0 ? (
                <List
                  size="small"
                  dataSource={appData.lastResolutions}
                  renderItem={(resolution) => (
                    <List.Item
                      key={`${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}`}
                      style={{ display: 'flex', justifyContent: 'space-between' }}
                      actions={[
                        <Button
                          key="apply"
                          size="small"
                          type="link"
                          loading={isChangingResolution}
                          disabled={isChangingResolution}
                          onClick={() => {
                            if (selectedMonitor) {
                              applyResolution(selectedMonitor.id, resolution)
                            } else {
                              notification.warning({
                                message: 'Warning',
                                description: 'Please select a monitor first',
                                placement: 'topRight'
                              })
                            }
                          }}
                        >
                          Apply
                        </Button>
                      ]}
                    >
                      {resolution.refreshRate
                        ? `${resolution.width}x${resolution.height} @ ${resolution.refreshRate}Hz`
                        : `${resolution.width}x${resolution.height}`}
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">No recently used resolutions</Text>
              )}
            </Card>
          </Space>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Title level={3}>Loading...</Title>
        </div>
      )}

      {/* Debug section */}
      {appData.dataLoaded && (
        <div style={{ padding: '20px', marginTop: '20px' }}>
          <Collapse ghost>
            <Panel
              header={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BugOutlined style={{ marginRight: '8px' }} />
                  <span>Debug Information</span>
                </div>
              }
              key="1"
            >
              <Card size="small" title="Default Resolutions">
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(appData.defaultResolutions, null, 2)}
                </pre>
              </Card>

              <Card size="small" title="Custom Resolutions" style={{ marginTop: '16px' }}>
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(appData.customResolutions, null, 2)}
                </pre>
              </Card>

              <Card size="small" title="All Resolutions" style={{ marginTop: '16px' }}>
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(appData.resolutions, null, 2)}
                </pre>
              </Card>
            </Panel>
          </Collapse>
        </div>
      )}
    </div>
  )
})
