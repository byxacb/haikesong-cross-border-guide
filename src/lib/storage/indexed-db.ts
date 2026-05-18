'use client';

import type { ApplicationCase } from '@/types/domain';

const DB_NAME = 'amazon-registration-workbench';
const DB_VERSION = 1;
const CASE_STORE = 'cases';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CASE_STORE)) {
        db.createObjectStore(CASE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCaseToIndexedDb(caseData: ApplicationCase) {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readwrite');
    tx.objectStore(CASE_STORE).put(caseData);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadCaseFromIndexedDb(id: string) {
  if (typeof window === 'undefined') return null;
  const db = await openDatabase();
  const result = await new Promise<ApplicationCase | null>((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readonly');
    const request = tx.objectStore(CASE_STORE).get(id);
    request.onsuccess = () => resolve((request.result as ApplicationCase | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function listCasesFromIndexedDb() {
  if (typeof window === 'undefined') return [];
  const db = await openDatabase();
  const result = await new Promise<ApplicationCase[]>((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readonly');
    const request = tx.objectStore(CASE_STORE).getAll();
    request.onsuccess = () => resolve((request.result as ApplicationCase[]) ?? []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}
