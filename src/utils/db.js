import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('http-requests-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveRequest = async (data) => {
  const db = await initDB();
  await db.add('requests', data);
};

export const getAllRequests = async () => {
  const db = await initDB();
  return db.getAll('requests');
};

// Nueva función para actualizar una petición con la respuesta
export const updateRequestResponse = async (id, response) => {
  const db = await initDB();
  const req = await db.get('requests', id);
  if (req) {
    req.response = response;
    await db.put('requests', req);
  }
};

export const deleteRequest = async (id) => {
  const db = await initDB();
  await db.delete('requests', id);
};

export const clearRequests = async () => {
  const db = await initDB();
  await db.clear('requests');
};