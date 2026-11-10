// Version of the app, injected by vite.plan.config.ts (package.json). "dev" on the dev server.
declare const __PLAN_VERSION__: string | undefined;

export const VERSION_PLAN: string = typeof __PLAN_VERSION__ === 'string' ? __PLAN_VERSION__ : 'dev';
