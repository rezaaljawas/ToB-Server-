import * as React from "react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-primary">Power Monitoring</div>
            <div className="flex gap-6">
              <Link
                to="/"
                className="text-gray-600 hover:text-primary transition-colors"
                activeProps={{
                  className: "text-primary font-semibold",
                }}
                activeOptions={{ exact: true }}
              >
                Dashboard
              </Link>
              <Link
                to="/logs"
                className="text-gray-600 hover:text-primary transition-colors"
                activeProps={{
                  className: "text-primary font-semibold",
                }}
              >
                Logs
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools position="bottom-left" />
    </div>
  );
}
