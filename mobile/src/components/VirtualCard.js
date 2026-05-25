import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

const CARD_BG  = '#07101f';
const TEAL     = '#00D4D4';
const TEAL_10  = 'rgba(0,212,212,0.10)';
const TEAL_20  = 'rgba(0,212,212,0.20)';
const GOLD     = '#FFD700';

// ─── Rising bubble config ─────────────────────────────────────────────────────
// Reduced from 8 → 4 bubbles with slower cycles. VirtualCard sits on the home
// screen and used to leak 8 infinite animations per render — fixed below.
const BUBBLE_CFG = [
    { size: 16, left: '14%', dur: 13000, delay: 0,    o: 0.24 },
    { size:  9, left: '38%', dur: 15000, delay: 2400, o: 0.20 },
    { size: 20, left: '62%', dur: 12000, delay: 4800, o: 0.20 },
    { size:  8, left: '84%', dur: 14000, delay: 1500, o: 0.22 },
];

const RisingBubble = memo(({ size, left, dur, delay, o }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        // Track mount + active animation handle so the recursive chain stops on
        // unmount. Without this every nav away from Home left zombie animations
        // running on the UI thread until the JS engine was killed.
        let mounted = true;
        let currentAnim = null;

        const run = () => {
            if (!mounted) return;
            anim.setValue(0);
            currentAnim = Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true });
            currentAnim.start(({ finished }) => { if (finished && mounted) run(); });
        };
        const t = setTimeout(run, delay);
        return () => {
            mounted = false;
            clearTimeout(t);
            if (currentAnim) currentAnim.stop();
        };
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -300] });
    const opacity    = anim.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, o, o, 0] });
    return (
        <Animated.View style={{
            position: 'absolute', bottom: -size, left,
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 1.5, borderColor: TEAL,
            backgroundColor: 'transparent', opacity,
            transform: [{ translateY }],
        }} />
    );
});

const HeroBubbles = memo(() => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BUBBLE_CFG.map((b, i) => <RisingBubble key={i} {...b} />)}
    </View>
));

// ─── VirtualCard ─────────────────────────────────────────────────────────────
const VirtualCard = ({ user, onPress }) => {
    const points      = user?.pointsBalance    || 0;
    const totalEarned = user?.pointsEarnedTotal || 0;
    const name        = user?.fullName          || 'E-Press Member';
    const cardNumber  = user?.cardNumber        || 'EP-XXXX-XXXX-XXXX';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.88 : 1}>
            <View style={S.card}>
                <HeroBubbles />

                {/* Glow blobs */}
                <View style={S.glowTop} />
                <View style={S.glowBottom} />
                <View style={S.topAccent} />

                {/* ── Header row: icon + text + NFC icon ── */}
                <View style={S.headerRow}>
                    <View style={S.iconWrap}>
                        <Image
                            source={require('../../assets/icon.svg')}
                            style={S.dropIcon}
                            contentFit="contain"
                        />
                    </View>
                    <View style={S.textBlock}>
                        <View style={S.pill}>
                            <View style={S.pillDot} />
                            <Text style={S.pillText}>PROGRAMME FIDÉLITÉ</Text>
                        </View>
                        <Text style={S.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                            {name}
                        </Text>
                        <Text style={S.cardSub}>
                            Carte E-Press ·{' '}
                            <Text style={{ color: TEAL, fontWeight: '700' }}>Premium</Text>
                        </Text>
                    </View>

                    {/* NFC + QR icons */}
                    <View style={S.nfcWrap}>
                        <MaterialCommunityIcons name="nfc" size={26} color={TEAL} style={{ opacity: 0.75 }} />
                        <MaterialCommunityIcons name="qrcode" size={16} color="rgba(255,255,255,0.35)" style={{ marginTop: 4 }} />
                    </View>
                </View>

                {/* ── Card number row ── */}
                <View style={S.cardNumRow}>
                    <MaterialCommunityIcons name="credit-card-outline" size={13} color="rgba(255,255,255,0.35)" />
                    <Text style={S.cardNum}>{cardNumber}</Text>
                </View>

                {/* ── Stats strip ── */}
                <View style={S.statsStrip}>
                    {[
                        { icon: 'star-circle', color: GOLD, value: `${points.toLocaleString()} pts`, label: 'Solde points' },
                        { icon: 'trending-up', color: TEAL, value: `${totalEarned.toLocaleString()} pts`, label: 'Total gagné' },
                    ].map((s, i) => (
                        <View key={s.label} style={[S.statItem, i < 1 && S.statBorder]}>
                            <MaterialCommunityIcons name={s.icon} size={18} color={s.color} />
                            <Text style={S.statValue}>{s.value}</Text>
                            <Text style={S.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Tap hint ── */}
                {onPress && (
                    <View style={S.tapHint}>
                        <MaterialCommunityIcons name="gesture-tap" size={11} color="rgba(255,255,255,0.3)" />
                        <Text style={S.tapHintText}>Voir l'historique des points</Text>
                    </View>
                )}

                {/* ── Redeem badge ── */}
                {points >= 100 && (
                    <View style={S.redeemBadge}>
                        <MaterialCommunityIcons name="gift-outline" size={12} color={GOLD} />
                        <Text style={S.redeemText}>Points échangeables</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const S = StyleSheet.create({
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 22,
        padding: 20,
        paddingBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,212,212,0.18)',
        ...theme.shadows.xl,
    },

    glowTop:    { position: 'absolute', width: 210, height: 80, borderRadius: 6, backgroundColor: 'rgba(0,212,212,0.11)', top: -28, right: -55, transform: [{ rotate: '-32deg' }] },
    glowBottom: { position: 'absolute', width: 160, height: 55, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.09)', bottom: -18, left: -45, transform: [{ rotate: '-32deg' }] },
    topAccent:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: TEAL, opacity: 0.7 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    iconWrap: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: TEAL_10,
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.25)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12, flexShrink: 0,
    },
    dropIcon: { width: 30, height: 30 },

    textBlock: { flex: 1 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: TEAL_10,
        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start', marginBottom: 6,
        borderWidth: 1, borderColor: TEAL_20,
    },
    pillDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: TEAL },
    pillText: { fontSize: 9, color: TEAL, fontWeight: '700', letterSpacing: 0.9 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 3 },
    cardSub:   { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

    nfcWrap: {
        marginLeft: 10, flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 2,
        gap: 0,
    },

    cardNumRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 14,
        paddingHorizontal: 2,
    },
    cardNum: {
        fontSize: 13, fontWeight: '700',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: 2.5,
    },

    statsStrip: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 10,
    },
    statItem:   { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
    statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' },
    statValue:  { fontSize: 12, fontWeight: '800', color: '#fff' },
    statLabel:  { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

    tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
    tapHintText: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },

    redeemBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,215,0,0.10)',
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)',
        alignSelf: 'flex-start', marginTop: 8,
    },
    redeemText: { fontSize: 11, color: GOLD, fontWeight: '700' },
});

export default VirtualCard;
