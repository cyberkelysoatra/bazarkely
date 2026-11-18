// Version of the app, injected by vite.releve.config.ts (package.json). "dev" on the dev server.
declare const __RELEVE_VERSION__: string | undefined

export const VERSION_RELEVE: string = typeof __RELEVE_VERSION__ === 'string' ? __RELEVE_VERSION__ : 'dev'
