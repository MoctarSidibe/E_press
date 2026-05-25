import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
    Modal, FlatList, Animated, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';
import { useLegalPDF } from '../../hooks/useLegalPDF';
import { PRIVACY_POLICY, TERMS_OF_USE } from './_shared/legalDocs';

const TEAL = '#00D4D4';

const COUNTRIES = [
    { flag: '🇬🇦', name: 'Gabon',            dial: '+241', placeholder: '77724499' },
    { flag: '🇨🇲', name: 'Cameroun',          dial: '+237', placeholder: '677123456' },
    { flag: '🇨🇬', name: 'Congo',             dial: '+242', placeholder: '061234567' },
    { flag: '🇨🇩', name: 'RD Congo',          dial: '+243', placeholder: '812345678' },
    { flag: '🇸🇳', name: 'Sénégal',           dial: '+221', placeholder: '771234567' },
    { flag: '🇨🇮', name: "Côte d'Ivoire",     dial: '+225', placeholder: '071234567' },
    { flag: '🇳🇬', name: 'Nigeria',           dial: '+234', placeholder: '8012345678' },
    { flag: '🇬🇭', name: 'Ghana',             dial: '+233', placeholder: '241234567' },
    { flag: '🇧🇫', name: 'Burkina Faso',      dial: '+226', placeholder: '70123456' },
    { flag: '🇲🇱', name: 'Mali',              dial: '+223', placeholder: '66123456' },
    { flag: '🇬🇳', name: 'Guinée',            dial: '+224', placeholder: '622123456' },
    { flag: '🇲🇦', name: 'Maroc',             dial: '+212', placeholder: '612345678' },
    { flag: '🇫🇷', name: 'France',            dial: '+33',  placeholder: '612345678' },
    { flag: '🇺🇸', name: 'USA',               dial: '+1',   placeholder: '2025551234' },
];

const ROLES = [
    { key: 'customer', label: 'Client',  subtitle: "Déposez vos vêtements, on s'en occupe", icon: 'account-circle-outline', color: '#6366f1' },
    { key: 'driver',   label: 'Livreur', subtitle: 'Collectez et livrez les commandes',      icon: 'moped',                  color: '#f59e0b' },
    { key: 'cleaner',  label: 'Laverie', subtitle: 'Gérez votre espace de nettoyage',        icon: 'washing-machine',        color: TEAL     },
];

// Legal documents (PRIVACY_POLICY, TERMS_OF_USE) live in ./_shared/legalDocs
// and are imported above. Single source of truth across all Register flows.

// ─── Legal Modal ──────────────────────────────────────────────────────────────
const LegalModal = ({ visible, doc, onClose }) => {
    const insets = useSafeAreaInsets();
    const { downloadLegalPDF, isGenerating } = useLegalPDF();
    if (!doc) return null;
    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                {/* Header */}
                <View style={[LM.header, { paddingTop: insets.top + 12 }]}>
                    <View style={LM.headerLeft}>
                        <View style={LM.headerBadge}>
                            <MaterialCommunityIcons name="shield-check" size={18} color={TEAL} />
                        </View>
                        <Text style={LM.headerTitle} numberOfLines={1}>{doc.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            style={LM.downloadBtn}
                            onPress={downloadLegalPDF}
                            disabled={isGenerating}
                        >
                            {isGenerating
                                ? <ActivityIndicator size="small" color={TEAL} />
                                : <MaterialCommunityIcons name="download" size={18} color={TEAL} />
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={LM.closeBtn} onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[LM.content, { paddingBottom: insets.bottom + 32 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Meta */}
                    <View style={LM.metaRow}>
                        <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={LM.metaText}>Dernière mise à jour : {doc.lastUpdated}</Text>
                    </View>
                    <View style={LM.metaRow}>
                        <MaterialCommunityIcons name="flag-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={LM.metaText}>Applicable en République Gabonaise</Text>
                    </View>

                    <View style={LM.divider} />

                    {doc.sections.map((s, i) => (
                        <View key={i} style={LM.section}>
                            <Text style={LM.sectionHeading}>{s.heading}</Text>
                            <Text style={LM.sectionBody}>{s.body}</Text>
                        </View>
                    ))}

                    {/* Footer */}
                    <View style={LM.footer}>
                        <MaterialCommunityIcons name="scale-balance" size={16} color={TEAL} />
                        <Text style={LM.footerText}>
                            Conforme à la Loi n° 001/2011 du 25 septembre 2011 relative à la protection des données à caractère personnel — République Gabonaise
                        </Text>
                    </View>
                </ScrollView>

                {/* Accept button */}
                <View style={[LM.acceptBar, { paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity style={LM.acceptBtn} onPress={onClose} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                        <Text style={LM.acceptBtnText}>J'ai lu et compris</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── Register Screen ──────────────────────────────────────────────────────────
// Accepts optional route params:
//   role:      pre-selected role ('customer' | 'driver' | 'cleaner').
//   lockRole:  if true, the role picker is hidden and the role cannot be changed.
// The two together let role-specific entry points (CustomerRegister,
// DriverRegister, CleanerRegister) share this screen without showing the picker.
export default function RegisterScreen({ navigation, route }) {
    const { register } = useAuth();
    const insets = useSafeAreaInsets();

    const initialRole = route?.params?.role || 'customer';
    const lockRole = !!route?.params?.lockRole;

    const [formData, setFormData]             = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: initialRole });
    const [phoneNumber, setPhoneNumber]       = useState('');
    const [country, setCountry]               = useState(COUNTRIES[0]);
    const [showCountryModal, setShowCountryModal] = useState(false);
    const [showPass, setShowPass]             = useState(false);
    const [showConfirm, setShowConfirm]       = useState(false);
    const [loading, setLoading]               = useState(false);

    // Legal
    const [legalAccepted, setLegalAccepted]   = useState(false);
    const [legalDoc, setLegalDoc]             = useState(null); // 'privacy' | 'terms'
    const shakeAnim                           = useRef(new Animated.Value(0)).current;

    const update = (k, v) => setFormData(f => ({ ...f, [k]: v }));

    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.25, duration: 1800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const shakeCheckbox = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleRegister = async () => {
        const fullPhone = `${country.dial}${phoneNumber.trim()}`;
        if (!formData.fullName || !formData.email || !phoneNumber || !formData.password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs.'); return;
        }
        if (phoneNumber.length < 6) { Alert.alert('Erreur', 'Numéro invalide.'); return; }
        if (formData.password.length < 6) { Alert.alert('Erreur', 'Mot de passe trop court.'); return; }
        if (formData.password !== formData.confirmPassword) { Alert.alert('Erreur', 'Mots de passe différents.'); return; }
        if (!legalAccepted) {
            shakeCheckbox();
            Alert.alert('Acceptation requise', 'Veuillez accepter la politique de confidentialité et les conditions d\'utilisation pour continuer.');
            return;
        }
        setLoading(true);
        const result = await register({ ...formData, phone: fullPhone });
        setLoading(false);
        if (!result.success) Alert.alert('Inscription échouée', result.error);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar style="dark" />

            {/* ── Legal Modal ── */}
            <LegalModal
                visible={!!legalDoc}
                doc={legalDoc === 'privacy' ? PRIVACY_POLICY : legalDoc === 'terms' ? TERMS_OF_USE : null}
                onClose={() => setLegalDoc(null)}
            />

            {/* ── Country Modal ── */}
            <Modal visible={showCountryModal} transparent animationType="slide" onRequestClose={() => setShowCountryModal(false)}>
                <TouchableOpacity style={S.overlay} onPress={() => setShowCountryModal(false)} activeOpacity={1}>
                    <View style={S.sheet}>
                        <View style={S.sheetHandle} />
                        <Text style={S.sheetTitle}>Sélectionner un pays</Text>
                        <FlatList
                            data={COUNTRIES} keyExtractor={c => c.dial}
                            renderItem={({ item: c }) => (
                                <TouchableOpacity
                                    style={[S.countryRow, c.dial === country.dial && S.countryRowActive]}
                                    onPress={() => { setCountry(c); setShowCountryModal(false); }}>
                                    <Text style={S.cFlag}>{c.flag}</Text>
                                    <Text style={S.cName}>{c.name}</Text>
                                    <Text style={S.cDial}>{c.dial}</Text>
                                    {c.dial === country.dial && <MaterialCommunityIcons name="check-circle" size={16} color={TEAL} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Screen ── */}
            <View style={[S.screen, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 8 }]}>

                {/* ── Header ── */}
                <View style={S.header}>
                    <View style={S.navRow}>
                        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <View style={S.navBrandWrap}>
                            <Animated.View style={{ opacity: pulseAnim }}>
                                <MaterialCommunityIcons name="water" size={28} color={TEAL} />
                            </Animated.View>
                            <Text style={S.navBrand}>E-Press</Text>
                        </View>
                        <View style={{ width: 42 }} />
                    </View>
                    <Text style={S.title}>Créer un compte</Text>
                    <Text style={S.subtitle}>
                        Rejoignez{' '}
                        <Text style={{ color: TEAL, fontWeight: '800' }}>E-Press</Text>
                        {' '}dès aujourd'hui
                    </Text>
                </View>

                {/* ── Inputs ── */}
                <View style={S.inputs}>
                    <TextInput style={S.input} placeholder="Nom complet"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.fullName} onChangeText={v => update('fullName', v)} editable={!loading} />

                    <TextInput style={S.input} placeholder="votre@email.com"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.email} onChangeText={v => update('email', v)}
                        keyboardType="email-address" autoCapitalize="none" editable={!loading} />

                    <View style={S.phoneRow}>
                        <TouchableOpacity style={S.dialBtn} onPress={() => setShowCountryModal(true)} disabled={loading}>
                            <Text style={{ fontSize: 16 }}>{country.flag}</Text>
                            <Text style={S.dialCode}>{country.dial}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput style={[S.input, { flex: 1, marginBottom: 0 }]}
                            placeholder={country.placeholder}
                            placeholderTextColor={theme.colors.textTertiary}
                            value={phoneNumber} onChangeText={setPhoneNumber}
                            keyboardType="number-pad" editable={!loading} />
                    </View>

                    <View style={S.pwRow}>
                        <TextInput style={[S.input, { flex: 1, marginBottom: 0, paddingRight: 44 }]}
                            placeholder="Mot de passe (min. 6 car.)"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={formData.password} onChangeText={v => update('password', v)}
                            secureTextEntry={!showPass} autoCapitalize="none" editable={!loading} />
                        <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPass(v => !v)}>
                            <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={S.pwRow}>
                        <TextInput style={[S.input, { flex: 1, marginBottom: 0, paddingRight: 44 }]}
                            placeholder="Confirmer le mot de passe"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={formData.confirmPassword} onChangeText={v => update('confirmPassword', v)}
                            secureTextEntry={!showConfirm} autoCapitalize="none" editable={!loading} />
                        <TouchableOpacity style={S.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                            <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Role Selector ── (hidden when lockRole, e.g. opened from a role-specific entry point) */}
                {lockRole ? (
                    (() => {
                        const r = ROLES.find(x => x.key === formData.role) || ROLES[0];
                        return (
                            <View style={[S.roleCard, { borderColor: r.color, backgroundColor: r.color + '0f', marginBottom: 12 }]}>
                                <View style={[S.roleIconBubble, { backgroundColor: r.color }]}>
                                    <MaterialCommunityIcons name={r.icon} size={24} color="#fff" />
                                </View>
                                <View style={S.roleTextWrap}>
                                    <Text style={[S.roleCardLabel, { color: r.color }]}>Inscription : {r.label}</Text>
                                    <Text style={S.roleCardSub}>{r.subtitle}</Text>
                                </View>
                                <MaterialCommunityIcons name="lock-outline" size={16} color={r.color} />
                            </View>
                        );
                    })()
                ) : (
                    <>
                        <Text style={S.roleLabel}>Je suis</Text>
                        <View style={S.roleRow}>
                            {ROLES.map(r => {
                                const active = formData.role === r.key;
                                return (
                                    <TouchableOpacity
                                        key={r.key}
                                        style={[S.roleCard, active && { borderColor: r.color, backgroundColor: r.color + '0f' }]}
                                        onPress={() => update('role', r.key)} disabled={loading} activeOpacity={0.8}>
                                        <View style={[S.roleIconBubble, { backgroundColor: active ? r.color : r.color + '22' }]}>
                                            <MaterialCommunityIcons name={r.icon} size={24} color={active ? '#fff' : r.color} />
                                        </View>
                                        <View style={S.roleTextWrap}>
                                            <Text style={[S.roleCardLabel, active && { color: r.color }]}>{r.label}</Text>
                                            <Text style={S.roleCardSub}>{r.subtitle}</Text>
                                        </View>
                                        <View style={[S.roleCheck, active && { backgroundColor: r.color, borderColor: r.color }]}>
                                            {active && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* ── Legal Checkbox ── */}
                <Animated.View style={[S.legalRow, { transform: [{ translateX: shakeAnim }] }]}>
                    <TouchableOpacity
                        style={[S.checkbox, legalAccepted && S.checkboxChecked]}
                        onPress={() => setLegalAccepted(v => !v)}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        {legalAccepted && (
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                        )}
                    </TouchableOpacity>
                    <View style={S.legalTextWrap}>
                        <Text style={S.legalText}>
                            J'ai lu et j'accepte la{' '}
                            <Text
                                style={S.legalLink}
                                onPress={() => setLegalDoc('privacy')}
                            >
                                Politique de confidentialité
                            </Text>
                            {' '}et les{' '}
                            <Text
                                style={S.legalLink}
                                onPress={() => setLegalDoc('terms')}
                            >
                                Conditions d'utilisation
                            </Text>
                            {' '}d'E-Press
                        </Text>
                    </View>
                </Animated.View>

                {/* ── CTA ── */}
                <View style={S.cta}>
                    <TouchableOpacity
                        style={[S.btn, (!legalAccepted || loading) && { opacity: 0.55 }]}
                        onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <View style={S.btnIconCircle}>
                                    <MaterialCommunityIcons name="water" size={16} color={TEAL} />
                                </View>
                                <Text style={S.btnText}>Créer mon compte</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={S.linkBtn} onPress={() => navigation.goBack()} disabled={loading}>
                        <Text style={S.linkText}>
                            Déjà inscrit ?{'  '}
                            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Se connecter</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: 24 },

    header: { marginBottom: 10 },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    navBrandWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    navBrand: {
        fontSize: 24, fontWeight: '900', color: theme.colors.text, letterSpacing: 0.5,
    },
    title:    { fontSize: 24, fontWeight: '900', color: theme.colors.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: theme.colors.textSecondary },

    inputs: { gap: 8, marginBottom: 10 },

    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: 0,
    },

    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dialBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: theme.colors.surface,
        borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    dialCode: { fontSize: 13, fontWeight: '700', color: theme.colors.text },

    pwRow:  { flexDirection: 'row', alignItems: 'center' },
    eyeBtn: { position: 'absolute', right: 14 },

    roleLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
    roleRow:   { gap: 7, marginBottom: 12 },
    roleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: 14, borderWidth: 2, borderColor: theme.colors.border,
    },
    roleIconBubble: {
        width: 42, height: 42, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
    roleTextWrap:  { flex: 1 },
    roleCardLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 1 },
    roleCardSub:   { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 15 },
    roleCheck: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: theme.colors.border,
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Legal checkbox row ──
    legalRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 10,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: theme.colors.border,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'transparent',
        marginTop: 1,
        flexShrink: 0,
    },
    checkboxChecked: {
        backgroundColor: TEAL,
        borderColor: TEAL,
    },
    legalTextWrap: { flex: 1 },
    legalText: {
        fontSize: 12.5,
        color: theme.colors.textSecondary,
        lineHeight: 19,
    },
    legalLink: {
        color: TEAL,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },

    cta:    { marginTop: 'auto' },

    btn: {
        backgroundColor: TEAL,
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: TEAL, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    },
    btnIconCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

    linkBtn:  { marginTop: 12, alignItems: 'center' },
    linkText: { color: theme.colors.textSecondary, fontSize: 14 },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 12, maxHeight: '70%',
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 10 },
    sheetTitle:  { fontSize: 15, fontWeight: '700', color: theme.colors.text, paddingHorizontal: 20, marginBottom: 6 },
    countryRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    countryRowActive: { backgroundColor: 'rgba(0,212,212,0.06)' },
    cFlag: { fontSize: 20 },
    cName: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    cDial: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '700' },
});

// ─── Legal Modal Styles ───────────────────────────────────────────────────────
const LM = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
    },
    headerBadge: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(0,212,212,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16, fontWeight: '800', color: theme.colors.text, flex: 1,
    },
    closeBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: theme.colors.border,
        justifyContent: 'center', alignItems: 'center',
    },
    downloadBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(0,212,212,0.12)',
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.25)',
        justifyContent: 'center', alignItems: 'center',
    },

    content: { paddingHorizontal: 20, paddingTop: 20 },

    metaRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5,
    },
    metaText: {
        fontSize: 12, color: theme.colors.textSecondary,
    },

    divider: {
        height: 1, backgroundColor: theme.colors.border, marginVertical: 16,
    },

    section: { marginBottom: 24 },
    sectionHeading: {
        fontSize: 14, fontWeight: '800', color: theme.colors.text,
        marginBottom: 8,
        paddingLeft: 10,
        borderLeftWidth: 3,
        borderLeftColor: TEAL,
    },
    sectionBody: {
        fontSize: 13.5, color: theme.colors.textSecondary,
        lineHeight: 21,
    },

    footer: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: 'rgba(0,212,212,0.08)',
        borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.2)',
        marginTop: 8,
    },
    footerText: {
        flex: 1, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16,
    },

    acceptBar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    acceptBtn: {
        backgroundColor: TEAL,
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    acceptBtnText: {
        color: '#fff', fontSize: 15, fontWeight: '800',
    },
});
