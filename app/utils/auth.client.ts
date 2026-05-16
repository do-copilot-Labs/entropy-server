import { createAuthClient } from "better-auth/vue";

// Do not call useRuntimeConfig() at the module level because it requires the Nuxt Context.
// We can omit baseURL here if the client is making requests to the same origin,
// or we can rely on a plugin to inject the client. For Better Auth client in Nuxt,
// typically the default relative path works if the API is hosted on the same server.
export const authClient = createAuthClient({
  // baseURL is optional if your API and frontend are on the same domain
});