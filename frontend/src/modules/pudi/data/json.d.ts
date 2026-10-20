// The app tsconfig has no resolveJsonModule: the data file is typed in data/index.ts.
declare module '*/pudi-donnees.json' {
  const value: unknown;
  export default value;
}
