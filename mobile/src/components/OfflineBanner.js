/**
 * OfflineBanner.js
 *
 * Sticky banner shown at the top of the screen when the device
 * has no internet connection, or when there are pending offline
 * orders waiting to sync.
 *
 * States:
 *   • offline   — red bar "Hors ligne · X commandes en attente"
 *   • syncing   — amber bar "Synchronisation en cours…"
 *   • synced    — green bar (auto-hides after 3 s)
 *   • (hidden)  — online, nothing pending
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { syncService, drainSyncQueue, isOnline } from '../services/syncService';
import { getSyncQueueCount } from '../db/localDB';

const COLORS = {
    offline: { bg: '#DC2626', icon: 'wifi-off',            text: '#fff' },
    syncing: { bg: '#D97706', icon: 'sync',                text: '#fff' },
    synced:  { bg: '#059669', icon: 'check-circle-outline', text: '#fff' },
};

export default function OfflineBanner() {
    const insets = useSafeAreaInsets();
    const slideY = useRef(new Animated.Value(-60)).current;
    const [state, setState] = useState(null); // null | 'offline' | 'syncing' | 'synced'
    const [queue, setQueue]  = useState(0);
    const hideTimer = useRef(null);

    const show = (nextState, queueCount = 0) => {
        clearTimeout(hideTimer.current);
        setState(nextState);
        setQueue(queueCount);
        Animated.spring(slideY, {
            toValue: 0, useNativeDriver: true,
            tension: 80, friction: 12,
        }).start();
        if (nextState === 'synced') {
            hideTimer.current = setTimeout(hide, 3000);
        }
    };

    const hide = () => {
        Animated.timing(slideY, {
            toValue: -60, duration: 300, useNativeDriver: true,
        }).start(() => setState(null));
    };

    useEffect(() => {
        // Initial state
        const q = getSyncQueueCount();
        if (!isOnline() || q > 0) show('offline', q);

        const onStatus = ({ online, queueCount }) => {
            if (!online)          show('offline', queueCount);
            else if (queueCount > 0) show('syncing', queueCount);
            else                  hide();
        };

        const onSyncComplete = ({ synced, rejected, queueCount }) => {
            if (queueCount === 0) show('synced');
            else if (!isOnline()) show('offline', queueCount);
            else                  show('syncing', queueCount);
        };

        syncService.on('statusChange',  onStatus);
        syncService.on('syncComplete',  onSyncComplete);
        return () => {
            syncService.off('statusChange',  onStatus);
            syncService.off('syncComplete',  onSyncComplete);
            clearTimeout(hideTimer.current);
        };
    }, []);

    if (!state) return null;

    const cfg  = COLORS[state];
    const label =
        state === 'offline'
            ? `Hors ligne${queue > 0 ? ` · ${queue} commande${queue > 1 ? 's' : ''} en attente` : ''}`
            : state === 'syncing'
            ? `Synchronisation… (${queue} en attente)`
            : 'Commandes synchronisées ✓';

    return (
        <Animated.View style={[
            styles.banner,
            { backgroundColor: cfg.bg, paddingTop: insets.top + 6 },
            { transform: [{ translateY: slideY }] },
        ]}>
            <MaterialCommunityIcons name={cfg.icon} size={16} color={cfg.text} />
            <Text style={[styles.label, { color: cfg.text }]}>{label}</Text>

            {/* Manual retry button when offline */}
            {state === 'offline' && queue > 0 && isOnline() && (
                <TouchableOpacity style={styles.retryBtn} onPress={drainSyncQueue}>
                    <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position:       'absolute',
        top:            0, left: 0, right: 0,
        zIndex:         9999,
        flexDirection:  'row',
        alignItems:     'center',
        paddingHorizontal: 14,
        paddingBottom:  8,
        gap:            8,
        elevation:      10,
        shadowColor:    '#000',
        shadowOffset:   { width: 0, height: 2 },
        shadowOpacity:  0.25,
        shadowRadius:   4,
    },
    label: {
        flex:       1,
        fontSize:   13,
        fontWeight: '600',
    },
    retryBtn: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 10,
        paddingVertical:   3,
        borderRadius:      12,
    },
    retryText: {
        color:      '#fff',
        fontSize:   12,
        fontWeight: '700',
    },
});
