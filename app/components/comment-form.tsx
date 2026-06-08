"use client";

import { FormEvent, useEffect, useState } from "react";

type AuthUser = {
  name: string | null;
  slug: string | null;
};

type AuthState = {
  authenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
};

const initialAuthState: AuthState = {
  authenticated: false,
  loading: true,
  user: null,
};

export function CommentForm({
  createAccountUrl,
  postId,
  slug,
}: {
  createAccountUrl: string | null;
  postId: number;
  slug: string;
}) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    void refreshAuthState();
  }, []);

  async function refreshAuthState() {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json().catch(() => null)) as {
      authenticated?: boolean;
      user?: AuthUser | null;
    } | null;

    setAuthState({
      authenticated: Boolean(body?.authenticated),
      loading: false,
      user: body?.user ?? null,
    });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({
        password: formData.get("password"),
        username: formData.get("username"),
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    setLoginPending(false);

    if (!response.ok) {
      setLoginMessage(body?.message || "WordPress login failed.");
      return;
    }

    setLoginMessage("You are logged in.");
    await refreshAuthState();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      credentials: "same-origin",
      method: "POST",
    });
    setLoginMessage("You are logged out.");
    await refreshAuthState();
  }

  return (
    <div className="space-y-6">
      <AuthPanel
        authState={authState}
        loginMessage={loginMessage}
        loginPending={loginPending}
        createAccountUrl={createAccountUrl}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {authState.authenticated ? (
        <form action="/api/comments" method="post" className="space-y-5">
          <h2 className="text-2xl font-normal text-[#222222]">Leave a Reply</h2>
          <input name="postId" type="hidden" value={postId} />
          <input name="slug" type="hidden" value={slug} />

          <p>
            <label
              htmlFor="comment-content"
              className="mb-2 block text-xs text-[#222222]"
            >
              Comment
            </label>
            <textarea
              className="w-full border border-zinc-100 bg-[#f7f8f9] px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
              id="comment-content"
              name="content"
              required
              rows={8}
            />
          </p>

          <button
            className="bg-[#55555e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222222]"
            type="submit"
          >
            Post Comment
          </button>
        </form>
      ) : null}
    </div>
  );
}

function AuthPanel({
  authState,
  createAccountUrl,
  loginMessage,
  loginPending,
  onLogin,
  onLogout,
}: {
  authState: AuthState;
  createAccountUrl: string | null;
  loginMessage: string | null;
  loginPending: boolean;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
}) {
  if (authState.loading) {
    return <p className="text-sm text-[#555555]">Checking WordPress login...</p>;
  }

  if (authState.authenticated) {
    return (
      <div className="border border-zinc-200 bg-[#f7f8f9] p-4 text-sm text-[#555555]">
        <p>
          Logged in as{" "}
          <span className="font-semibold text-[#222222]">
            {authState.user?.name ?? "WordPress user"}
          </span>
          .
        </p>
        <button
          className="mt-3 text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222]"
          onClick={onLogout}
          type="button"
        >
          Log out
        </button>
        {loginMessage ? <p className="mt-3">{loginMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 bg-[#f7f8f9] p-4 text-sm text-[#555555]">
      <h3 className="text-base font-normal text-[#222222]">
        Log in to leave a comment
      </h3>
      <p className="mt-2">
        Leaving a comment requires a WordPress login. Sign in below, or create a
        login first if you do not have one yet.
      </p>
      {createAccountUrl ? (
        <a
          className="mt-3 inline-flex text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222]"
          href={createAccountUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Create a WordPress login
        </a>
      ) : null}
      <form className="mt-4 space-y-3" onSubmit={onLogin}>
        <p>
          <label
            className="mb-1 block text-xs text-[#222222]"
            htmlFor="wp-login-username"
          >
            Username or Email
          </label>
          <input
            className="w-full max-w-[260px] border border-zinc-100 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
            id="wp-login-username"
            name="username"
            required
            type="text"
          />
        </p>
        <p>
          <label
            className="mb-1 block text-xs text-[#222222]"
            htmlFor="wp-login-password"
          >
            Password
          </label>
          <input
            className="w-full max-w-[260px] border border-zinc-100 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e73be]"
            id="wp-login-password"
            name="password"
            required
            type="password"
          />
        </p>
        <button
          className="bg-[#55555e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loginPending}
          type="submit"
        >
          {loginPending ? "Logging in..." : "Log In"}
        </button>
      </form>
      {loginMessage ? <p className="mt-3">{loginMessage}</p> : null}
    </div>
  );
}
