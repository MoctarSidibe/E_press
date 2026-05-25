/**
 * syncService.js
 *
 * Manages the offline → online sync pipeline:
 *   1. Detects connectivity changes (NetInfo)
 *   2. Drains the sync queue when online
 *   3. Registers a background task for sync while app is backgrounded
 *   4. Emits events so UI can react (OfflineBanner, order list refresh)
 */

import NetInfo                from '@react-native-community/netinfo';
import * as BackgroundFetch   from 'expo-background-fetch';
import * as TaskManager       from 'expo-task-manager';
import { EventEmitter }       from 'eventemitter3';
import api                    from './api';
import {
    getPendingSyncOrders,
    markOrderSynced,
    markOrderRejected,
    recordSyncAttempt,
    getSyncQueueCount,
} from '../db/localDB';

// ─────────────────────────────────────────────
// Public event bus — subscribe in components
//   syncService.on('statusChange', ({ online, queueCount }) => …)
//   syncService.on('syncComplete',  ({ synced, rejected })   => …)
// ─────────────────────────────────────────────
const emitter = new EventEmitter();

export const syncService = {
    on:  (...a) => emitter.on(...a),
    off: (...a) => emitter.off(...a),
};

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let _online     = true;
let _syncing    = false;
let _unsubscribe = null;

export function isOnline() { return _online; }

// ─────────────────────────────────────────────
// Connectivity listener
// ─────────────────────────────────────────────

export function startConnectivityMonitor() {
    if (_unsubscribe) return; // already running

    _unsubscribe = NetInfo.addEventListener(state => {
        const online = !!(state.isConnected && state.isInternetReachable);
        const changed = online !== _online;
        _online = online;

        emitter.emit('statusChange', { online, queueCount: getSyncQueueCount() });

        // Auto-drain queue when we come back online
        if (changed && online) {
            drainSyncQueue();
        }
    });
}

export function stopConnectivityMonitor() {
    _unsubscribe?.();
    _unsubscribe = null;
}

// ─────────────────────────────────────────────
// Queue drain — uploads all pending offline orders
// ─────────────────────────────────────────────

export async function drainSyncQueue() {
    if (_syncing || !_online) return;
    _syncing = true;

    const pending = getPendingSyncOrders();
    if (pending.length === 0) { _syncing = false; return; }

    // Build batch payload
    const batch = pending.map(o => ({
        client_code:      o.client_code,
        client_nonce:     o.client_nonce,
        sig:              o.sig,
        payload:          o.payload,
        device_id:        o.device_id || null,
        created_at_device: new Date(o.created_at).toISOString(),
    }));

    let synced   = 0;
    let rejected = 0;

    try {
        const response = await api.post('/sync/orders', { orders: batch });
        const results  = response.data.results || [];

        for (const result of results) {
            if (result.status === 'synced') {
                const local = pending.find(o => o.client_code === result.client_code);
                if (local) markOrderSynced(local.id, result.order_id, result.order_number);
                synced++;
            } else if (result.status === 'rejected') {
                const local = pending.find(o => o.client_code === result.client_code);
                if (local) markOrderRejected(local.id, result.reason || 'Rejeté par le serveur');
                rejected++;
            } else {
                // transient error — record failed attempt for backoff
                const local = pending.find(o => o.client_code === result.client_code);
                if (local) recordSyncAttempt(local.id, true);
            }
        }
    } catch {
        // Network error during sync — back off all attempts
        for (const o of pending) recordSyncAttempt(o.id, true);
    }

    _syncing = false;
    emitter.emit('syncComplete', { synced, rejected, queueCount: getSyncQueueCount() });
    emitter.emit('statusChange', { online: _online, queueCount: getSyncQueueCount() });
}

// ─────────────────────────────────────────────
// Background sync task (app backgrounded / phone locked)
// ─────────────────────────────────────────────

const BG_TASK = 'EPRESS_BG_SYNC';

TaskManager.defineTask(BG_TASK, async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected || !net.isInternetReachable)
        return BackgroundFetch.BackgroundFetchResult.NoData;

    const pending = getPendingSyncOrders();
    if (pending.length === 0)
        return BackgroundFetch.BackgroundFetchResult.NoData;

    await drainSyncQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
});

export async function registerBackgroundSync() {
    try {
        await BackgroundFetch.registerTaskAsync(BG_TASK, {
            minimumInterval: 15 * 60,   // minimum 15 min (OS may defer)
            stopOnTerminate: false,
            startOnBoot:     true,
        });
    } catch {
        // Background fetch not supported on all devices — graceful no-op
    }
}

export async function unregisterBackgroundSync() {
    try {
        await BackgroundFetch.unregisterTaskAsync(BG_TASK);
    } catch { /* ignore */ }
}
