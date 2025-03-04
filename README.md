# Resolution Manager V2

A desktop application for managing screen resolutions on Windows. Built with Electron, React, TypeScript, and MobX.

## Features

- View and change screen resolutions
- Create custom resolutions
- Save and apply last used resolution
- Start application on system startup
- Mobile-friendly UI

## Installation

```bash
# Clone the repository
git clone https://github.com/zepiocs/resolution-manager-v2.git

# Navigate to the project directory
cd resolution-manager-v2

# Install dependencies
bun install

# Start the application
bun run dev
```

## Building

```bash
# Build for Windows
bun run build:win

# Build for macOS
bun run build:mac

# Build for Linux
bun run build:linux
```

## Configuration

The application stores its configuration in the user data directory:

- `settings.json` - Application settings
- `lastResolution.json` - Last used resolution
- `defaultResolutions.json` - Default resolutions list

## Dependencies

- Electron
- React
- TypeScript
- MobX
- Ant Design
- monitorres (custom library for screen resolution management)

## License

MIT
