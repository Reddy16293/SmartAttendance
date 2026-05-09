import type { CapacitorConfig } from "@capacitor/cli";

const webClientId =
  "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";

const config: CapacitorConfig = {
  appId: "com.collegeconnect.mobile",
  appName: "College Connect",
  webDir: "dist",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: webClientId,
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
