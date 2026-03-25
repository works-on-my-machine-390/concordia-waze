# Frontend

The frontend is written in React Native + Typescript, running with Expo.

## Running instructions

### Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [Bun](https://bun.com/get). It helps speed up the package installation times (as opposed to npm).

Choose where/how you want to preview the mobile application:

> note, iOS emulation is only available on iOS devices (macs).

- **Web browser**: just open the localhost link you'll get later in your favorite browser.
- **Android emulator**: [Android Studio](https://developer.android.com/studio) for Android device emulation. Follow [these steps](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=expo-go) to configure android studio to run with Expo Go.
- **iOS emulator**: [XCode](https://apps.apple.com/us/app/xcode/id497799835?mt=12) for iOS device simulation. Follow [these steps](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated&mode=expo-go) to run with Expo Go.
- **Personal Android device**: Install the Expo Go application from the [Google Play store](https://play.google.com/store/apps/details?id=host.exp.exponent&referrer=docs).
- **Personal iOS device** Install the Expo Go app from the [App store](https://apps.apple.com/us/app/expo-go/id982107779)

### Running the program

- In a terminal, `cd frontend`, and run `bun install`.
- Run `bun run start`.
- You'll then see the something similar to the following in your terminal:
  <img width="702" height="886" alt="image" src="https://github.com/user-attachments/assets/98dc2ae1-44a3-4241-8460-675b43d9510c" />

Depending on your method of previewing the application, follow the corresponding instructions.

- If you're using your browser, open the localhost URL.
- If you're running an emulator, make sure the emulator is open, then press `a` or `i` for Android or iOS respectively.
- If you're using your own phone with the Expo Go app, open the app and scan the QR code. Make sure you're on the same network as the computer running the application.

### Routing the backend

By default, the frontend makes calls to the backend hosted on one of our teammate's server (@catalexandre).

This can be rerouted by specifying an `EXPO_PUBLIC_API_OVERRIDE_TYPE` environment variable in "devConfig.json".

| Value | Description                                                                   |
| ----- | ----------------------------------------------------------------------------- |
| none  | (default) Defaults to whatever is specified in api.ts (ngrok)                 |
| ngrok | Same as current default, uses the backend deployed to @catalexandre's server. |
| prod  | Links to the "production" deployment.                                         |
| local | Links to a locally running backend instance.                                  |
