// Worker app entry screen. Lets a driver or cleaner pick their role before
// landing on the matching login / register flow. Only mounted in the Worker
// app binary (APP_VARIANT=worker).
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme/theme';

const TEAL = '#00D4D4';

const ROLES = [
    {
        key: 'driver',
        title: 'Livreur',
        subtitle: 'Collecter et livrer les commandes E-Press',
        icon: 'moped',
        color: '#f59e0b',
        bullets: ['Acceptez les courses', 'Suivi GPS intégré', 'Paiement à la livraison'],
    },
    {
        key: 'cleaner',
        title: 'Laverie',
        subtitle: 'Gérer votre laverie partenaire E-Press',
        icon: 'washing-machine',
        color: TEAL,
        bullets: ['Recevez les commandes', 'Gestion de votre laverie', 'Suivi des paiements'],
    },
];

export default function WorkerWelcomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slide, { toValue: 0, damping: 14, useNativeDriver: true }),
        ]).start();
    }, []);

    const goToLogin = (role) => navigation.navigate('Login', { role });
    const goToRegister = (role) => navigation.navigate('Register', { role, lockRole: true });

    return (
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <StatusBar barStyle="dark-content" />

            {/* Brand */}
            <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                    <MaterialCommunityIcons name="water" size={24} color="#fff" />
                </View>
                <Text style={styles.brand}>E-Press <Text style={styles.brandPro}>Pro</Text></Text>
            </View>

            <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateY: slide }] }]}>
                <Text style={styles.title}>Bienvenue</Text>
                <Text style={styles.subtitle}>Quel est votre rôle sur E-Press Pro ?</Text>

                {ROLES.map((r) => (
                    <View key={r.key} style={[styles.card, { borderColor: r.color + '40' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: r.color + '18' }]}>
                                <MaterialCommunityIcons name={r.icon} size={32} color={r.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{r.title}</Text>
                                <Text style={styles.cardSubtitle}>{r.subtitle}</Text>
                            </View>
                        </View>

                        <View style={styles.bulletsRow}>
                            {r.bullets.map((b, i) => (
                                <View key={i} style={styles.bullet}>
                                    <MaterialCommunityIcons name="check-circle" size={14} color={r.color} />
                                    <Text style={styles.bulletText}>{b}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.btnPrimary, { backgroundColor: r.color }]}
                                onPress={() => goToRegister(r.key)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnPrimaryText}>S'inscrire</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnSecondary, { borderColor: r.color }]}
                                onPress={() => goToLogin(r.key)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.btnSecondaryText, { color: r.color }]}>Se connecter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </Animated.View>

            <Text style={styles.footer}>
                Vous êtes client ? Téléchargez l'app <Text style={styles.footerHighlight}>E-Press</Text>.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20 },
    brandRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28,
    },
    brandBadge: {
        width: 38, height: 38, borderRadius: 12, backgroundColor: TEAL,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: TEAL, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    brand: { fontSize: 26, fontWeight: '900', color: theme.colors.text, letterSpacing: 0.5 },
    brandPro: { color: TEAL },
    body: { flex: 1 },
    title: { fontSize: 28, fontWeight: '900', color: theme.colors.text, marginBottom: 6 },
    subtitle: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 24 },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 18,
        marginBottom: 16,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    cardIcon: {
        width: 58, height: 58, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { fontSize: 19, fontWeight: '800', color: theme.colors.text, marginBottom: 2 },
    cardSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
    bulletsRow: { gap: 6, marginBottom: 16 },
    bullet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bulletText: { fontSize: 13, color: theme.colors.textSecondary },
    actions: { flexDirection: 'row', gap: 10 },
    btnPrimary: {
        flex: 1, paddingVertical: 12, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
    btnSecondary: {
        flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    btnSecondaryText: { fontSize: 14, fontWeight: '700' },
    footer: {
        textAlign: 'center', fontSize: 12, color: theme.colors.textTertiary,
        marginTop: 8,
    },
    footerHighlight: { color: TEAL, fontWeight: '700' },
});
