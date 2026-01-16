# concordia-waze

Concordia Waze is a mobile application developed by the Works on My Machine team to help students, staff, and visitors navigate Concordia University campuses.

## Running instructions

### Prerequisites

These are the baseline prerequisites for running the application.
There are additional tools for development in the frontend and backend README's respectively.

- [Go](https://go.dev/dl/)
- [Bun](https://bun.com/get)
- [Air](https://github.com/air-verse/air), install after Go is installed

```bash
go install github.com/air-verse/air@latest
```

Make sure the install the frontend dependencies (can be done in the root directory)

```bash
bun i
```

### Running the application

There are two options:

1. Terminal (from root directory)

```bash
bun run dev
```

2. VSCode launch configuration

In VSCode, open the "Run and Debug" tab on the left (default `ctrl` + `shift` + `d`), and run "Local Development".

### Accessing the frontend

Expo supports 4 different methods of displaying the application: Web browser, iOS emulation (mac only), Android emulation, Personal Android/iOS device using the Expo Go app. Instructions on setting up each one are available in the frontend's README.md.

To start, try using your browser and access the app at [localhost:8081](http://localhost:8081/). You can use your browser's devtools to simulate a phone screen format.

### Accessing the backend (Swagger)

The backend is hosted at localhost:8080. You can see the Swagger page at [localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html#/).
