import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';

const TEAL = '#00D4D4';

// Country codes (Gabon + region)
const COUNTRIES = [
    { flag: '🇬🇦', name: 'Gabon',          dial: '+241' },
    { flag: '🇨🇲', name: 'Cameroun',        dial: '+237' },
    { flag: '🇨🇬', name: 'Congo',           dial: '+242' },
    { flag: '🇨🇩', name: 'RD Congo',        dial: '+243' },
    { flag: '🇸🇳', name: 'Sénégal',         dial: '+221' },
    { flag: '🇨🇮', name: "Côte d'Ivoire",   dial: '+225' },
    { flag: '🇳🇬', name: 'Nigeria',         dial: '+234' },
    { flag: '🇬🇭', name: 'Ghana',           dial: '+233' },
    { flag: '🇫🇷', name: 'France',          dial: '+33'  },
    { flag: '🇲🇦', name: 'Maroc',           dial: '+212' },
    { flag: '🇺🇸', name: 'USA',             dial: '+1'   },
];

// Role-hint config for the Worker app (WorkerWelcomeScreen passes { role } in
// route params). Customer app passes no role — the hint is hidden.
const ROLE_HINTS = {
    driver:  { label: 'Connexion Livreur', icon: 'moped',              color: '#f59e0b' },
    cleaner: { label: 'Connexion Laverie', icon: 'washing-machine',    color: '#00D4D4' },
};

const LoginScreen = ({ navigation, route }) => {
    const { login } = useAuth();
    const roleHint = route?.params?.role ? ROLE_HINTS[route.params.role] : null;
    const [mode, setMode]           = useState('email'); // 'email' | 'phone'
    const [email, setEmail]         = useState('');
    const [phone, setPhone]         = useState('');
    const [country, setCountry]     = useState(COUNTRIES[0]); // Gabon default
    const [showCountries, setShowCountries] = useState(false);
    const [password, setPassword]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [showPass, setShowPass]   = useState(false);

    const logoOpacity    = useRef(new Animated.Value(0)).current;
    const logoTranslateY = useRef(new Animated.Value(-40)).current;
    const formOpacity    = useRef(new Animated.Value(0)).current;
    const formTranslateY = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity,    { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.spring(logoTranslateY, { toValue: 0, damping: 12,   useNativeDriver: true }),
        ]).start();
        Animated.sequence([
            Animated.delay(250),
            Animated.parallel([
                Animated.timing(formOpacity,    { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.spring(formTranslateY, { toValue: 0, damping: 14,   useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    const handleLogin = async () => {
        const identifier = mode === 'email' ? email.trim() : `${country.dial}${phone.trim()}`;
        if (!identifier || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs.'); return;
        }
        if (mode === 'email' && !email.includes('@')) {
            Alert.alert('Erreur', 'Adresse email invalide.'); return;
        }
        if (mode === 'phone' && phone.length < 6) {
            Alert.alert('Erreur', 'Numéro de téléphone invalide.'); return;
        }
        setLoading(true);
        setTimeout(async () => {
            const result = await login(identifier, password.trim());
            setLoading(false);
            if (!result.success) Alert.alert('Connexion échouée', result.error);
        }, 400);
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <StatusBar style="dark" />

            {/* Country picker dropdown */}
            {showCountries && (
                <TouchableOpacity style={styles.countryOverlay} onPress={() => setShowCountries(false)} activeOpacity={1}>
                    <View style={styles.countryDropdown}>
                        {COUNTRIES.map(c => (
                            <TouchableOpacity key={c.dial} style={styles.countryItem}
                                onPress={() => { setCountry(c); setShowCountries(false); }}>
                                <Text style={styles.countryFlag}>{c.flag}</Text>
                                <Text style={styles.countryName}>{c.name}</Text>
                                <Text style={styles.countryDial}>{c.dial}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* ── Header ── */}
                <Animated.View style={[styles.header, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}>
                    <View style={styles.logoContainer}>
                        <Image source={require('../../../assets/images/logo.gif')}
                            style={styles.logoImage} contentFit="contain" cachePolicy="memory-disk" />
                    </View>
                    <View style={styles.titleRow}>
                        <View style={styles.dropBadge}>
                            <MaterialCommunityIcons name="water" size={22} color="#fff" />
                        </View>
                        <Text style={styles.title}>E-Press</Text>
                    </View>
                    <Text style={styles.subtitle}>
                        Premium{' '}
                        <Text style={styles.subtitleHighlight}>Pressing</Text>
                    </Text>

                    {roleHint && (
                        <View style={[styles.roleHint, { backgroundColor: roleHint.color + '18', borderColor: roleHint.color + '60' }]}>
                            <MaterialCommunityIcons name={roleHint.icon} size={16} color={roleHint.color} />
                            <Text style={[styles.roleHintText, { color: roleHint.color }]}>{roleHint.label}</Text>
                        </View>
                    )}
                </Animated.View>

                {/* ── Form ── */}
                <Animated.View style={[styles.form, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}>

                    {/* Mode toggle */}
                    <View style={styles.modeToggle}>
                        <TouchableOpacity style={[styles.modeBtn, mode === 'email' && styles.modeBtnActive]}
                            onPress={() => setMode('email')}>
                            <MaterialCommunityIcons name="email-outline" size={15}
                                color={mode === 'email' ? '#fff' : theme.colors.textSecondary} />
                            <Text style={[styles.modeBtnText, mode === 'email' && styles.modeBtnTextActive]}>Email</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modeBtn, mode === 'phone' && styles.modeBtnActive]}
                            onPress={() => setMode('phone')}>
                            <MaterialCommunityIcons name="phone-outline" size={15}
                                color={mode === 'phone' ? '#fff' : theme.colors.textSecondary} />
                            <Text style={[styles.modeBtnText, mode === 'phone' && styles.modeBtnTextActive]}>Téléphone</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email OR Phone input */}
                    {mode === 'email' ? (
                        <TextInput style={styles.input}
                            placeholder="votre@email.com"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={email} onChangeText={setEmail}
                            keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                    ) : (
                        <View style={styles.phoneRow}>
                            <TouchableOpacity style={styles.dialBtn} onPress={() => setShowCountries(true)}>
                                <Text style={styles.dialFlag}>{country.flag}</Text>
                                <Text style={styles.dialCode}>{country.dial}</Text>
                                <MaterialCommunityIcons name="chevron-down" size={14} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TextInput style={styles.phoneInput}
                                placeholder="77724499"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={phone} onChangeText={setPhone}
                                keyboardType="number-pad" editable={!loading} />
                        </View>
                    )}

                    {/* Password */}
                    <View style={styles.passwordRow}>
                        <TextInput style={styles.passwordInput}
                            placeholder="Mot de passe"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={password} onChangeText={setPassword}
                            secureTextEntry={!showPass} autoCapitalize="none" editable={!loading} />
                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                            <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'}
                                size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Login button */}
                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <View style={styles.btnIconCircle}>
                                    <MaterialCommunityIcons name="water" size={16} color={TEAL} />
                                </View>
                                <Text style={styles.buttonText}>Se connecter</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.navigate(
                            'Register',
                            route?.params?.role ? { role: route.params.role, lockRole: true } : undefined
                        )}
                        disabled={loading}
                    >
                        <Text style={styles.linkText}>
                            Pas de compte ?{' '}
                            <Text style={styles.linkTextBold}>S'inscrire</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content:   { flexGrow: 1, paddingHorizontal: theme.spacing.lg, justifyContent: 'center', paddingVertical: theme.spacing.xl },

    // Header
    header:          { alignItems: 'center', marginBottom: theme.spacing.xxl },
    logoContainer:   { width: 160, height: 160, marginBottom: theme.spacing.md, borderRadius: 999, overflow: 'hidden' },
    logoImage:       { width: '100%', height: '100%' },
    titleRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    dropBadge: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: TEAL,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
    },
    title:           { fontSize: theme.fonts.sizes.xxxl, fontWeight: '900', color: theme.colors.text, letterSpacing: 1 },
    subtitle:        { fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary, letterSpacing: 0.5 },
    subtitleHighlight: { color: TEAL, fontWeight: '800' },
    roleHint: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        marginTop: 10,
    },
    roleHintText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

    // Mode toggle
    modeToggle:        { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 3, marginBottom: theme.spacing.md, ...theme.shadows.sm },
    modeBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: theme.borderRadius.lg, gap: 6 },
    modeBtnActive:     { backgroundColor: TEAL },
    modeBtnText:       { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
    modeBtnTextActive: { color: '#fff' },

    // Inputs
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md + 2,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        borderWidth: 1, borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    phoneRow:    { flexDirection: 'row', marginBottom: theme.spacing.md, gap: 8 },
    dialBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: 12, paddingVertical: theme.spacing.md + 2,
        borderWidth: 1, borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    dialFlag:    { fontSize: 18 },
    dialCode:    { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    phoneInput: {
        flex: 1, backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md + 2,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    passwordRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
    passwordInput: {
        flex: 1, backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md + 2,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    eyeBtn: { position: 'absolute', right: 14 },

    // Button
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xl,
        paddingVertical: theme.spacing.lg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginTop: theme.spacing.md,
        ...theme.shadows.md,
    },
    buttonDisabled: { opacity: 0.7 },
    btnIconCircle: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: theme.fonts.sizes.lg, fontWeight: '800', letterSpacing: 0.4 },

    // Link
    linkButton:    { marginTop: theme.spacing.xl, alignItems: 'center' },
    linkText:      { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.md },
    linkTextBold:  { color: theme.colors.primary, fontWeight: 'bold' },

    // Country picker overlay
    countryOverlay: {
        ...StyleSheet.absoluteFillObject, zIndex: 999,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', paddingHorizontal: 32,
    },
    countryDropdown: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16, overflow: 'hidden',
        ...theme.shadows.lg,
    },
    countryItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        gap: 10,
    },
    countryFlag: { fontSize: 20 },
    countryName: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    countryDial: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '700' },
});

export default LoginScreen;
