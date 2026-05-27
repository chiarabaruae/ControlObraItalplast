// Simple hash-based router for Control Obras

const routes = [];
let currentCleanup = null;
const ROUTE_SKELETON_MIN_MS = 300;

export function addRoute(pattern, handler) {
  // Convert /proyectos/:id to regex
  const paramNames = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_match, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  routes.push({
    pattern,
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
    handler
  });
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || "/dashboard";
}

export function startRouter() {
  window.addEventListener("hashchange", () => { void handleRoute(); });
  void handleRoute();
}

async function handleRoute() {
  const path = getCurrentPath();
  const ui = await import("./ui.js");
  ui.showRouteSkeleton(path);
  const loadingStartedAt = Date.now();

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      // Cleanup previous page if needed
      if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
      }

      const cleanup = await Promise.resolve(route.handler(params));
      const elapsed = Date.now() - loadingStartedAt;
      if (elapsed < ROUTE_SKELETON_MIN_MS) {
        await new Promise(resolve => setTimeout(resolve, ROUTE_SKELETON_MIN_MS - elapsed));
      }
      ui.hideRouteSkeleton();
      if (typeof cleanup === "function") {
        currentCleanup = cleanup;
      }
      return;
    }
  }

  // Fallback to dashboard
  navigate("/dashboard");
}
