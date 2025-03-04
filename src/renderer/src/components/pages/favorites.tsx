import { useState, useEffect } from 'react'
import { observer } from 'mobx-react'
import {
  Card,
  Typography,
  List,
  Tag,
  Button,
  Space,
  Tooltip,
  notification,
  Tabs,
  Empty,
  Modal,
  Input,
  Form,
  Select
} from 'antd'
import {
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { appData } from '../../stores/App.data'
import { appStore } from '../../stores/App.store'
import { IResolution, IFavoriteResolution, IMonitorLabel } from '../../interfaces'

const { Text } = Typography
const { TabPane } = Tabs
const { Option } = Select

// Extended interface for resolutions with favorite flag
interface ExtendedResolution extends IResolution {
  isFavorite?: boolean
  monitorId?: string // Add monitor ID to track which monitor this is a favorite for
  label?: string // Optional label for the resolution
}

export const Favorites = observer(() => {
  const [favoriteResolutions, setFavoriteResolutions] = useState<ExtendedResolution[]>([])
  const [allResolutions, setAllResolutions] = useState<ExtendedResolution[]>([])
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [currentResolution, setCurrentResolution] = useState<ExtendedResolution | null>(null)
  const [form] = Form.useForm()
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null)
  const [activeMonitorTab, setActiveMonitorTab] = useState<string>('all')
  const [monitorLabels, setMonitorLabels] = useState<IMonitorLabel[]>([])
  const [isAddToFavoriteModalVisible, setIsAddToFavoriteModalVisible] = useState(false)
  const [favoriteForm] = Form.useForm()
  const [resolutionToFavorite, setResolutionToFavorite] = useState<ExtendedResolution | null>(null)

  // Debug info string
  const debugInfo = `Favorites: ${favoriteResolutions.length}, Total: ${allResolutions.length}, Last updated: ${new Date().toLocaleTimeString()}`

  // Load favorites and monitor labels from localStorage on component mount
  useEffect(() => {
    loadFavorites()
    loadMonitorLabels()

    // Set up listener for applying favorite resolutions from tray
    window.favorites?.onApplyFavorite((resolution: IResolution, monitorId?: string): void => {
      // Find a monitor to apply to (use provided monitorId or default to first monitor)
      const targetMonitorId =
        monitorId || (appData.allDisplays.length > 0 ? appData.allDisplays[0].id : null)

      if (targetMonitorId) {
        appStore.setResolution(targetMonitorId, resolution)

        notification.success({
          message: 'Resolution Applied',
          description: `Applied ${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''} to monitor ${getMonitorDisplayName(targetMonitorId)}`,
          placement: 'topRight'
        })
      } else {
        notification.warning({
          message: 'No Monitors',
          description: 'No monitors detected to apply resolution',
          placement: 'topRight'
        })
      }
    })

    return (): void => {
      // Cleanup if needed
    }
  }, [appData.customResolutions])

  // Load monitor labels from localStorage
  const loadMonitorLabels = (): void => {
    try {
      const storedLabels = localStorage.getItem('monitorLabels')
      const labels: IMonitorLabel[] = storedLabels ? JSON.parse(storedLabels) : []
      setMonitorLabels(labels)
    } catch (error) {
      console.error('Error loading monitor labels:', error)
    }
  }

  // Get the display name for a monitor (custom label or default name)
  const getMonitorDisplayName = (monitorId: string): string => {
    const label = monitorLabels.find((label) => label.id === monitorId)?.label
    if (label) return label

    const monitor = appData.allDisplays.find((monitor) => monitor.id === monitorId)
    return monitor ? `${monitor.name}${monitor.primaryDevice ? ' (Primary)' : ''}` : monitorId
  }

  // Update tray menu when favorites change
  useEffect(() => {
    const updateFavoritesInTray = (): void => {
      try {
        const storedFavorites = localStorage.getItem('favoriteResolutions')
        const favorites = storedFavorites ? JSON.parse(storedFavorites) : []

        if (window.favorites) {
          // Only send update if there are actual favorites to send
          if (storedFavorites && favorites.length > 0) {
            window.favorites.updateFavorites(favorites)
            console.log('Updated favorites in tray:', favorites)
          } else {
            console.log('No favorites to update in tray')
          }
        } else {
          console.warn('Favorites API not available, will retry')
          // Retry after a short delay if the favorites API isn't available yet
          setTimeout(updateFavoritesInTray, 500)
        }
      } catch (error) {
        console.error('Error updating favorites in tray:', error)
      }
    }

    updateFavoritesInTray()
  }, [favoriteResolutions])

  // Load favorites from localStorage
  const loadFavorites = (): void => {
    try {
      const storedFavorites = localStorage.getItem('favoriteResolutions')
      const favorites: IFavoriteResolution[] = storedFavorites ? JSON.parse(storedFavorites) : []

      // Combine default and custom resolutions
      const combined = [...appData.defaultResolutions, ...appData.customResolutions]

      // Mark favorites
      const marked = combined.map((res) => {
        const key = `${res.width}x${res.height}${res.refreshRate ? '@' + res.refreshRate : ''}`

        // Find if this resolution is a favorite for any monitor
        const favoriteEntries = favorites.filter((fav) => fav.resolution === key)
        const isFavorite = favoriteEntries.length > 0

        // If it's a favorite for a specific monitor, use that monitor ID
        // If it's a global favorite (no monitorId), it will be undefined
        const favoriteEntry = favoriteEntries.length > 0 ? favoriteEntries[0] : undefined
        const monitorId = favoriteEntry?.monitorId
        const label = favoriteEntry?.label

        return {
          ...res,
          isFavorite,
          monitorId,
          label
        }
      })

      setAllResolutions(marked)
      setFavoriteResolutions(marked.filter((res) => res.isFavorite))
    } catch (error) {
      console.error('Error loading favorites:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to load favorite resolutions',
        placement: 'topRight'
      })
    }
  }

  // Show add to favorites modal
  const showAddToFavoriteModal = (resolution: ExtendedResolution): void => {
    setResolutionToFavorite(resolution)
    favoriteForm.resetFields()
    setIsAddToFavoriteModalVisible(true)
  }

  // Handle add to favorites form submission
  const handleAddToFavoriteSubmit = (): void => {
    favoriteForm.validateFields().then((values) => {
      const { monitorId, label } = values

      if (resolutionToFavorite) {
        toggleFavorite(resolutionToFavorite, monitorId, label)
        setIsAddToFavoriteModalVisible(false)
      }
    })
  }

  // Toggle favorite status
  const toggleFavorite = (
    resolution: ExtendedResolution,
    monitorId?: string,
    label?: string
  ): void => {
    try {
      // Validate resolution properties
      if (
        !resolution ||
        typeof resolution.width !== 'number' ||
        typeof resolution.height !== 'number'
      ) {
        console.error('Invalid resolution object:', resolution)
        notification.error({
          message: 'Error',
          description: 'Invalid resolution format',
          placement: 'topRight'
        })
        return
      }

      const key = `${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}`

      // Validate the key format - accept both with and without refresh rate
      if (!key.match(/^(\d+)x(\d+)(@\d+)?$/)) {
        console.error('Invalid resolution format:', key)
        notification.error({
          message: 'Error',
          description: 'Invalid resolution format',
          placement: 'topRight'
        })
        return
      }

      const storedFavorites = localStorage.getItem('favoriteResolutions')
      const favorites: IFavoriteResolution[] = storedFavorites ? JSON.parse(storedFavorites) : []

      // Check if this resolution is already a favorite for this monitor
      const existingIndex = favorites.findIndex(
        (fav) =>
          fav.resolution === key && ((!fav.monitorId && !monitorId) || fav.monitorId === monitorId)
      )

      if (existingIndex >= 0) {
        // Remove from favorites
        favorites.splice(existingIndex, 1)
        notification.success({
          message: 'Removed from Favorites',
          description: `Removed ${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''} ${monitorId ? `for monitor ${getMonitorDisplayName(monitorId)}` : 'globally'}`,
          placement: 'topRight'
        })
      } else {
        // Add to favorites
        favorites.push({
          resolution: key,
          monitorId,
          label
        })
        notification.success({
          message: 'Added to Favorites',
          description: `Added ${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''} ${monitorId ? `for monitor ${getMonitorDisplayName(monitorId)}` : 'globally'}${label ? ` with label "${label}"` : ''}`,
          placement: 'topRight'
        })
      }

      localStorage.setItem('favoriteResolutions', JSON.stringify(favorites))
      loadFavorites() // Reload to update UI
    } catch (error) {
      console.error('Error toggling favorite:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to update favorite status',
        placement: 'topRight'
      })
    }
  }

  // Open edit modal
  const openEditModal = (resolution: ExtendedResolution): void => {
    setCurrentResolution(resolution)
    form.setFieldsValue({
      width: resolution.width,
      height: resolution.height,
      refreshRate: resolution.refreshRate
    })
    setIsEditModalVisible(true)
  }

  // Handle edit form submission
  const handleEditSubmit = (): void => {
    form
      .validateFields()
      .then((values: { width: string; height: string; refreshRate?: string }) => {
        if (currentResolution) {
          // Remove old resolution
          appStore.removeResolution(currentResolution as IResolution)

          // Add new resolution
          const newResolution: IResolution = {
            width: parseInt(values.width),
            height: parseInt(values.height),
            refreshRate: values.refreshRate ? parseInt(values.refreshRate) : undefined
          }

          appStore.addResolution(newResolution)

          // Update favorites if needed
          if (currentResolution.isFavorite) {
            const oldKey = `${currentResolution.width}x${currentResolution.height}${currentResolution.refreshRate ? '@' + currentResolution.refreshRate : ''}`
            const newKey = `${newResolution.width}x${newResolution.height}${newResolution.refreshRate ? '@' + newResolution.refreshRate : ''}`

            const storedFavorites = localStorage.getItem('favoriteResolutions')
            let favorites: IFavoriteResolution[] = storedFavorites
              ? JSON.parse(storedFavorites)
              : []

            // Find and update all favorites that match the old resolution
            favorites = favorites.map((fav) => {
              if (fav.resolution === oldKey) {
                return { ...fav, resolution: newKey }
              }
              return fav
            })

            localStorage.setItem('favoriteResolutions', JSON.stringify(favorites))
          }

          notification.success({
            message: 'Resolution Updated',
            description: `Updated resolution to ${newResolution.width}x${newResolution.height}${newResolution.refreshRate ? '@' + newResolution.refreshRate + 'Hz' : ''}`,
            placement: 'topRight'
          })

          setIsEditModalVisible(false)
          loadFavorites() // Reload to update UI
        }
      })
  }

  // Delete resolution
  const deleteResolution = (resolution: ExtendedResolution): void => {
    // Only custom resolutions can be deleted
    const isCustom = appData.customResolutions.some(
      (res) =>
        res.width === resolution.width &&
        res.height === resolution.height &&
        res.refreshRate === resolution.refreshRate
    )

    if (isCustom) {
      // Remove from favorites if needed
      if (resolution.isFavorite) {
        const key = `${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}`
        const storedFavorites = localStorage.getItem('favoriteResolutions')
        let favorites: IFavoriteResolution[] = storedFavorites ? JSON.parse(storedFavorites) : []

        // Remove all favorites for this resolution
        favorites = favorites.filter((fav) => fav.resolution !== key)
        localStorage.setItem('favoriteResolutions', JSON.stringify(favorites))
      }

      // Remove resolution
      appStore.removeResolution(resolution as IResolution)

      notification.success({
        message: 'Resolution Deleted',
        description: `Deleted ${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''}`,
        placement: 'topRight'
      })

      loadFavorites() // Reload to update UI
    } else {
      notification.warning({
        message: 'Cannot Delete',
        description: 'Default resolutions cannot be deleted',
        placement: 'topRight'
      })
    }
  }

  // Apply resolution to selected monitor
  const applyResolution = (resolution: ExtendedResolution): void => {
    if (appData.allDisplays.length === 0) {
      notification.warning({
        message: 'No Monitors',
        description: 'No monitors detected to apply resolution',
        placement: 'topRight'
      })
      return
    }

    // If this is a monitor-specific favorite, use that monitor
    if (resolution.monitorId) {
      // Check if the monitor still exists
      const monitorExists = appData.allDisplays.some(
        (monitor) => monitor.id === resolution.monitorId
      )

      if (monitorExists) {
        applyResolutionToMonitor(resolution, resolution.monitorId)
        return
      } else {
        // If the monitor no longer exists, fall back to selection
        notification.warning({
          message: 'Monitor Not Found',
          description: 'The associated monitor was not found. Please select a monitor.',
          placement: 'topRight'
        })
      }
    }

    // If no monitor is selected or the associated monitor doesn't exist, show modal to select one
    if (!selectedMonitorId) {
      Modal.info({
        title: 'Select Monitor',
        content: (
          <div>
            <p>Please select a monitor to apply this resolution:</p>
            <Space direction="vertical" style={{ width: '100%', marginTop: '16px' }}>
              {appData.allDisplays.map((monitor) => (
                <Button
                  key={monitor.id}
                  onClick={() => {
                    setSelectedMonitorId(monitor.id)
                    Modal.destroyAll()
                    applyResolutionToMonitor(resolution, monitor.id)
                  }}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  {monitor.name} ({monitor.id})
                  {monitor.primaryDevice && (
                    <Tag color="blue" style={{ marginLeft: '8px' }}>
                      Primary
                    </Tag>
                  )}
                </Button>
              ))}
            </Space>
          </div>
        ) as React.ReactNode
      })
      return
    }

    // Apply resolution to selected monitor
    applyResolutionToMonitor(resolution, selectedMonitorId)
  }

  // Helper function to apply resolution to a specific monitor
  const applyResolutionToMonitor = (resolution: ExtendedResolution, monitorId: string): void => {
    appStore.setResolution(monitorId, resolution as IResolution)

    notification.success({
      message: 'Resolution Applied',
      description: `Applied ${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate + 'Hz' : ''} to monitor ${getMonitorDisplayName(monitorId)}`,
      placement: 'topRight'
    })
  }

  // Render resolution item
  const renderResolutionItem = (
    resolution: ExtendedResolution,
    showEditDelete = false,
    monitorId?: string
  ): JSX.Element => {
    const isCustom = appData.customResolutions.some(
      (res) =>
        res.width === resolution.width &&
        res.height === resolution.height &&
        res.refreshRate === resolution.refreshRate
    )

    // Check if this resolution is a favorite for the specified monitor
    const key = `${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}`
    const storedFavorites = localStorage.getItem('favoriteResolutions')
    const favorites: IFavoriteResolution[] = storedFavorites ? JSON.parse(storedFavorites) : []

    const favoriteEntry = favorites.find(
      (fav) =>
        fav.resolution === key && ((!fav.monitorId && !monitorId) || fav.monitorId === monitorId)
    )

    const isFavoriteForMonitor = !!favoriteEntry
    const favoriteLabel = favoriteEntry?.label

    return (
      <List.Item
        key={`${resolution.width}x${resolution.height}${resolution.refreshRate ? '@' + resolution.refreshRate : ''}${monitorId ? `-${monitorId}` : ''}`}
        actions={[
          <Tooltip
            title={isFavoriteForMonitor ? 'Remove from favorites' : 'Add to favorites'}
            key="favorite"
          >
            <Button
              icon={isFavoriteForMonitor ? <StarFilled /> : <StarOutlined />}
              size="small"
              type={isFavoriteForMonitor ? 'primary' : 'default'}
              onClick={() => {
                if (isFavoriteForMonitor) {
                  // If it's already a favorite, just remove it
                  toggleFavorite(resolution, monitorId)
                } else {
                  // If it's not a favorite, show the modal to add it
                  showAddToFavoriteModal(resolution)
                }
              }}
            />
          </Tooltip>,
          <Tooltip title="Apply to monitor" key="apply">
            <Button
              icon={<SettingOutlined />}
              size="small"
              onClick={() => {
                if (monitorId) {
                  // If we're in a monitor-specific tab, apply directly to that monitor
                  applyResolutionToMonitor(resolution, monitorId)
                } else {
                  // Otherwise use the standard apply method
                  applyResolution(resolution)
                }
              }}
            />
          </Tooltip>,
          ...(showEditDelete && isCustom
            ? [
                <Tooltip title="Edit resolution" key="edit">
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => openEditModal(resolution)}
                  />
                </Tooltip>,
                <Tooltip title="Delete resolution" key="delete">
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    size="small"
                    onClick={() => deleteResolution(resolution)}
                  />
                </Tooltip>
              ]
            : [])
        ]}
      >
        <List.Item.Meta
          title={
            <Space>
              <Text strong>{`${resolution.width}x${resolution.height}`}</Text>
              {resolution.refreshRate && <Text>{`${resolution.refreshRate}Hz`}</Text>}
              {isCustom && (
                <Tag color="green" style={{ marginLeft: '8px' }}>
                  Custom
                </Tag>
              )}
              {resolution.monitorId && activeMonitorTab === 'all' && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>
                  {getMonitorDisplayName(resolution.monitorId)}
                </Tag>
              )}
              {favoriteLabel && (
                <Tag color="purple" style={{ marginLeft: '8px' }}>
                  {favoriteLabel}
                </Tag>
              )}
            </Space>
          }
        />
      </List.Item>
    )
  }

  // Generate tabs for each monitor
  const generateMonitorTabs = (): JSX.Element[] => {
    const tabs = [
      <TabPane tab="All Monitors" key="all">
        <List
          dataSource={favoriteResolutions}
          renderItem={(item) => renderResolutionItem(item, true)}
          locale={{
            emptyText: <Empty description="No favorite resolutions" />
          }}
        />
      </TabPane>
    ]

    // Add a tab for each monitor
    appData.allDisplays.forEach((monitor) => {
      // Filter favorites for this monitor
      const monitorFavorites = favoriteResolutions.filter(
        (res) => res.monitorId === monitor.id || !res.monitorId // Include global favorites
      )

      tabs.push(
        <TabPane tab={getMonitorDisplayName(monitor.id)} key={monitor.id}>
          <List
            dataSource={monitorFavorites}
            renderItem={(item) => renderResolutionItem(item, true, monitor.id)}
            locale={{
              emptyText: (
                <Empty
                  description={`No favorite resolutions for ${getMonitorDisplayName(monitor.id)}`}
                />
              )
            }}
          />
        </TabPane>
      )
    })

    return tabs
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Favorite Resolutions" style={{ marginBottom: '20px' }}>
        <Tabs
          defaultActiveKey="all"
          onChange={(key) => setActiveMonitorTab(key)}
          tabPosition="top"
          style={{ minHeight: '300px' }}
        >
          {generateMonitorTabs()}
        </Tabs>
      </Card>

      <Card title="All Resolutions" style={{ marginBottom: '20px' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="All Resolutions" key="1">
            <List
              dataSource={allResolutions}
              renderItem={(item) => renderResolutionItem(item, true)}
              locale={{
                emptyText: <Empty description="No resolutions available" />
              }}
            />
          </TabPane>
          <TabPane tab="Default Resolutions" key="2">
            <List
              dataSource={allResolutions.filter(
                (res) =>
                  !appData.customResolutions.some(
                    (custom) =>
                      custom.width === res.width &&
                      custom.height === res.height &&
                      custom.refreshRate === res.refreshRate
                  )
              )}
              renderItem={(item) => renderResolutionItem(item, false)}
              locale={{
                emptyText: <Empty description="No default resolutions" />
              }}
            />
          </TabPane>
          <TabPane tab="Custom Resolutions" key="3">
            <List
              dataSource={allResolutions.filter((res) =>
                appData.customResolutions.some(
                  (custom) =>
                    custom.width === res.width &&
                    custom.height === res.height &&
                    custom.refreshRate === res.refreshRate
                )
              )}
              renderItem={(item) => renderResolutionItem(item, true)}
              locale={{
                emptyText: <Empty description="No custom resolutions" />
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Edit Resolution Modal */}
      <Modal
        title="Edit Resolution"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="width"
            label="Width"
            rules={[{ required: true, message: 'Please enter width' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="height"
            label="Height"
            rules={[{ required: true, message: 'Please enter height' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item name="refreshRate" label="Refresh Rate (optional)">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add to Favorites Modal */}
      <Modal
        title="Add to Favorites"
        open={isAddToFavoriteModalVisible}
        onOk={handleAddToFavoriteSubmit}
        onCancel={() => setIsAddToFavoriteModalVisible(false)}
      >
        <Form form={favoriteForm} layout="vertical">
          <Form.Item
            name="monitorId"
            label="Monitor (optional)"
            extra="Select a monitor to make this a monitor-specific favorite, or leave empty for a global favorite."
          >
            <Select placeholder="Select a monitor (optional)" allowClear>
              {appData.allDisplays.map((monitor) => (
                <Option key={monitor.id} value={monitor.id}>
                  {getMonitorDisplayName(monitor.id)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="label"
            label="Label (optional)"
            extra="Add a custom label to help identify this favorite resolution."
          >
            <Input placeholder="E.g., Gaming, Work, Movies, etc." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Debug info (hidden in production) */}
      {process.env.NODE_ENV === 'development' && (
        <Card size="small" style={{ marginTop: '20px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {debugInfo}
          </Text>
        </Card>
      )}
    </div>
  )
})
