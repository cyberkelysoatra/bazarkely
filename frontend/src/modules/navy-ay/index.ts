/**
 * Module NAVY ay — small-parcel delivery network in Nosy Be through relay points
 * (grocery stores). id `navy-ay`, route prefix `/navy`.
 * Phase 0 (v3.80.0): module-access foundation (switcher rules, last module on the
 * account, opening links) + module shell and home page. No business feature yet.
 */
export * from './components';
export * from './context';
export * from './types';
export * from './utils/moduleAccess';
export * from './services/modulePrefsSync';
