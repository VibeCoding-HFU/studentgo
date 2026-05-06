import { useAuth } from '@/contexts/auth-context';
import { getOfflineValue, setOfflineValue } from '@/lib/offline-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type SyncKind = 'contact' | 'lesson' | 'todo';

export type SyncQueueItem = {
  authUserId: number | null;
  body: string;
  createdAt: string;
  headers: [string, string][];
  id: string;
  kind: SyncKind;
  localData: unknown;
  method: 'POST';
  url: string;
};

type SyncContextValue = {
  enqueueCreate: (item: Omit<SyncQueueItem, 'authUserId' | 'createdAt' | 'id' | 'method'>) => Promise<SyncQueueItem>;
  pendingCount: number;
  pendingItems: SyncQueueItem[];
  syncVersion: number;
  syncing: boolean;
};

const queueKey = 'sync:queue';
const retryIntervalMs = 15000;
const SyncContext = createContext<SyncContextValue | null>(null);

async function loadQueue() {
  const stored = await getOfflineValue(queueKey);

  if (!stored) {
    return [];
  }

  try {
    const items = JSON.parse(stored) as Array<Partial<SyncQueueItem>>;
    return items
      .filter((item): item is SyncQueueItem => (
        typeof item.body === 'string'
        && Array.isArray(item.headers)
        && typeof item.id === 'string'
        && typeof item.kind === 'string'
        && typeof item.url === 'string'
      ))
      .map((item) => ({
        ...item,
        authUserId: typeof item.authUserId === 'number' ? item.authUserId : null,
        headers: withoutPersistedAuth(item.headers),
      }));
  } catch {
    return [];
  }
}

async function saveQueue(items: SyncQueueItem[]) {
  await setOfflineValue(queueKey, JSON.stringify(items));
}

function withoutPersistedAuth(headers: [string, string][]) {
  return headers.filter(([name]) => name.toLowerCase() !== 'authorization');
}

export function SyncProvider({ children }: PropsWithChildren) {
  const { token, user } = useAuth();
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    loadQueue().then((items) => {
      if (mounted) {
        setPendingItems(items);
        setHydrated(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const enqueueCreate = useCallback(async (input: Omit<SyncQueueItem, 'authUserId' | 'createdAt' | 'id' | 'method'>) => {
    const item: SyncQueueItem = {
      ...input,
      authUserId: user?.id ?? null,
      createdAt: new Date().toISOString(),
      headers: withoutPersistedAuth(input.headers),
      id: `${input.kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: 'POST',
    };

    setPendingItems((current) => {
      const next = [...current, item];
      saveQueue(next).catch(() => undefined);
      return next;
    });

    return item;
  }, [user?.id]);

  const flushQueue = useCallback(async () => {
    if (!hydrated || syncingRef.current || pendingItems.length === 0 || !token) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      let remaining = pendingItems;
      let syncedAny = false;

      for (const item of pendingItems) {
        if (item.authUserId !== (user?.id ?? null)) {
          continue;
        }

        try {
          const response = await fetch(item.url, {
            body: item.body,
            headers: {
              ...Object.fromEntries(item.headers),
              Authorization: `Bearer ${token}`,
              'X-StudentGo-Sync-Replay': '1',
            },
            method: item.method,
          });

          if (!response.ok) {
            break;
          }

          syncedAny = true;
          remaining = remaining.filter((candidate) => candidate.id !== item.id);
          setPendingItems(remaining);
          await saveQueue(remaining);
        } catch {
          break;
        }
      }

      if (syncedAny) {
        setSyncVersion((current) => current + 1);
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [hydrated, pendingItems, token, user?.id]);

  useEffect(() => {
    flushQueue();
  }, [flushQueue]);

  useEffect(() => {
    const interval = setInterval(flushQueue, retryIntervalMs);
    return () => clearInterval(interval);
  }, [flushQueue]);

  const value = useMemo<SyncContextValue>(() => ({
    enqueueCreate,
    pendingCount: pendingItems.length,
    pendingItems,
    syncVersion,
    syncing,
  }), [enqueueCreate, pendingItems, syncVersion, syncing]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error('useSync must be used inside SyncProvider');
  }

  return context;
}
