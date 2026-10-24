// The app tsconfig has no resolveJsonModule: the data file is typed in data/index.ts.
declare module '*/pudi-donnees.json' {
  const value: unknown;
  export default value;
}
// PUDI-CC-15: word index of the two PUDi documents (typed in utils/rechercheDocuments.ts).
declare module '*/index-documents-pudi.json' {
  const value: unknown;
  export default value;
}
