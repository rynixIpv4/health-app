# Health Tracking App

A comprehensive mobile app for tracking health metrics including steps, heart rate, sleep, and cycling activities. The app also includes a feature to connect to smart health tracking rings via Bluetooth.

## Features

- **Dashboard**: View all your health metrics at a glance
- **Detailed Statistics**: Interactive charts for steps, heart rate, sleep patterns, and cycling
- **Smart Ring Connectivity**: Connect to health tracking rings (simulated)
- **Modern UI**: Clean and intuitive interface with smooth navigation

## Screenshots

- Dashboard with health cards
- Detailed statistics with bar charts
- Activity tracking with time range selection
- Smart ring connection process

## Getting Started

### Prerequisites

- Node.js (v14+)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Xcode
- Android Studio and Android Emulator

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/health-tracking-app.git
cd health-tracking-app
```

2. Install dependencies
```bash
npm install --legacy-peer-deps
```

3. Start the development server
```bash
npm start
```

### Running on Devices

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

## Mobile Development Notes

- The app is designed for iOS and Android platforms
- UI is optimized for both phone and tablet layouts
- Bluetooth functionality is currently simulated
- For real device connectivity, a development build would be required

## Project Structure

- `src/screens/` - Main app screens
- `src/components/` - Reusable UI components
- `assets/` - Images and other static assets

## Customization

- Color schemes can be adjusted in the theme configuration (App.js)
- Statistics data is currently simulated but can be replaced with real API calls
