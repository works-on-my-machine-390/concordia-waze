# Backend

The backend is written in Go, using Gin as the API framework.

## Running instructions

### Prerequisites

- [Go](https://go.dev/dl/)
- [Swag for Go](https://github.com/swaggo/swag)

```
go install github.com/swaggo/swag/cmd/swag@latest
```

- [Air](https://github.com/air-verse/air)

```
go install github.com/air-verse/air@latest
```

### Running the server

- In a terminal, `cd backend`.
- Run `air` for live reload, or simply `go run .` to run without live reload (if you change a file, you need to stop and restart the server for changes to apply).
- Once the server boots up, you can access it at `localhost:8080` by making a GET request to `/index`. Try viewing the swagger page at http://localhost:8080/swagger/index.html

### Updating swagger docs

- Run `swag init` to trigger the swagger doc generation. You'll want to do this whenever you add/remove an endpoint, or change the swagger comments/annotations.

## Testing in Go

### Running tests

To run all tests in the project, use

```bash
go test ./...
```

For a code coverage report (by package), use

```bash
go test ./... -cover
```

#### VSCode Go extension code coverage tooling
If you're using VSCode and have the Go extension, you can run tests with coverage, and view which lines are of code are covered or not.

1. Open the file you want to check coverage for. Make sure the tests are in the same package.
2. Press `ctrl` + `shift` + `p` (by default) to open the command palette.
3. Search and run for "Go: Toggle Test Coverage in Current Package"
4. After the tests finish running (view output tab), the covered code will be highlighted (green means covered, red means uncovered).

### Writing a unit test

In go, unit tests should be placed in the same package (and directory) as the function/code it tests.

You should adjust the package declaration at the top of the integration test file to be `xxx_test`, where `xxx` is the name of the package you're testing in. This is a special convention/suffix to let go know that it's an external test package for the base package.

- It needs to be in a file with a name like `xxx_test.go`
- The test function must start with the word `Test`
- The test function takes one argument only: `t *testing`. You import it from "testing".

### Writing an integration/api test

Similar to unit tests, integration tests should also be placed in the same package as the code it covers. Name the test file `xxx_api_test.go`.

Import the test router from the internal router package.

Along with the instructions for unit tests, you'll want to use `net/http` and `net/http/httptest` to test the APIs.
