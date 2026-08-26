# NGIS - Android Native App Build Guide

We have integrated **Ionic Capacitor** into the project. The fully configured native Android project workspace is ready and located in the directory:
📂 `d:\SIH NEW\frontend\android`

Follow these steps to open, build, and run the Android app on your phone:

---

## 🛠️ Step 1: Open in Android Studio

1. Download and open **Android Studio**.
2. Click **File -> Open...** (or select **Open Project** on the welcome screen).
3. Navigate to and select the directory:
   📂 `d:\SIH NEW\frontend\android`
4. Wait for Android Studio to finish indexing and sync the Gradle files (this may take a few minutes on the first run as it automatically downloads the required SDK build tools).

---

## 📱 Step 2: Run on a Physical Phone or Emulator

### Option A: Physical Android Device (Recommended)
1. On your Android phone, enable **Developer Options**:
   * Go to **Settings -> About Phone** and tap **Build Number** 7 times.
2. Enable **USB Debugging**:
   * Go to **Settings -> System -> Developer Options** and toggle **USB Debugging** to ON.
3. Connect your phone to your computer using a USB cable.
4. In the Android Studio toolbar, select your physical device in the device dropdown list.
5. Click the green **Run (Play)** button (or press `Shift + F10`). The app will install and open on your phone!

### Option B: Android Emulator
1. In Android Studio, open the **Device Manager** (icon in the top-right toolbar).
2. Click **Create Device**, select a phone model (e.g., Pixel 7), and click **Next**.
3. Download a system image (e.g., API 33/34) and click **Finish** to create the virtual device.
4. Select the emulator in the toolbar dropdown and click the green **Run** button.

---

## 📦 Step 3: Build the Standalone APK File

If you want to generate an installable `.apk` file to share with the hackathon judges:

1. In Android Studio, go to the top menu and select:
   👉 **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**
2. Wait for the Gradle build to complete.
3. Once finished, a notification popup will appear in the bottom-right corner saying **APKs generated successfully**.
4. Click the blue **locate** link in the popup.
5. This will open the folder containing your compiled APK file:
   📂 `app-debug.apk`

*You can copy this `app-debug.apk` file directly to your phone's storage and tap it to install!*

---

## 🌐 Connecting the Android App to the Backend Server

When running the app on a physical Android phone, the phone needs to communicate with the FastAPI backend running on your PC. Follow these steps to connect them:

1. **Connect both devices to the same Wi-Fi network** (your computer and phone must be on the same local network).
2. **Find your computer's local IP address**:
   * Open Command Prompt on Windows and run `ipconfig`.
   * Look for the **IPv4 Address** (e.g., `192.168.1.15`).
3. **Update the config file**:
   * Open [`config.js`](file:///d:/SIH%20NEW/frontend/src/config.js) in your text editor.
   * Change `API_BASE_URL` to point to your PC's IP address:
     ```javascript
     export const API_BASE_URL = 'http://192.168.1.15:8000'; // Replace with your IP!
     ```
4. **Start the backend server on all network interfaces**:
   * Run the FastAPI uvicorn daemon using the `--host 0.0.0.0` flag:
     ```bash
     python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
     ```
5. **Sync and rebuild the app**:
   * Recompile and sync the React web project:
     ```bash
     npm run build
     npx cap sync
     ```
   * Open Android Studio and run/rebuild the app on your phone!

---

## 🔄 How to sync changes from the Web Project

If you make modifications to the React code in `frontend/src` and want to update the Android app:

1. Build the frontend web project:
   ```bash
   npm run build
   ```
2. Sync the assets into the Android native folder:
   ```bash
   npx cap sync
   ```
3. Re-run or rebuild the project in Android Studio!
