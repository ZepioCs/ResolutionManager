import { useState } from 'react'
import { observer } from 'mobx-react'
import {
  Input,
  Button,
  Form,
  notification,
  Card,
  Typography,
  Space,
  List,
  Tag,
  Empty,
  Tooltip
} from 'antd'
import { appData } from '../../stores/App.data'
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { IResolution } from '../../interfaces'
import { appStore } from '../../stores/App.store'

const { Text } = Typography

interface CreateResolutionProps {
  onAddResolution: (width: string, height: string, refreshRate?: string) => void
}

export const CreateResolution = observer(({ onAddResolution }: CreateResolutionProps) => {
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [refreshRate, setRefreshRate] = useState('')
  const [form] = Form.useForm()

  // Debug info string
  const debugInfo = `Resolutions: ${appData.customResolutions.length}, Last updated: ${new Date().toLocaleTimeString()}`

  const handleAddResolution = (): void => {
    if (width && height) {
      const widthNum = parseInt(width)
      const heightNum = parseInt(height)
      const refreshRateNum = refreshRate ? parseInt(refreshRate) : undefined

      if (isNaN(widthNum) || isNaN(heightNum)) {
        notification.error({
          message: 'Error',
          description: 'Width and height must be numbers',
          placement: 'topRight'
        })
        return
      }

      if (widthNum <= 0 || heightNum <= 0) {
        notification.error({
          message: 'Error',
          description: 'Width and height must be positive numbers',
          placement: 'topRight'
        })
        return
      }

      if (refreshRate && (isNaN(refreshRateNum!) || refreshRateNum! <= 0)) {
        notification.error({
          message: 'Error',
          description: 'Refresh rate must be a positive number',
          placement: 'topRight'
        })
        return
      }

      // Check if resolution already exists
      // Note: We need to check for custom type with refreshRate
      const exists = appData.resolutions.some(
        (resolution: IResolution & { refreshRate?: number }) =>
          resolution.width === widthNum &&
          resolution.height === heightNum &&
          (refreshRateNum === undefined || resolution.refreshRate === refreshRateNum)
      )

      if (exists) {
        notification.error({
          message: 'Error',
          description: 'Resolution already exists',
          placement: 'topRight'
        })
        return
      }

      onAddResolution(width, height, refreshRate)
      notification.success({
        message: 'Success',
        description: 'Resolution added successfully',
        placement: 'topRight'
      })
      form.resetFields()
      setWidth('')
      setHeight('')
      setRefreshRate('')
    } else {
      notification.error({
        message: 'Error',
        description: 'Please enter width and height',
        placement: 'topRight'
      })
    }
  }

  // Function to render the custom resolutions list
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
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div>
          <Text style={{ marginBottom: '8px' }}>
            Add custom resolutions to the list of available options. Refresh rate is optional.
          </Text>
        </div>

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <PlusOutlined style={{ marginRight: '8px' }} />
              <span>Add New Resolution</span>
            </div>
          }
          bordered
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            marginBottom: '8px'
          }}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="Width (pixels)"
              name="width"
              rules={[{ required: true, message: 'Please enter width' }]}
            >
              <Input
                placeholder="e.g. 1920"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                suffix="px"
              />
            </Form.Item>
            <Form.Item
              label="Height (pixels)"
              name="height"
              rules={[{ required: true, message: 'Please enter height' }]}
            >
              <Input
                placeholder="e.g. 1080"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                suffix="px"
              />
            </Form.Item>
            <Form.Item
              label="Refresh Rate (Hz)"
              name="refreshRate"
              rules={[{ required: false, message: 'Please enter refresh rate' }]}
              tooltip="Optional. Leave empty if you don't want to specify a refresh rate."
            >
              <Input
                placeholder="e.g. 60"
                value={refreshRate}
                onChange={(e) => setRefreshRate(e.target.value)}
                suffix="Hz"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleAddResolution} icon={<PlusOutlined />}>
                Add Resolution
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Custom Resolutions List Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <EyeOutlined style={{ marginRight: '8px' }} />
              <span>Your Custom Resolutions</span>
            </div>
          }
          bordered
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            marginTop: '0'
          }}
        >
          {renderCustomResolutions()}
        </Card>
      </Space>

      {/* Debug Info - Small text at the bottom */}
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {debugInfo}
        </Text>
      </div>
    </div>
  )
})
