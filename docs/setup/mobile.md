# Mobile Setup

## Step 1: Configure environment variables

Create a `.env` file inside the `AppFrontend/` folder:

```env
# ── API ───────────────────────────────────────────────────
EXPO_PUBLIC_API_URL=http://localhost:8000

# ── Google OAuth ──────────────────────────────────────────
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id

# ── Environment ───────────────────────────────────────────
NODE_ENV=development
```

> Replace `EXPO_PUBLIC_API_URL` with your machine's local IP (e.g. `http://192.168.x.x:8000`) if testing on a physical device.

## Step 2: Install and run

```bash
cd AppFrontend
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

> Your mobile device and development machine must be on the **same Wi-Fi network**. Alternatively, use Expo's tunnel mode: `npx expo start --tunnel`
