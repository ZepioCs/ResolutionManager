# Resolution Manager V2

A desktop application for managing screen resolutions on Windows. Built with Electron, React, TypeScript, and MobX.

## Features

- View and change screen resolutions
- Create custom resolutions
- Save and apply last used resolution
- Start application on system startup
- Mobile-friendly UI
- Automatic updates

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

## Publishing Updates

The application supports automatic updates using GitHub releases. To publish a new update:

1. Update the version number in `package.json`
2. Build the application using the publish script:

```bash
# Publish for Windows
bun run publish:win
```

This will:

- Build the application
- Generate the necessary update files (including `latest.yml`)
- Create a GitHub release
- Upload the artifacts to the release

**Important:** For auto-updates to work correctly, make sure:

- The GitHub repository is correctly configured in `electron-builder.yml`
- You have a GitHub token with the appropriate permissions set as an environment variable (`GH_TOKEN`)
- The version in `package.json` is incremented for each release

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
- electron-updater (for automatic updates)

## License

MIT
