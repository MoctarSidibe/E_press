import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';

const LoginScreen = ({ navigation }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation values using React Native Animated
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoTranslateY = useRef(new Animated.Value(-50)).current;
    const formOpacity = useRef(new Animated.Value(0)).current;
    const formTranslateY = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Start animations on mount
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(logoTranslateY, {
                toValue: 0,
                damping: 12,
                useNativeDriver: true,
            }),
        ]).start();

        // Form animations with delay
        Animated.sequence([
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(formOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(formTranslateY, {
                    toValue: 0,
                    damping: 15,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        if (!email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., user@example.com)');
            return;
        }

        setLoading(true);
        // Add a small artificial delay to show the loading state better (UX improvement)
        setTimeout(async () => {
            const result = await login(email.trim(), password.trim());
            setLoading(false);

            if (!result.success) {
                Alert.alert('Login Failed', result.error);
            }
        }, 500);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />

            <View style={styles.content}>
                {/* Logo/Header */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: logoOpacity,
                            transform: [{ translateY: logoTranslateY }],
                        },
                    ]}
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/images/logo.gif')}
                            style={styles.logoImage}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                    </View>
                    <Text style={styles.title}>E-Press</Text>
                    <Text style={styles.subtitle}>Premium Laundry Concierge</Text>
                </Animated.View>

                {/* Form */}
                <Animated.View
                    style={[
                        styles.form,
                        {
                            opacity: formOpacity,
                            transform: [{ translateY: formTranslateY }],
                        },
                    ]}
                >
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.navigate('Register')}
                        disabled={loading}
                    >
                        <Text style={styles.linkText}>
                            Don't have an account? <Text style={styles.linkTextBold}>Join Us</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Demo credentials hint */}
                <Animated.View
                    style={[
                        styles.demoHint,
                        {
                            opacity: formOpacity,
                            transform: [{ translateY: formTranslateY }],
                        },
                    ]}
                >
                    <Text style={styles.demoText}>Demo: admin@epress.com / Admin@123</Text>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    logoContainer: {
        width: 180,
        height: 180,
        marginBottom: theme.spacing.md,
        backgroundColor: 'transparent',  // Transparent to match screen background
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: theme.fonts.sizes.xxxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md + 2,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'transparent',
        ...theme.shadows.sm,
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xl,
        paddingVertical: theme.spacing.lg,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadows.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    linkButton: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    },
    linkText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fonts.sizes.md,
    },
    linkTextBold: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    demoHint: {
        marginTop: theme.spacing.xxl,
        alignItems: 'center',
        opacity: 0.6,
    },
    demoText: {
        color: theme.colors.textTertiary,
        fontSize: theme.fonts.sizes.sm,
    },
});

export default LoginScreen;
