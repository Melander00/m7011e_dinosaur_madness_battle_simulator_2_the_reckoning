import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router";
import { AuthProvider, useAuth } from "~/keycloak/useAuth";
import IndexRoute from "~/routes/_index";
import "~/global.css";

const router = createBrowserRouter([
  { path: "/", element: <IndexRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, login } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      void login();
    }
  }, [status, login]);

  if (status === "error") {
    return <div>Authentication failed.</div>;
  }

  if (status !== "authenticated") {
    return <div>Authenticating…</div>;
  }

  return children;
}

function AppShell() {
  return (
    <AuthProvider>
      <AuthGuard>
        <RouterProvider router={router} />
      </AuthGuard>
    </AuthProvider>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing <div id="root" /> in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
