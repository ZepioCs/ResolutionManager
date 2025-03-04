import { useState, useEffect } from 'react'
import { observer } from 'mobx-react'
import { Card, Typography, List, Button, Space, Input, Form, notification, Tag, Empty } from 'antd'
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons'
import { appData } from '../../stores/App.data'
import { IMonitorLabel } from '../../interfaces'

const { Text } = Typography

export const MonitorLabels = observer(() => {
  const [monitorLabels, setMonitorLabels] = useState<IMonitorLabel[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Load monitor labels from localStorage on component mount
  useEffect(() => {
    loadMonitorLabels()
  }, [appData.allDisplays])

  // Load monitor labels from localStorage
  const loadMonitorLabels = (): void => {
    try {
      const storedLabels = localStorage.getItem('monitorLabels')
      const labels: IMonitorLabel[] = storedLabels ? JSON.parse(storedLabels) : []
      setMonitorLabels(labels)
    } catch (error) {
      console.error('Error loading monitor labels:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to load monitor labels',
        placement: 'topRight'
      })
    }
  }

  // Save monitor labels to localStorage
  const saveMonitorLabels = (labels: IMonitorLabel[]): void => {
    try {
      localStorage.setItem('monitorLabels', JSON.stringify(labels))
      setMonitorLabels(labels)

      // Send update to main process for tray menu
      if (window.favorites && labels.length > 0) {
        window.favorites.updateMonitorLabels(labels)
        console.log('Sent monitor labels update to main process:', labels)
      } else if (labels.length === 0) {
        console.log('No monitor labels to send to main process')
      } else {
        console.warn('Favorites API not available, monitor labels not sent to main process')
      }
    } catch (error) {
      console.error('Error saving monitor labels:', error)
      notification.error({
        message: 'Error',
        description: 'Failed to save monitor labels',
        placement: 'topRight'
      })
    }
  }

  // Start editing a monitor label
  const startEditing = (monitorId: string): void => {
    setEditingId(monitorId)
    const label = monitorLabels.find((label) => label.id === monitorId)?.label || ''
    form.setFieldsValue({ label })
  }

  // Save a monitor label
  const saveLabel = (monitorId: string): void => {
    form.validateFields().then((values) => {
      const { label } = values
      const existingLabelIndex = monitorLabels.findIndex((item) => item.id === monitorId)

      let newLabels: IMonitorLabel[]

      if (existingLabelIndex >= 0) {
        // Update existing label
        newLabels = [...monitorLabels]
        newLabels[existingLabelIndex] = { id: monitorId, label }
      } else {
        // Add new label
        newLabels = [...monitorLabels, { id: monitorId, label }]
      }

      saveMonitorLabels(newLabels)
      setEditingId(null)

      notification.success({
        message: 'Label Saved',
        description: `Monitor label updated to "${label}"`,
        placement: 'topRight'
      })
    })
  }

  // Cancel editing
  const cancelEditing = (): void => {
    setEditingId(null)
  }

  // Get the display name for a monitor (custom label or default name)
  const getDisplayName = (monitorId: string): string => {
    const label = monitorLabels.find((label) => label.id === monitorId)?.label
    if (label) return label

    const monitor = appData.allDisplays.find((monitor) => monitor.id === monitorId)
    return monitor ? `${monitor.name}${monitor.primaryDevice ? ' (Primary)' : ''}` : monitorId
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Monitor Labels" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            Assign custom labels to your monitors for easier identification. These labels will be
            used throughout the application.
          </Text>

          {appData.allDisplays.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={appData.allDisplays}
              renderItem={(monitor) => (
                <List.Item
                  key={monitor.id}
                  actions={[
                    editingId === monitor.id ? (
                      <>
                        <Button
                          icon={<SaveOutlined />}
                          type="primary"
                          onClick={() => saveLabel(monitor.id)}
                        >
                          Save
                        </Button>
                        <Button icon={<UndoOutlined />} onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button icon={<EditOutlined />} onClick={() => startEditing(monitor.id)}>
                        Edit Label
                      </Button>
                    )
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{monitor.name}</Text>
                        {monitor.primaryDevice && <Tag color="blue">Primary</Tag>}
                        <Text type="secondary">ID: {monitor.id}</Text>
                      </Space>
                    }
                    description={
                      editingId === monitor.id ? (
                        <Form form={form} layout="inline">
                          <Form.Item
                            name="label"
                            rules={[{ required: true, message: 'Please enter a label' }]}
                            style={{ width: '300px' }}
                          >
                            <Input placeholder="Enter a friendly name for this monitor" />
                          </Form.Item>
                        </Form>
                      ) : (
                        <Space>
                          <Text>Current Label:</Text>
                          <Text strong>
                            {monitorLabels.find((label) => label.id === monitor.id)?.label || (
                              <Text type="secondary">No custom label</Text>
                            )}
                          </Text>
                        </Space>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No monitors detected" />
          )}
        </Space>
      </Card>

      <Card title="Monitor Information" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            This information shows how your monitors will be displayed throughout the application.
          </Text>

          {appData.allDisplays.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={appData.allDisplays}
              renderItem={(monitor) => (
                <List.Item key={monitor.id}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{getDisplayName(monitor.id)}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical">
                        <Text>
                          Resolution: {monitor.currentSettings?.width}x
                          {monitor.currentSettings?.height}
                        </Text>
                        <Text>Refresh Rate: {monitor.currentSettings?.refreshRate}Hz</Text>
                        <Text type="secondary">System ID: {monitor.id}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No monitors detected" />
          )}
        </Space>
      </Card>
    </div>
  )
})
