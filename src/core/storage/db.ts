import { openDB } from 'idb';
export const database = () =>
  openDB('monomath', 1, {
    upgrade(db) {
      db.createObjectStore('data');
    },
  });
let memory: Record<string, unknown> = {};
export async function saveData(key: string, data: unknown) {
  memory[key] = data;
  try {
    const db = await database();
    await db.put('data', data, key);
    return true;
  } catch {
    return false;
  }
}
export async function loadData<T>(key: string): Promise<T | undefined> {
  try {
    const db = await database();
    return (await db.get('data', key)) as T | undefined;
  } catch {
    return memory[key] as T | undefined;
  }
}
export async function clearData() {
  memory = {};
  try {
    const db = await database();
    await db.clear('data');
  } catch {
    /* in-memory storage was cleared */
  }
}
