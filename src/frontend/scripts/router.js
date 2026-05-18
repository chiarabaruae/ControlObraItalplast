// Simple hash-based router for Control Obras

const routes = [];
let currentCleanup = null;

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
  window.addEventListener("hashchange", () => handleRoute());
  handleRoute();
}

function handleRoute() {
  const path = getCurrentPath();

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

      const cleanup = route.handler(params);
      if (typeof cleanup === "function") {
        currentCleanup = cleanup;
      }
      return;
    }
  }

  // Fallback to dashboard
  navigate("/dashboard");
}
