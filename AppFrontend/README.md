# Mobile App Development

Follow these steps to set up and run the mobile application.

## Prerequisites

Ensure you have Node.js installed on your system.

## Setup

1. Navigate to the AppFrontend directory:
   ```bash
   cd AppFrontend
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

## Running the Application

1. Start the Expo development server:
   ```bash
   npx expo start
   ```

2. Run on Android:
   Press 'a' in the terminal after starting the server, or run directly:
   ```bash
   npm run android
   ```

## Expo Configuration Notes

- The app uses Expo Router and includes a linking scheme in `app.json`.
- Backend URL is configured via `expo.extra.apiUrl` in `app.json`.
- Auto logout timeout is configured via `expo.extra.sessionTimeoutHours` in `app.json` or `EXPO_PUBLIC_SESSION_TIMEOUT_HOURS`.
- Current Android emulator default is set to `http://10.0.2.2:8000`.

## Backend Connection

Ensure the backend server is running on port `PORT_NUM` before logging in.

- Android emulator (Pixel in Android Studio on Windows): use `http://10.0.2.2:PORT_NUM`
- iOS simulator or local native run on same host: use `http://localhost:PORT_NUM`
- Physical device: use your machine LAN IP, for example `http://192.168.x.x:PORT_NUM`

Update `expo.extra.apiUrl` in `app.json` to match your environment, then restart Expo with cache clear:

```bash
npx expo start -c
```

## Troubleshooting

- If login shows `Network request failed`, verify the backend health endpoint is reachable from the target device/emulator:
  - `http://10.0.2.2:8000/health` (Android emulator)
- If routing warnings appear, confirm routes exist under `app/(auth)` and `app/(app)` and restart Expo.

