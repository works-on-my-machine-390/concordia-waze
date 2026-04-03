# concordia-waze

Concordia Waze is a mobile application developed by the Works on My Machine team to help students, staff, and visitors navigate Concordia University campuses.

## Getting started

To deploy and run the app locally, follow these steps:

### Prerequisites

These are the baseline prerequisites for running the application.
There are additional, optional tools for development in the frontend and backend README's respectively.

- [Go](https://go.dev/dl/)
- [Bun](https://bun.com/get)

### Setup

Install the frontend dependencies:

```bash
bun i
```

### Running the application

There are two options:

1. Terminal (from root directory)

On windows:

```bash
bun run dev
```

On mac:

```bash
bun run mac
```

2. VSCode launch configuration

In VSCode, open the "Run and Debug" tab on the left (default `ctrl` + `shift` + `d`), and run "Local Development".

### Accessing the frontend

Expo supports 4 different methods of displaying the application: iOS emulation (MacOS only), Android emulation, Personal Android/iOS device using the Expo Go app. Instructions on setting up each one are available in the frontend's README.md.

We suggest installing the Expo Go application ([android](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=en)/[iOS](https://apps.apple.com/ca/app/expo-go/id982107779)) on your own device, and scanning the QR code shown in the terminal running the frontend.

### Accessing the backend (Swagger)

The backend is hosted at localhost:8080. You can see the Swagger page at [localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html#/).
