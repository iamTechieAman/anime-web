# 📱 How to Build Your APK

Your project is configured! Now you need to generate the APK file using Android Studio.

## Prerequisites
- **Android Studio** must be installed on your computer.
- **Java (JDK)** must be installed.

## Steps to Build

1.  **Open the Android Project:**
    Run this command in your terminal:
    ```bash
    npx cap open android
    ```
    This will launch Android Studio with your project.

2.  **Wait for Sync:**
    Android Studio will take a minute to sync Gradle files (watch the bottom bar). Wait until it finishes.

3.  **Build the APK:**
    - Go to the top menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
    - Wait for the build to finish.

4.  **Locate the APK:**
    - A notification will appear: "APK(s) generated successfully".
    - Click **"locate"** in that notification.
    - OR find it here: `android/app/build/outputs/apk/debug/app-debug.apk`

5.  **Install on Phone:**
    - Transfer that `.apk` file to your phone and install it!

## Troubleshooting
- **"SDK Location not found"**: Open `android/local.properties` and make sure `sdk.dir` points to your Android SDK installation.
- **Gradle Errors**: Try clicking "File > Sync Project with Gradle Files".
