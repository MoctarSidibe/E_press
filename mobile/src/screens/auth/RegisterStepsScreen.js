// Modern 3-step registration flow.
//   Step 1 — Identity: full name + phone (Gabon +241 only) + email (optional)
//   Step 2 — Security: password + confirm
//   Step 3 — Finalize: summary + legal acceptance + create
//
// Accepts the same route params as the legacy RegisterScreen:
//   role     ('customer' | 'driver' | 'cleaner') — preselected role
//   lockRole (boolean)                            — hides the role picker
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
    ScrollView, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';
import { useLegalPDF } from '../../hooks/useLegalPDF';
import { PRIVACY_POLICY, TERMS_OF_USE } from './_shared/legalDocs';

const TEAL = '#00D4D4';
const GABON_DIAL = '+241';
const GABON_FLAG = '🇬🇦';
const GABON_PHONE_LENGTH = 8; // local part after +241, mobile numbers
const TOTAL_STEPS = 3;

// Role icons/colors used by the locked-role badge on step 1.
const ROLE_META = {
    customer: { label: 'register.customer', icon: 'account-circle-outline', color: '#6366f1' },
    driver:   { label: 'register.driver',   icon: 'moped',                  color: '#f59e0b' },
    cleaner:  { label: 'register.cleaner',  icon: 'washing-machine',        color: TEAL },
};

// Cheap-but-good-enough email validation. Skips RFC nitpicks; just checks shape.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Legal Modal (lifted from RegisterScreen for reuse here) ──────────────────
const LegalModal = ({ visible, doc, onClose }) => {
    const insets = useSafeAreaInsets();
    const { downloadLegalPDF, isGenerating } = useLegalPDF();
    if (!doc) return null;
    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={[LM.header, { paddingTop: insets.top + 12 }]}>
                    <View style={LM.headerLeft}>
                        <View style={LM.headerBadge}>
                            <MaterialCommunityIcons name="shield-check" size={18} color={TEAL} />
                        </View>
                        <Text style={LM.headerTitle} numberOfLines={1}>{doc.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity style={LM.downloadBtn} onPress={downloadLegalPDF} disabled={isGenerating}>
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
                <ScrollView contentContainerStyle={[LM.content, { paddingBottom: insets.bottom + 32 }]}>
                    <Text style={LM.metaText}>Dernière mise à jour : {doc.lastUpdated}</Text>
                    <View style={LM.divider} />
                    {doc.sections.map((s, i) => (
                        <View key={i} style={LM.section}>
                            <Text style={LM.sectionHeading}>{s.heading}</Text>
                            <Text style={LM.sectionBody}>{s.body}</Text>
                        </View>
                    ))}
                </ScrollView>
                <View style={[LM.acceptBar, { paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity style={LM.acceptBtn} onPress={onClose}>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                        <Text style={LM.acceptBtnText}>J'ai lu et compris</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ current, total, labels }) => (
    <View style={S.stepIndicator}>
        {Array.from({ length: total }).map((_, i) => {
            const active = i === current;
            const done = i < current;
            return (
                <View key={i} style={S.stepCol}>
                    <View style={[
                        S.stepDot,
                        done && S.stepDotDone,
                        active && S.stepDotActive,
                    ]}>
                        {done
                            ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                            : <Text style={[S.stepDotText, active && { color: '#fff' }]}>{i + 1}</Text>
                        }
                    </View>
                    <Text style={[S.stepLabel, active && S.stepLabelActive]} numberOfLines={1}>
                        {labels[i]}
                    </Text>
                    {i < total - 1 && (
                        <View style={[S.stepConnector, done && S.stepConnectorDone]} />
                    )}
                </View>
            );
        })}
    </View>
);

export default function RegisterStepsScreen({ navigation, route }) {
    const { t } = useTranslation();
    const { register } = useAuth();
    const insets = useSafeAreaInsets();

    const initialRole = route?.params?.role || 'customer';
    const lockRole = !!route?.params?.lockRole;
    const roleMeta = ROLE_META[initialRole] || ROLE_META.customer;

    // ─── Form state ──────────────────────────────────────────────────────────
    const [step, setStep] = useState(0); // 0 | 1 | 2
    const [fullName, setFullName]     = useState('');
    const [phone, setPhone]           = useState('');     // digits only, without +241
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [confirm, setConfirm]       = useState('');
    const [showPass, setShowPass]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [legal, setLegal]           = useState(false);
    const [legalDoc, setLegalDoc]     = useState(null); // 'privacy' | 'terms' | null
    const [loading, setLoading]       = useState(false);

    // No fade animation — keeping render path purely React state-driven so a
    // re-render from typing can never accidentally trigger an opacity reset.

    // ─── Per-step validators ─────────────────────────────────────────────────
    const sanitizedPhone = phone.replace(/\D/g, ''); // digits only
    const phoneValid = sanitizedPhone.length === GABON_PHONE_LENGTH;
    const emailValid = email.length === 0 || EMAIL_RE.test(email.trim());

    const validateStep1 = () => {
        if (!fullName.trim()) return t('auth.register.errors.nameRequired');
        if (!sanitizedPhone)  return t('auth.register.errors.phoneRequired');
        if (!phoneValid)      return t('auth.register.errors.phoneInvalid');
        if (!emailValid)      return t('auth.register.errors.emailInvalid');
        return null;
    };
    const validateStep2 = () => {
        if (password.length < 6)   return t('auth.register.errors.passwordLength');
        if (password !== confirm)  return t('auth.register.errors.passwordMatch');
        return null;
    };
    const validateStep3 = () => {
        if (!legal) return t('auth.register.errors.legalRequired');
        return null;
    };

    const goNext = () => {
        const err = step === 0 ? validateStep1() : step === 1 ? validateStep2() : null;
        if (err) { Alert.alert(t('common.error'), err); return; }
        if (step < TOTAL_STEPS - 1) setStep(step + 1);
    };
    const goBack = () => {
        if (step > 0) setStep(step - 1);
        else if (navigation.canGoBack()) navigation.goBack();
    };

    const handleCreate = async () => {
        const err = validateStep1() || validateStep2() || validateStep3();
        if (err) { Alert.alert(t('common.error'), err); return; }

        setLoading(true);
        const result = await register({
            fullName: fullName.trim(),
            email: email.trim() || `${sanitizedPhone}@phone.epress.local`, // fallback when email omitted
            phone: `${GABON_DIAL}${sanitizedPhone}`,
            password,
            role: initialRole,
        });
        setLoading(false);
        if (!result.success) Alert.alert(t('common.error'), result.error || t('auth.register.errors.failed'));
        // On success, AuthContext flips user → AppNavigator routes by role automatically.
    };

    // ─── Header (shared across steps) ────────────────────────────────────────
    const renderHeader = () => (
        <View style={S.header}>
            <View style={S.navRow}>
                <TouchableOpacity style={S.backBtn} onPress={goBack} disabled={loading}>
                    <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={S.navBrandWrap}>
                    <MaterialCommunityIcons name="water" size={26} color={TEAL} />
                    <Text style={S.navBrand}>E-Press</Text>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <StepIndicator
                current={step}
                total={TOTAL_STEPS}
                labels={[
                    t('auth.register.steps.identity'),
                    t('auth.register.steps.security'),
                    t('auth.register.steps.confirm'),
                ]}
            />
        </View>
    );

    // ─── Step 1 — Identity ───────────────────────────────────────────────────
    const renderStep1 = () => (
        <View style={S.stepPage}>
            <Text style={S.title}>{t('auth.register.steps.identity')}</Text>
            <Text style={S.subtitle}>
                {t('auth.register.steps.stepOf', { current: 1, total: TOTAL_STEPS })}
            </Text>

            {lockRole && (
                <View
                    style={[
                        S.roleBadge,
                        { borderColor: roleMeta.color + '55', backgroundColor: roleMeta.color + '0c' },
                    ]}
                >
                    {/* Top row: icon + title + verified check */}
                    <View style={S.roleBadgeTopRow}>
                        <View style={[S.roleBadgeIcon, { backgroundColor: roleMeta.color }]}>
                            <MaterialCommunityIcons name={roleMeta.icon} size={26} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[S.roleBadgeTitle, { color: roleMeta.color }]}>
                                {t(`auth.register.roleBadge.${initialRole}.title`)}
                            </Text>
                            <Text style={S.roleBadgeTagline} numberOfLines={2}>
                                {t(`auth.register.roleBadge.${initialRole}.tagline`)}
                            </Text>
                        </View>
                        <View style={[S.roleBadgeCheck, { backgroundColor: roleMeta.color }]}>
                            <MaterialCommunityIcons name="check" size={12} color="#fff" />
                        </View>
                    </View>

                    {/* Perks list */}
                    <View style={S.roleBadgePerks}>
                        <View style={S.roleBadgePerkRow}>
                            <MaterialCommunityIcons name="check-circle" size={14} color={roleMeta.color} />
                            <Text style={S.roleBadgePerkText}>
                                {t(`auth.register.roleBadge.${initialRole}.perk1`)}
                            </Text>
                        </View>
                        <View style={S.roleBadgePerkRow}>
                            <MaterialCommunityIcons name="check-circle" size={14} color={roleMeta.color} />
                            <Text style={S.roleBadgePerkText}>
                                {t(`auth.register.roleBadge.${initialRole}.perk2`)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={S.field}>
                <Text style={S.label}>{t('auth.register.fullName')}</Text>
                <TextInput
                    style={S.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder={t('auth.register.fullNamePlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    autoComplete="name"
                    editable={!loading}
                />
            </View>

            <View style={S.field}>
                <Text style={S.label}>{t('auth.register.phone')}</Text>
                <View style={S.phoneRow}>
                    <View style={S.dialBox}>
                        <Text style={S.dialFlag}>{GABON_FLAG}</Text>
                        <Text style={S.dialCode}>{GABON_DIAL}</Text>
                    </View>
                    <TextInput
                        style={[S.input, { flex: 1, marginBottom: 0 }]}
                        value={phone}
                        onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, GABON_PHONE_LENGTH))}
                        placeholder={t('auth.register.phonePlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="number-pad"
                        maxLength={GABON_PHONE_LENGTH}
                        editable={!loading}
                    />
                </View>
                <Text style={S.helper}>{t('auth.register.phoneHelper')}</Text>
            </View>

            <View style={S.field}>
                <Text style={S.label}>{t('auth.register.emailOptional')}</Text>
                <TextInput
                    style={S.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('auth.register.emailPlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                />
            </View>
        </View>
    );

    // ─── Step 2 — Security ───────────────────────────────────────────────────
    const renderStep2 = () => (
        <View style={S.stepPage}>
            <Text style={S.title}>{t('auth.register.steps.security')}</Text>
            <Text style={S.subtitle}>
                {t('auth.register.steps.stepOf', { current: 2, total: TOTAL_STEPS })}
            </Text>

            <View style={S.field}>
                <Text style={S.label}>{t('auth.register.password')}</Text>
                <View style={S.pwRow}>
                    <TextInput
                        style={[S.input, { flex: 1, marginBottom: 0, paddingRight: 44 }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t('auth.register.passwordPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        secureTextEntry={!showPass}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                    <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPass(v => !v)}>
                        <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={S.field}>
                <Text style={S.label}>{t('auth.register.confirmPassword')}</Text>
                <View style={S.pwRow}>
                    <TextInput
                        style={[S.input, { flex: 1, marginBottom: 0, paddingRight: 44 }]}
                        value={confirm}
                        onChangeText={setConfirm}
                        placeholder={t('auth.register.confirmPasswordPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                    <TouchableOpacity style={S.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                        <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                {confirm.length > 0 && password !== confirm && (
                    <Text style={S.helperError}>{t('auth.register.errors.passwordMatch')}</Text>
                )}
            </View>
        </View>
    );

    // ─── Step 3 — Finalize ───────────────────────────────────────────────────
    const renderStep3 = () => (
        <View style={S.stepPage}>
            <Text style={S.title}>{t('auth.register.steps.confirm')}</Text>
            <Text style={S.subtitle}>
                {t('auth.register.steps.stepOf', { current: 3, total: TOTAL_STEPS })}
            </Text>

            {/* Summary card */}
            <View style={S.summaryCard}>
                <Text style={S.summaryTitle}>{t('auth.register.summary.title')}</Text>
                <SummaryRow label={t('auth.register.summary.name')}  value={fullName} />
                <SummaryRow label={t('auth.register.summary.phone')} value={`${GABON_DIAL} ${sanitizedPhone}`} />
                <SummaryRow
                    label={t('auth.register.summary.email')}
                    value={email.trim() || t('auth.register.summary.noEmail')}
                    dim={!email.trim()}
                />
                <SummaryRow
                    label={t('auth.register.summary.role')}
                    value={t(roleMeta.label)}
                    accent={roleMeta.color}
                />
            </View>

            {/* Legal acceptance */}
            <TouchableOpacity style={S.legalRow} onPress={() => setLegal(v => !v)} activeOpacity={0.85} disabled={loading}>
                <View style={[S.checkbox, legal && S.checkboxChecked]}>
                    {legal && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
                <Text style={S.legalText}>
                    {t('auth.register.legal.accept')}
                    <Text style={S.legalLink} onPress={() => setLegalDoc('privacy')}>
                        {t('auth.register.legal.privacy')}
                    </Text>
                    {t('auth.register.legal.and')}
                    <Text style={S.legalLink} onPress={() => setLegalDoc('terms')}>
                        {t('auth.register.legal.terms')}
                    </Text>
                    {t('auth.register.legal.suffix')}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const isLastStep = step === TOTAL_STEPS - 1;

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + 6 }}>
            <StatusBar style="dark" />

            <LegalModal
                visible={!!legalDoc}
                doc={legalDoc === 'privacy' ? PRIVACY_POLICY : legalDoc === 'terms' ? TERMS_OF_USE : null}
                onClose={() => setLegalDoc(null)}
            />

            {/* Header is outside the KAV so the brand row never gets pushed up. */}
            <View style={{ paddingHorizontal: 22 }}>{renderHeader()}</View>

            {/* KeyboardAvoidingView wraps ONLY the scrollable form + CTA so the
                keyboard pushes the inputs up instead of swallowing the header. */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={{ flex: 1, paddingHorizontal: 22 }}
                    contentContainerStyle={S.stepScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {step === 0 && renderStep1()}
                    {step === 1 && renderStep2()}
                    {step === 2 && renderStep3()}
                </ScrollView>

                {/* CTA bar — sticks to bottom across all steps */}
                <View style={[S.ctaBar, { paddingHorizontal: 22, paddingBottom: insets.bottom + 8 }]}>
                    {step > 0 && (
                        <TouchableOpacity style={S.btnGhost} onPress={goBack} disabled={loading} activeOpacity={0.8}>
                            <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
                            <Text style={S.btnGhostText}>{t('auth.register.back')}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[S.btnPrimary, loading && { opacity: 0.6 }]}
                        onPress={isLastStep ? handleCreate : goNext}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={S.btnPrimaryText}>
                                    {isLastStep ? t('auth.register.createAccount') : t('auth.register.next')}
                                </Text>
                                <Ionicons name={isLastStep ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[S.signInLink, { marginBottom: insets.bottom }]} onPress={() => navigation.goBack()} disabled={loading}>
                    <Text style={S.signInText}>
                        {t('auth.register.hasAccount')}{'  '}
                        <Text style={{ color: TEAL, fontWeight: '700' }}>{t('auth.register.signIn')}</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </View>
    );
}

// Small helper row for the summary card.
const SummaryRow = ({ label, value, dim, accent }) => (
    <View style={S.summaryRow}>
        <Text style={S.summaryLabel}>{label}</Text>
        <Text
            style={[
                S.summaryValue,
                dim && { color: theme.colors.textTertiary, fontStyle: 'italic' },
                accent && { color: accent, fontWeight: '800' },
            ]}
            numberOfLines={1}
        >
            {value}
        </Text>
    </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    header: { marginBottom: 10 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    navBrandWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    navBrand: { fontSize: 22, fontWeight: '900', color: theme.colors.text, letterSpacing: 0.5 },

    // Step indicator
    stepIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 6 },
    stepCol: { flex: 1, alignItems: 'center', position: 'relative' },
    stepDot: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: theme.colors.surface,
        borderWidth: 2, borderColor: theme.colors.border,
        justifyContent: 'center', alignItems: 'center',
        zIndex: 2,
    },
    stepDotActive: { backgroundColor: TEAL, borderColor: TEAL },
    stepDotDone:   { backgroundColor: TEAL, borderColor: TEAL },
    stepDotText:   { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
    stepLabel:     { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, fontWeight: '600' },
    stepLabelActive: { color: theme.colors.text, fontWeight: '800' },
    stepConnector: {
        position: 'absolute', top: 14, left: '60%', right: '-40%',
        height: 2, backgroundColor: theme.colors.border, zIndex: 1,
    },
    stepConnectorDone: { backgroundColor: TEAL },

    stepScroll: { paddingTop: 14, paddingBottom: 16 },
    stepPage:   { width: '100%' },

    title:    { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 2 },
    subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 18 },

    // Role welcome badge (lockRole=true). Card with icon, title, tagline, perks.
    roleBadge: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        marginBottom: 18,
    },
    roleBadgeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    roleBadgeIcon: {
        width: 46, height: 46, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    roleBadgeTitle:   { fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
    roleBadgeTagline: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
    roleBadgeCheck: {
        width: 22, height: 22, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
    roleBadgePerks:   { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 4 },
    roleBadgePerkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roleBadgePerkText:{ fontSize: 12, color: theme.colors.textSecondary, flex: 1 },

    // Fields
    field: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginBottom: 6, letterSpacing: 0.3 },
    helper:      { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
    helperError: { fontSize: 11, color: theme.colors.error, marginTop: 4 },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 13,
        fontSize: 15, color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
    },

    // Phone row with fixed Gabon dial code
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dialBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13,
    },
    dialFlag: { fontSize: 16 },
    dialCode: { fontSize: 14, fontWeight: '800', color: theme.colors.text },

    pwRow:  { flexDirection: 'row', alignItems: 'center' },
    eyeBtn: { position: 'absolute', right: 14 },

    // Summary card
    summaryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: 14,
    },
    summaryTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 8, letterSpacing: 0.4 },
    summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
    summaryValue: { fontSize: 14, color: theme.colors.text, fontWeight: '700', flexShrink: 1, marginLeft: 12 },

    // Legal
    legalRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: 8,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: theme.colors.border,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'transparent',
        marginTop: 1, flexShrink: 0,
    },
    checkboxChecked: { backgroundColor: TEAL, borderColor: TEAL },
    legalText:   { flex: 1, fontSize: 12.5, color: theme.colors.textSecondary, lineHeight: 19 },
    legalLink:   { color: TEAL, fontWeight: '700', textDecorationLine: 'underline' },

    // CTA bar
    ctaBar: { flexDirection: 'row', gap: 10, marginTop: 8 },
    btnGhost: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 13, paddingHorizontal: 16,
        borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    btnGhostText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    btnPrimary: {
        flex: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: TEAL, borderRadius: 14, paddingVertical: 14,
        shadowColor: TEAL, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

    signInLink: { alignItems: 'center', marginTop: 10 },
    signInText: { color: theme.colors.textSecondary, fontSize: 13 },
});

// ─── Legal Modal styles ──────────────────────────────────────────────────────
const LM = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    headerBadge: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(0,212,212,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text, flex: 1 },
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
    metaText: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 5 },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 16 },
    section: { marginBottom: 24 },
    sectionHeading: {
        fontSize: 14, fontWeight: '800', color: theme.colors.text,
        marginBottom: 8, paddingLeft: 10,
        borderLeftWidth: 3, borderLeftColor: TEAL,
    },
    sectionBody: { fontSize: 13.5, color: theme.colors.textSecondary, lineHeight: 21 },
    acceptBar: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    acceptBtn: {
        backgroundColor: TEAL, borderRadius: 14, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: TEAL, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
