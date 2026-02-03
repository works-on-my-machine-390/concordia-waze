import React from "react";
import { render, act } from "@testing-library/react-native";
import { useAuth } from "../hooks/useAuth";

// Helper component to expose hook functions to the test scope
let loginFn: any;
let registerFn: any;
function HookProxy() {
  const { login, register } = useAuth();
  React.useEffect(() => {
    loginFn = login;
    registerFn = register;
  }, [login, register]);
  return null;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      HookProxy: any;
    }
  }
}

describe("useAuth", () => {
  beforeEach(() => {
    // Reset mocks and exported function refs
    loginFn = undefined;
    registerFn = undefined;
    (global as any).fetch = jest.fn();
  });

  test("login success returns token and user", async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc", user: { email: "a@b.com" } }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "pass");
    });

    expect(res).toEqual({ success: true, data: { token: "abc", user: { email: "a@b.com" } } });
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/login"), expect.objectContaining({ method: "POST" }));
  });

  test("login failure returns backend error", async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "wrongpass");
    });

    expect(res).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("register success returns user", async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "1", name: "Test", email: "t@e.com", token: "tok" }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "t@e.com", "pass");
    });

    expect(res).toEqual({ success: true, data: { id: "1", name: "Test", email: "t@e.com", token: "tok" } });
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/signup"), expect.objectContaining({ method: "POST" }));
  });

  test("register failure surfaces backend error", async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "This email is already registered." }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "exists@e.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "This email is already registered." });
  });
});
