// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider, DEMO_SESSION_KEY, useAuth } from "@/lib/auth/auth-context";

let api: ReturnType<typeof useAuth>;
function Probe() {
  api = useAuth();
  return <p data-testid="state">{api.loading ? "loading" : api.user ? `in:${api.user.id}:${api.user.isDemo}` : "out"}</p>;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("authentication (demo mode, no Supabase configured)", () => {
  it("starts signed out, signs in to a local demo session and signs out again", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("out"));
    expect(api.mode).toBe("demo");

    await act(async () => { expect((await api.signInDemo()).ok).toBe(true); });
    expect(screen.getByTestId("state").textContent).toBe("in:demo-user:true");
    expect(JSON.parse(window.localStorage.getItem(DEMO_SESSION_KEY)!)).toMatchObject({ id: "demo-user", isDemo: true });

    await act(async () => { await api.signOut(); });
    expect(screen.getByTestId("state").textContent).toBe("out");
    expect(window.localStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
  });

  it("restores an existing demo session on load", async () => {
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ id: "demo-user", email: "demo@pda-companion.local", isDemo: true }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("in:demo-user:true"));
  });

  it("explains that real accounts are unavailable until Supabase is configured", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("out"));
    const result = await api.signIn("a@example.com", "password123");
    expect(result).toMatchObject({ ok: false });
    expect(result.message).toMatch(/not configured/);
    expect((await api.signUp("a@example.com", "password123", "A")).ok).toBe(false);
  });
});
