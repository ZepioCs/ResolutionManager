import { useState, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react'
import {
  Card,
  Typography,
  Space,
  Empty,
  Badge,
  Button,
  Row,
  Col,
  notification,
  List,
  Tag,
  Tooltip
} from 'antd'
import { appData } from '../../stores/App.data'
import { appStore } from '../../stores/App.store'
import { DesktopOutlined, ReloadOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons'

const { Text } = Typography

// Define monitor display type
interface MonitorDisplay {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  isPrimary: boolean
  refreshRate?: number
}

export const MonitorVisualization = observer(() => {
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [forceRender, setForceRender] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false) // Loading state for refresh button
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null) // Track selected monitor
  const [monitors, setMonitors] = useState<MonitorDisplay[]>([])

  // Colors for styling
  const primaryMonitorColor = '#1890ff' // Bright blue for primary monitor
  const secondaryMonitorColor = '#555' // Dark gray for secondary monitors
  const selectedMonitorBorderColor = '#ff4d4f' // Red border for selected monitor
  const visualizationBgGradient = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' // Dark blue gradient
  const visualizationGridColor = 'rgba(255, 255, 255, 0.07)' // Grid lines
  const monitorLabelColor = 'rgba(255, 255, 255, 0.9)' // White text for monitor labels
  const secondaryTextColor = 'rgba(0, 0, 0, 0.65)' // Secondary text color

  // Function to calculate the visualization dimensions and scale
  const calculateVisualization = useCallback((): void => {
    if (appData.allDisplays.length === 0) return

    // Find the min/max coordinates to determine the total area
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    let hasValidBounds = false

    appData.allDisplays.forEach((display) => {
      if (!display.currentSettings) return

      const { x, y, width, height } = display.currentSettings
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
      hasValidBounds = true
    })

    // If no valid bounds, create default layout
    if (!hasValidBounds) {
      console.log('No valid bounds found, using default layout')
      minX = 0
      minY = 0
      maxX = appData.allDisplays.length * 300 // Default width
      maxY = 200 // Default height
    }

    // Prepare monitor data for rendering with relative positions
    const monitorData: MonitorDisplay[] = appData.allDisplays.map((display, index) => {
      const isPrimary = display.primaryDevice || display.id === '0'
      return {
        id: display.id,
        name: display.name || `Display ${index + 1}`,
        x: display.currentSettings?.x || index * 250,
        y: display.currentSettings?.y || 0,
        width: display.currentSettings?.width || 256,
        height: display.currentSettings?.height || 144,
        isPrimary,
        refreshRate: display.currentSettings?.refreshRate
      }
    })

    setMonitors(monitorData)

    // Set debug info
    setDebugInfo(
      `Monitors: ${appData.allDisplays.length}, Valid bounds: ${hasValidBounds}, Scale: ${(0.543).toFixed(3)}`
    )
  }, [])

  // Handle monitor selection from the sidebar or visualization
  const handleMonitorSelect = (monitorId: string): void => {
    // Toggle selection - if already selected, deselect it
    setSelectedMonitorId(selectedMonitorId === monitorId ? null : monitorId)
  }

  // Calculate on initial render and set up resize listener
  useEffect((): (() => void) => {
    calculateVisualization()

    // Add window resize listener
    const handleResize = (): void => {
      calculateVisualization()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [calculateVisualization])

  // Recalculate when monitors change
  useEffect((): void => {
    calculateVisualization()
  }, [calculateVisualization, appData.allDisplays.length, forceRender])

  // If no displays are available, show an empty state
  if (appData.allDisplays.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <Empty
          description={<span>No monitors detected</span>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  // Force refresh function
  const handleRefresh = async (): Promise<void> => {
    try {
      setIsRefreshing(true)
      // Fetch fresh monitor data from the system using the AppStore method
      const success = await appStore.refreshMonitors()

      if (success) {
        // Update the UI
        setForceRender((prev) => prev + 1)
        calculateVisualization()

        // Show success notification
        notification.success({
          message: 'Refresh Complete',
          description: 'Monitor information has been updated successfully.',
          placement: 'topRight'
        })
      } else {
        throw new Error('Failed to refresh monitors')
      }
    } catch (error) {
      console.error('Error refreshing monitor data:', error)

      // Show error notification
      notification.error({
        message: 'Refresh Failed',
        description: 'Failed to update monitor information. Please try again.',
        placement: 'topRight'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Create a simplified visual representation of monitors
  const renderMonitors = (): JSX.Element => {
    return (
      <div className="monitor-container">
        {monitors.map((monitor) => {
          const isSelected = monitor.id === selectedMonitorId
          const isPrimary = monitor.isPrimary

          // Calculate aspect ratio for more accurate representation
          const aspectRatio = monitor.width / monitor.height

          // Extract display number from ID if possible
          const displayNumber = monitor.id.match(/\d+$/)?.[0] || ''
          const shortName = displayNumber ? `DISPLAY${displayNumber}` : monitor.name

          return (
            <div
              key={monitor.id}
              className={`monitor-display ${isSelected ? 'selected' : ''} ${isPrimary ? 'primary' : ''}`}
              style={{
                backgroundColor: isPrimary ? primaryMonitorColor : secondaryMonitorColor,
                border: isSelected ? `2px solid ${selectedMonitorBorderColor}` : 'none',
                aspectRatio: aspectRatio,
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                zIndex: isSelected ? 10 : 1,
                margin: '0 5px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: monitorLabelColor,
                fontWeight: 500,
                fontSize: '14px',
                textAlign: 'center',
                padding: '10px'
              }}
              onClick={() => handleMonitorSelect(monitor.id)}
            >
              <div className="monitor-label">{shortName}</div>
              <div
                className="monitor-number"
                style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}
              >
                {isPrimary
                  ? 'Primary'
                  : `Monitor ${displayNumber || monitors.indexOf(monitor) + 1}`}
              </div>
              {isPrimary && <div className="primary-indicator" />}
            </div>
          )
        })}
      </div>
    )
  }

  // Function to render the custom resolutions card
  const renderCustomResolutions = (): JSX.Element => {
    if (appData.customResolutions.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No custom resolutions"
          style={{ margin: '20px 0' }}
        />
      )
    }

    return (
      <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
        <List
          dataSource={appData.customResolutions}
          renderItem={(resolution) => (
            <List.Item
              key={`${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}`}
              actions={[
                <Tooltip title="Apply to selected monitor" key="apply">
                  <Button
                    icon={<SettingOutlined />}
                    size="small"
                    disabled={!selectedMonitorId}
                    onClick={() => {
                      if (selectedMonitorId) {
                        // Use setResolution method instead of applyResolution
                        appStore.setResolution(selectedMonitorId, resolution)
                        notification.success({
                          message: 'Resolution Applied',
                          description: `Applied ${resolution.width}x${resolution.height}${
                            resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''
                          } to monitor ${selectedMonitorId}`,
                          placement: 'topRight'
                        })
                      }
                    }}
                  />
                </Tooltip>,
                <Tooltip title="Delete custom resolution" key="delete">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={() => {
                      appStore.removeResolution(resolution)
                      notification.success({
                        message: 'Resolution Removed',
                        description: `Removed ${resolution.width}x${resolution.height}${
                          resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''
                        } from custom resolutions`,
                        placement: 'topRight'
                      })
                    }}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{`${resolution.width} × ${resolution.height}`}</span>
                    {resolution.refreshRate && (
                      <Tag color="blue">{`${resolution.refreshRate} Hz`}</Tag>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>
    )
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          {/* Monitor Information Card - Left Column */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DesktopOutlined style={{ marginRight: 8 }} />
                <span>Monitor Information</span>
              </div>
            }
            bordered
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              height: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {appData.allDisplays.map((display, index) => {
                const isPrimary = display.primaryDevice || display.id === '0'
                const isSelected = selectedMonitorId === display.id

                return (
                  <div
                    key={display.id}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleMonitorSelect(display.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: isPrimary ? primaryMonitorColor : secondaryMonitorColor,
                          marginRight: '12px',
                          marginTop: '4px',
                          borderRadius: '3px',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
                          {display.name || `Display ${index + 1}`}
                        </div>
                        <div
                          style={{
                            color: secondaryTextColor,
                            fontSize: '13px',
                            marginBottom: '2px'
                          }}
                        >
                          ID: {display.id}
                        </div>
                        {display.currentSettings && (
                          <div
                            style={{
                              color: secondaryTextColor,
                              fontSize: '13px',
                              marginBottom: '2px'
                            }}
                          >
                            Resolution: {display.currentSettings.width}x
                            {display.currentSettings.height}
                          </div>
                        )}
                        {display.currentSettings?.refreshRate && (
                          <div
                            style={{
                              color: secondaryTextColor,
                              fontSize: '13px',
                              marginBottom: '2px'
                            }}
                          >
                            Refresh Rate: {display.currentSettings.refreshRate}Hz
                          </div>
                        )}
                        {isPrimary && (
                          <Badge
                            count="Primary"
                            style={{
                              backgroundColor: primaryMonitorColor,
                              marginTop: '4px'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {/* Monitor Visualization Card - Right Column */}
          <Card
            title={
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DesktopOutlined style={{ marginRight: 8 }} />
                  <span>Monitor Map</span>
                </div>
                <div className="control-buttons">
                  <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isRefreshing}>
                    Refresh
                  </Button>
                </div>
              </div>
            }
            bordered
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              height: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
            bodyStyle={{
              padding: 0,
              height: 'calc(100% - 57px)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: visualizationBgGradient,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <style>
                {`
                  .monitor-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    padding: 40px;
                    z-index: 1;
                  }

                  .monitor-display {
                    min-width: 200px;
                    min-height: 120px;
                    border-radius: 4px;
                    overflow: hidden;
                  }

                  .monitor-display.primary {
                    box-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
                  }

                  .monitor-display.selected {
                    box-shadow: 0 0 0 2px #ff4d4f;
                  }

                  .primary-indicator {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: white;
                  }

                  .monitor-label {
                    font-weight: 500;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                  }

                  @media (max-width: 768px) {
                    .monitor-container {
                      flex-direction: column;
                    }

                    .monitor-display {
                      min-width: 160px;
                      min-height: 90px;
                      margin: 5px 0;
                    }
                  }
                `}
              </style>

              {/* Grid background */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `
                    linear-gradient(${visualizationGridColor} 1px, transparent 1px),
                    linear-gradient(90deg, ${visualizationGridColor} 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                  opacity: 0.7,
                  zIndex: 0
                }}
              />

              {renderMonitors()}
            </div>
          </Card>
        </Col>

        {/* Custom Resolutions Card - Full Width Below */}
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <SettingOutlined style={{ marginRight: 8 }} />
                <span>Custom Resolutions</span>
              </div>
            }
            extra={
              <Tooltip title="Select a monitor first to apply a resolution">
                <Text type={selectedMonitorId ? 'success' : 'secondary'}>
                  {selectedMonitorId
                    ? `Monitor ${selectedMonitorId} selected`
                    : 'Select a monitor to apply resolution'}
                </Text>
              </Tooltip>
            }
            bordered
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            {renderCustomResolutions()}
          </Card>
        </Col>
      </Row>

      {/* Debug Info - Small text at the bottom */}
      <div style={{ textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {debugInfo}
        </Text>
      </div>
    </div>
  )
})
