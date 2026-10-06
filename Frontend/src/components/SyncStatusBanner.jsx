import React, { useState, useEffect } from 'react';
import api from '../api/config';
import { syncPendingQueue, getPendingQueue } from '../utils/offlineSync';

export default function SyncStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | pending
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingQueue(api);
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };

    const handleSyncEvent = (e) => {
      if (e.detail?.status) {
        setSyncStatus(e.detail.status);
        if (e.detail.status === 'synced') {
          setTimeout(() => setSyncStatus('idle'), 3000);
        }
      }
      checkPending();
    };

    const checkPending = async () => {
      const q = await getPendingQueue();
      setPendingCount(q.length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('minddesk:sync', handleSyncEvent);

    checkPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('minddesk:sync', handleSyncEvent);
    };
  }, []);

  if (isOnline && syncStatus === 'idle' && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className="d-flex align-items-center justify-content-between px-3 py-1 shadow-sm text-white"
      style={{
        backgroundColor: !isOnline ? '#B91C1C' : syncStatus === 'syncing' ? '#D97706' : '#15803D',
        fontSize: '0.82rem',
        position: 'sticky',
        top: 0,
        zIndex: 1040,
        transition: 'all 0.3s ease'
      }}
    >
      <div className="d-flex align-items-center gap-2">
        {!isOnline ? (
          <>
            <i className="bi bi-wifi-off fs-6"></i>
            <span>
              <strong>Offline Mode</strong> — Working locally. Changes will automatically sync once internet reconnects.
              {pendingCount > 0 && ` (${pendingCount} pending)`}
            </span>
          </>
        ) : syncStatus === 'syncing' ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status"></span>
            <span>
              <strong>Syncing with Server...</strong> Uploading offline changes.
            </span>
          </>
        ) : (
          <>
            <i className="bi bi-cloud-check-fill fs-6"></i>
            <span>
              <strong>All Changes Synced</strong> with MindDesk Cloud!
            </span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && (
        <button
          type="button"
          className="btn btn-sm btn-light py-0 px-2 fw-semibold"
          style={{ fontSize: '0.75rem', borderRadius: '4px' }}
          onClick={() => syncPendingQueue(api)}
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
