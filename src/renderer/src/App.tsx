import { useEffect } from 'react'
import { observer } from 'mobx-react'
import { Layout, theme, Menu, Typography, Space } from 'antd'
import type { MenuProps } from 'antd'
import {
  DesktopOutlined,
  SettingOutlined,
  HomeOutlined,
  PlusOutlined,
  StarOutlined,
  TagsOutlined
} from '@ant-design/icons'
import { ChangeResolution } from './components/pages/changeResolution'
import { CreateResolution } from './components/pages/createResolution'
import { Settings } from './components/pages/settings'
import { MonitorVisualization } from './components/pages/monitorVisualization'
import { Favorites } from './components/pages/favorites'
import { MonitorLabels } from './components/pages/monitorLabels'
import { appStore } from './stores/App.store'
import { appData } from './stores/App.data'
import { IResolution } from './interfaces'
import { ConfigProvider } from 'antd'

const { Title } = Typography

type MenuItem = Required<MenuProps>['items'][number]

const itemsValues = [
  { key: '1', value: 'Change Resolution', icon: <HomeOutlined /> },
  { key: '2', value: 'Create Resolution', icon: <PlusOutlined /> },
  { key: '3', value: 'Settings', icon: <SettingOutlined /> },
  { key: '4', value: 'Monitor Map', icon: <DesktopOutlined /> },
  { key: '5', value: 'Favorites', icon: <StarOutlined /> },
  { key: '6', value: 'Monitor Labels', icon: <TagsOutlined /> }
]

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type
  } as MenuItem
}

const items: MenuProps['items'] = [
  getItem('Change Resolution', '1', <HomeOutlined />),
  getItem('Create Resolution', '2', <PlusOutlined />),
  getItem('Settings', '3', <SettingOutlined />),
  getItem('Monitor Map', '4', <DesktopOutlined />),
  getItem('Favorites', '5', <StarOutlined />),
  getItem('Monitor Labels', '6', <TagsOutlined />)
]

const App = observer(() => {
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken()

  useEffect(() => {
    // Initialize the app and then load favorites
    appStore.init().then(() => {
      appData.pageHeader =
        itemsValues.find((item) => item.key === appData.selectedPage)?.value ||
        "Error: couldn't get header"

      // Set light mode background
      document.body.style.backgroundColor = '#fff'

      // Add a small delay to ensure IPC is ready
      setTimeout(loadFavoritesAtStartup, 1000)
      setTimeout(loadMonitorLabelsAtStartup, 1000)
    })

    // Load favorites at startup and send to tray
    const loadFavoritesAtStartup = (): void => {
      try {
        const storedFavorites = localStorage.getItem('favoriteResolutions')
        const favorites = storedFavorites ? JSON.parse(storedFavorites) : []

        if (window.favorites) {
          // Only send update if there are actual favorites to send
          if (storedFavorites && favorites.length > 0) {
            window.favorites.updateFavorites(favorites)
            console.log('Loaded favorites at startup:', favorites)
          } else {
            console.log('No favorites to load at startup')
          }
        } else {
          console.warn('Favorites API not available yet, will retry')
          // Retry after a short delay if the favorites API isn't available yet
          setTimeout(loadFavoritesAtStartup, 500)
        }
      } catch (error) {
        console.error('Error loading favorites at startup:', error)
      }
    }

    // Load monitor labels at startup and send to tray
    const loadMonitorLabelsAtStartup = (): void => {
      try {
        const storedLabels = localStorage.getItem('monitorLabels')
        const labels = storedLabels ? JSON.parse(storedLabels) : []

        if (window.favorites) {
          // Only send update if there are actual labels to send
          if (storedLabels && labels.length > 0) {
            window.favorites.updateMonitorLabels(labels)
            console.log('Loaded monitor labels at startup:', labels)
          } else {
            console.log('No monitor labels to load at startup')
          }
        } else {
          console.warn('Favorites API not available yet, will retry')
          // Retry after a short delay if the favorites API isn't available yet
          setTimeout(loadMonitorLabelsAtStartup, 500)
        }
      } catch (error) {
        console.error('Error loading monitor labels at startup:', error)
      }
    }

    // Set up listener for request-favorites message from main process
    if (window.favorites) {
      window.favorites.onRequestFavorites(() => {
        console.log('Received request for favorites from main process')
        loadFavoritesAtStartup()
        loadMonitorLabelsAtStartup()
      })
    }
  }, [])

  const handleOnAddResolution = (width: string, height: string, refreshRate?: string): void => {
    const toAddRes: IResolution & { refreshRate?: number } = {
      width: parseInt(width),
      height: parseInt(height)
    }

    if (refreshRate) {
      toAddRes.refreshRate = parseInt(refreshRate)
    }

    appStore.addResolution(toAddRes)
  }

  // Custom theme with light mode only
  const customTheme = {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 6,
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff'
    }
  }

  return (
    <ConfigProvider theme={customTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Sider
          collapsible
          collapsed={appData.isCollapsed}
          onCollapse={() => appStore.toggleCollapsed()}
          theme="light"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            borderRight: '1px solid #f0f0f0'
          }}
        >
          <div
            className="logo"
            style={{
              padding: appData.isCollapsed ? '16px 0' : '16px',
              textAlign: 'center',
              borderBottom: '1px solid #f0f0f0',
              height: '64px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => appStore.switchPage('4', 'Monitor Map')}
          >
            <div
              style={{
                fontSize: appData.isCollapsed ? '12px' : '18px',
                fontWeight: 'bold',
                color: '#1890ff',
                lineHeight: '1.2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {appData.isCollapsed ? 'RM' : 'ResolutionManager'}
            </div>
            {!appData.isCollapsed && (
              <div
                style={{
                  fontSize: '10px',
                  color: 'rgba(0, 0, 0, 0.45)',
                  lineHeight: '1.2'
                }}
              >
                Monitor & Resolution Control
              </div>
            )}
          </div>
          <Menu
            theme="light"
            defaultSelectedKeys={[appData.selectedPage]}
            selectedKeys={[appData.selectedPage]}
            mode="inline"
            items={items}
            onClick={(e) => {
              const header =
                itemsValues.find((item) => item.key === e.key)?.value ||
                "Error: couldn't get header"
              appStore.switchPage(e.key, header)
            }}
            style={{ borderRight: 0 }}
          />
        </Layout.Sider>
        <Layout style={{ marginLeft: appData.isCollapsed ? 80 : 200, transition: 'all 0.2s' }}>
          <Layout.Header
            style={{
              padding: '0 16px',
              background: colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              width: '100%'
            }}
          >
            <Title level={4} style={{ margin: 0 }}>
              {appData.pageHeader}
            </Title>
            <Space>{/* Additional header content can go here */}</Space>
          </Layout.Header>
          <Layout.Content
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG
            }}
          >
            {appData.selectedPage === '1' && <ChangeResolution />}
            {appData.selectedPage === '2' && (
              <CreateResolution onAddResolution={handleOnAddResolution} />
            )}
            {appData.selectedPage === '3' && <Settings />}
            {appData.selectedPage === '4' && <MonitorVisualization />}
            {appData.selectedPage === '5' && <Favorites />}
            {appData.selectedPage === '6' && <MonitorLabels />}
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
})

export default App
