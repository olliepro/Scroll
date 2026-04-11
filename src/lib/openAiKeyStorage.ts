const SECRET_DB_NAME = "alpha-scroll-secrets";
const SECRET_STORE_NAME = "browser-secrets";
const ENCRYPTION_KEY_RECORD_ID = "openai-api-key-encryption-key";
const CIPHERTEXT_RECORD_ID = "openai-api-key-ciphertext";

type CiphertextRecord = {
  id: string;
  ciphertext: number[];
  iv: number[];
};

type EncryptionKeyRecord = {
  id: string;
  value: CryptoKey;
};

/**
 * Checks whether encrypted browser storage is available for this session.
 *
 * @returns Whether IndexedDB and Web Crypto can be used for encrypted key storage.
 *
 * @example
 * const canPersistSecret = isEncryptedBrowserStorageAvailable();
 */
export function isEncryptedBrowserStorageAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto?.subtle !== "undefined"
  );
}

/**
 * Converts an IndexedDB request into a promise.
 *
 * @param request - IndexedDB request to await.
 * @returns The resolved IndexedDB result value.
 */
function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

/**
 * Waits for an IndexedDB transaction to finish.
 *
 * @param transaction - IndexedDB transaction being observed.
 * @returns Nothing once the transaction completes successfully.
 */
function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

/**
 * Opens the IndexedDB database used for encrypted OpenAI key storage.
 *
 * @returns An open IndexedDB database handle.
 */
function openSecretDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SECRET_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SECRET_STORE_NAME)) {
        database.createObjectStore(SECRET_STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

/**
 * Reads the non-extractable encryption key from IndexedDB.
 *
 * @param database - Open secret database handle.
 * @returns The stored CryptoKey if one exists, otherwise null.
 */
async function readEncryptionKey(
  database: IDBDatabase,
): Promise<CryptoKey | null> {
  const transaction = database.transaction(SECRET_STORE_NAME, "readonly");
  const store = transaction.objectStore(SECRET_STORE_NAME);
  const storedRecord = await waitForRequest<EncryptionKeyRecord | undefined>(
    store.get(ENCRYPTION_KEY_RECORD_ID),
  );
  await waitForTransaction(transaction);
  return storedRecord?.value ?? null;
}

/**
 * Persists a non-extractable encryption key to IndexedDB.
 *
 * @param database - Open secret database handle.
 * @param encryptionKey - AES-GCM key used to protect the API key at rest.
 * @returns Nothing.
 */
async function writeEncryptionKey(
  database: IDBDatabase,
  encryptionKey: CryptoKey,
): Promise<void> {
  const transaction = database.transaction(SECRET_STORE_NAME, "readwrite");
  const store = transaction.objectStore(SECRET_STORE_NAME);
  store.put({ id: ENCRYPTION_KEY_RECORD_ID, value: encryptionKey });
  await waitForTransaction(transaction);
}

/**
 * Loads or creates the non-extractable AES-GCM key used for browser encryption.
 *
 * @param database - Open secret database handle.
 * @returns A reusable non-extractable CryptoKey.
 *
 * @example
 * const encryptionKey = await getOrCreateEncryptionKey(database);
 */
async function getOrCreateEncryptionKey(
  database: IDBDatabase,
): Promise<CryptoKey> {
  const existingKey = await readEncryptionKey(database);
  if (existingKey) return existingKey;

  const encryptionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await writeEncryptionKey(database, encryptionKey);
  return encryptionKey;
}

/**
 * Writes the encrypted OpenAI API key payload to IndexedDB.
 *
 * @param database - Open secret database handle.
 * @param record - Ciphertext and IV for the encrypted API key.
 * @returns Nothing.
 */
async function writeCiphertextRecord(
  database: IDBDatabase,
  record: CiphertextRecord,
): Promise<void> {
  const transaction = database.transaction(SECRET_STORE_NAME, "readwrite");
  const store = transaction.objectStore(SECRET_STORE_NAME);
  store.put(record);
  await waitForTransaction(transaction);
}

/**
 * Reads the encrypted OpenAI API key payload from IndexedDB.
 *
 * @param database - Open secret database handle.
 * @returns The stored ciphertext payload if present, otherwise null.
 */
async function readCiphertextRecord(
  database: IDBDatabase,
): Promise<CiphertextRecord | null> {
  const transaction = database.transaction(SECRET_STORE_NAME, "readonly");
  const store = transaction.objectStore(SECRET_STORE_NAME);
  const record = await waitForRequest<CiphertextRecord | undefined>(
    store.get(CIPHERTEXT_RECORD_ID),
  );
  await waitForTransaction(transaction);
  return record ?? null;
}

/**
 * Encrypts and stores an OpenAI API key in browser-controlled secret storage.
 *
 * @param apiKey - OpenAI API key to persist for later browser sessions.
 * @returns Nothing.
 *
 * @example
 * await saveOpenAiKeyToBrowser(apiKey="sk-example");
 */
export async function saveOpenAiKeyToBrowser(apiKey: string): Promise<void> {
  if (!isEncryptedBrowserStorageAvailable()) {
    throw new Error("Encrypted browser storage is unavailable.");
  }

  const database = await openSecretDatabase();
  try {
    const encryptionKey = await getOrCreateEncryptionKey(database);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      new TextEncoder().encode(apiKey),
    );
    await writeCiphertextRecord(database, {
      id: CIPHERTEXT_RECORD_ID,
      ciphertext: Array.from(new Uint8Array(ciphertext)),
      iv: Array.from(iv),
    });
  } finally {
    database.close();
  }
}

/**
 * Loads and decrypts the stored OpenAI API key from browser secret storage.
 *
 * @returns The decrypted OpenAI API key, or an empty string if none is stored.
 *
 * @example
 * const apiKey = await loadOpenAiKeyFromBrowser();
 */
export async function loadOpenAiKeyFromBrowser(): Promise<string> {
  if (!isEncryptedBrowserStorageAvailable()) return "";

  const database = await openSecretDatabase();
  try {
    const [encryptionKey, storedRecord] = await Promise.all([
      readEncryptionKey(database),
      readCiphertextRecord(database),
    ]);
    if (!encryptionKey || !storedRecord) return "";

    const plaintext = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(storedRecord.iv) },
      encryptionKey,
      new Uint8Array(storedRecord.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } finally {
    database.close();
  }
}

/**
 * Clears the persisted OpenAI API key and its encryption key from the browser.
 *
 * @returns Nothing.
 */
export async function clearOpenAiKeyFromBrowser(): Promise<void> {
  if (!isEncryptedBrowserStorageAvailable()) return;

  const database = await openSecretDatabase();
  try {
    const transaction = database.transaction(SECRET_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SECRET_STORE_NAME);
    store.delete(CIPHERTEXT_RECORD_ID);
    store.delete(ENCRYPTION_KEY_RECORD_ID);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}
