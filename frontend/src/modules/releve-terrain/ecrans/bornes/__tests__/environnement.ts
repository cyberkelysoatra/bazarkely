// Test environment of screens 6 and 7: real Dexie on fake-indexeddb (the global setup mocks Dexie and
// randomUUID for the host app), a game of the PRD imported into a new relevé, the screen rendered in a
// memory router with a probe of useReleve. Import this file first, after `vi.unmock('dexie')`.
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'
import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()
// jsdom has no scrollIntoView (used by ChampNombre when its keypad opens).
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
// Under load (several suites, three parallel sessions on this computer) the first render and the
// IndexedDB round trips take more than the default second of findBy/waitFor.
import { configure } from '@testing-library/react'
configure({ asyncUtilTimeout: 10000 })
import { vi } from 'vitest'
vi.setConfig({ testTimeout: 40000 })
