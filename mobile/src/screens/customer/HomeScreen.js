import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI } from '../../services/api';
import { getClothingIcon } from '../../config/icons';
import theme from '../../theme/theme';

const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [groupedCategories, setGroupedCategories] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [usingCache, setUsingCache] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    // Smart selection feature
    const [selectedItems, setSelectedItems] = useState([]);
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        loadCategories();
    }, []);

    // Reset selection when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            setSelectedItems([]);
        }, [])
    );

    // Animate floating card
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: selectedItems.length > 0 ? 0 : 300,
            useNativeDriver: true,
            damping: 20,
        }).start();
    }, [selectedItems.length]);

    const loadCategories = async () => {
        try {
            setError(null);
            const response = await categoriesAPI.getAll();
            setCategories(response.data);
            setUsingCache(response.fromCache || false);

            // Group categories professionally
            const groups = {
                'Everyday Wear': [],
                'Outerwear & Formal': [],
                'Professional & Uniforms': [],
                'Household Linens': [],
                'Children & Baby': []
            };

            response.data.forEach(cat => {
                const name = cat.name.toLowerCase();

                // Everyday Wear (shirts, pants, dresses, etc.)
                if (['shirt', 't-shirt', 'polo', 'pants', 'trouser', 'dress', 'skirt',
                    'shorts', 'underwear', 'panties', 'sportswear', 'sport'].some(item => name.includes(item))) {
                    groups['Everyday Wear'].push(cat);
                }
                // Outerwear & Formal (jackets, suits, sweaters)
                else if (['jacket', 'coat', 'manteau', 'leather', 'sweater', 'pull',
                    'sweatshirt', 'suit', 'costume', 'vest', 'gilet'].some(item => name.includes(item))) {
                    groups['Outerwear & Formal'].push(cat);
                }
                // Professional & Uniforms (work clothing)
                else if (['uniform', 'officer', 'officier', 'coverall', 'combinaison',
                    'tie', 'cravate'].some(item => name.includes(item))) {
                    groups['Professional & Uniforms'].push(cat);
                }
                // Household Linens (bedding, towels, curtains)
                else if (['sheet', 'drap', 'towel', 'serviette', 'curtain', 'rideau',
                    'blanket', 'pillow', 'oreiller', 'duvet', 'tablecloth', 'napkin'].some(item => name.includes(item))) {
                    groups['Household Linens'].push(cat);
                }
                // Children & Baby
                else if (['baby', 'bébé', 'child', 'enfant'].some(item => name.includes(item))) {
                    groups['Children & Baby'].push(cat);
                }
                // Fallback to Everyday Wear for uncategorized items
                else {
                    groups['Everyday Wear'].push(cat);
                }
            });
            setGroupedCategories(groups);
        } catch (err) {
            console.error('Error loading categories:', err);

            // Set user-friendly error message
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                setError('Unable to connect to server. Please check your network connection.');
            } else if (err.code === 'ECONNABORTED') {
                setError('Request timeout. Please try again.');
            } else {
                setError('Failed to load categories. Please try again.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCategories();
    };

    // Selection functions
    const toggleItemSelection = (categoryId) => {
        const exists = selectedItems.find(item => item.categoryId === categoryId);
        if (exists) {
            // Remove item
            setSelectedItems(prev => prev.filter(i => i.categoryId !== categoryId));
        } else {
            // Add item with quantity 1
            setSelectedItems(prev => [...prev, { categoryId, quantity: 1 }]);
        }
    };

    const updateQuantity = (categoryId, newQuantity) => {
        if (newQuantity <= 0) {
            toggleItemSelection(categoryId);
        } else {
            setSelectedItems(prev =>
                prev.map(item =>
                    item.categoryId === categoryId
                        ? { ...item, quantity: newQuantity }
                        : item
                )
            );
        }
    };

    const calculateEstimatedTotal = () => {
        let total = 0;
        selectedItems.forEach(item => {
            const category = categories.find(c => c.id === item.categoryId);
            if (category) {
                total += parseFloat(category.base_price) * item.quantity;
            }
        });
        return total;
    };

    const proceedToOrder = () => {
        navigation.navigate('NewOrder', {
            preSelectedItems: selectedItems
        });
        // Optionally clear selections
        // setSelectedItems([]);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.fullName || 'User'}</Text>
                    <Text style={styles.subtitle}>What would you like to clean today?</Text>
                </View>
                <Image
                    source={require('../../../assets/images/logo customer.gif')}
                    style={styles.logo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </View>

            {/* Error/Status Banner */}
            {error && (
                <View style={styles.errorBanner}>
                    <MaterialCommunityIcons name="wifi-off" size={20} color="#fff" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={loadCategories} style={styles.retryButton}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {usingCache && !error && (
                <View style={styles.cacheBanner}>
                    <MaterialCommunityIcons name="cloud-off-outline" size={20} color="#666" />
                    <Text style={styles.cacheText}>Showing saved data (offline)</Text>
                </View>
            )}

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('NewOrder')}
                    >
                        <View style={styles.buttonBg} />
                        <View style={styles.buttonContentContainer}>
                            <View style={styles.buttonIcon}>
                                <Image
                                    source={require('../../../assets/images/add.gif')}
                                    style={styles.addGifIcon}
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
                                />
                            </View>
                            <View style={styles.buttonContent}>
                                <Text style={styles.primaryButtonTitle}>New Order</Text>
                                <Text style={styles.primaryButtonSubtitle}>
                                    Schedule a pickup
                                </Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Services */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Services</Text>

                    <View>
                        {['Everyday Wear', 'Outerwear & Formal', 'Professional & Uniforms', 'Household Linens', 'Children & Baby'].map(groupTitle => (
                            groupedCategories[groupTitle]?.length > 0 && (
                                <View key={groupTitle} style={{ marginBottom: theme.spacing.lg }}>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        color: theme.colors.text,
                                        marginBottom: theme.spacing.sm,
                                        marginLeft: theme.spacing.xs
                                    }}>
                                        {groupTitle}
                                    </Text>
                                    <View style={styles.grid}>
                                        {groupedCategories[groupTitle].map((category) => {
                                            const isSelected = selectedItems.some(item => item.categoryId === category.id);

                                            return (
                                                <TouchableOpacity
                                                    key={category.id}
                                                    style={styles.categoryCard}
                                                    onPress={() => toggleItemSelection(category.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[
                                                        styles.categoryCardInner,
                                                        isSelected && styles.categoryCardSelected
                                                    ]}>
                                                        <View style={styles.categoryIconContainer}>
                                                            {(() => {
                                                                const normalizedName = category.name.toLowerCase();
                                                                let gifSource = null;

                                                                if (normalizedName.includes('shirt') && !normalizedName.includes('t-shirt') && !normalizedName.includes('sweat')) {
                                                                    gifSource = require('../../../assets/images/shirt.gif');
                                                                } else if (normalizedName.includes('t-shirt')) {
                                                                    gifSource = require('../../../assets/images/t-shirt.gif');
                                                                } else if (normalizedName.includes('polo')) {
                                                                    gifSource = require('../../../assets/images/polo.gif');
                                                                } else if (normalizedName.includes('pants') || normalizedName.includes('trouser') || normalizedName.includes('pantalon') || normalizedName.includes('jean')) {
                                                                    gifSource = require('../../../assets/images/pants.gif');
                                                                } else if (normalizedName.includes('dress')) {
                                                                    gifSource = require('../../../assets/images/dress (1).gif');
                                                                } else if (normalizedName.includes('baby') || normalizedName.includes('bébé')) {
                                                                    gifSource = require('../../../assets/images/baby-clothes.gif');
                                                                } else if (normalizedName.includes('bed') || normalizedName.includes('drap')) { // Bedsheet
                                                                    gifSource = require('../../../assets/images/bed.gif');
                                                                } else if (normalizedName.includes('combinaison') || normalizedName.includes('coverall')) {
                                                                    gifSource = require('../../../assets/images/coverall (1).gif');
                                                                } else if (normalizedName.includes('curtain') || normalizedName.includes('rideau')) {
                                                                    gifSource = require('../../../assets/images/curtain.gif');
                                                                } else if (normalizedName.includes('sweatshirt')) {
                                                                    gifSource = require('../../../assets/images/hooded-sweatshirt.gif');
                                                                } else if (normalizedName.includes('leather') || normalizedName.includes('cuir')) {
                                                                    gifSource = require('../../../assets/images/leather-jacket.gif');
                                                                } else if (normalizedName.includes('coat') || normalizedName.includes('manteau') || normalizedName.includes('jacket')) {
                                                                    gifSource = require('../../../assets/images/jacket.gif');
                                                                } else if (normalizedName.includes('panties') || normalizedName.includes('culotte')) {
                                                                    gifSource = require('../../../assets/images/panties.gif');
                                                                } else if (normalizedName.includes('pillow') || normalizedName.includes('oreiller')) {
                                                                    gifSource = require('../../../assets/images/pillow.gif');
                                                                } else if (normalizedName.includes('shoe') || normalizedName.includes('chaussure')) {
                                                                    gifSource = require('../../../assets/images/shoes (1).gif');
                                                                } else if (normalizedName.includes('short')) {
                                                                    gifSource = require('../../../assets/images/short.gif');
                                                                } else if (normalizedName.includes('skirt') || normalizedName.includes('jupe')) {
                                                                    gifSource = require('../../../assets/images/skirt.gif');
                                                                } else if (normalizedName.includes('sock') || normalizedName.includes('chaussette')) {
                                                                    gifSource = require('../../../assets/images/socks (1).gif');
                                                                } else if (normalizedName.includes('sweater') || normalizedName.includes('pull')) {
                                                                    gifSource = require('../../../assets/images/sweater.gif');
                                                                } else if (normalizedName.includes('towel') || normalizedName.includes('serviette')) {
                                                                    gifSource = require('../../../assets/images/towels.gif');
                                                                } else if (normalizedName.includes('vest') || normalizedName.includes('gilet')) {
                                                                    gifSource = require('../../../assets/images/vest.gif');
                                                                } else if (normalizedName.includes('hoodie')) {
                                                                    gifSource = require('../../../assets/images/hoodie.gif');
                                                                } else if (normalizedName.includes('tie') || normalizedName.includes('cravate')) {
                                                                    gifSource = require('../../../assets/images/professionality.gif');
                                                                } else if (normalizedName.includes('uniform') || normalizedName.includes('officer') || normalizedName.includes('officier')) {
                                                                    gifSource = require('../../../assets/images/customs-officer.gif');
                                                                } else if (normalizedName.includes('suit') || normalizedName.includes('costume')) {
                                                                    gifSource = require('../../../assets/images/suit.gif');
                                                                } else if (normalizedName.includes('underwear') || normalizedName.includes('sous-vêtement')) {
                                                                    gifSource = require('../../../assets/images/bikini.gif');
                                                                } else if (normalizedName.includes('sportswear') || normalizedName.includes('sport')) {
                                                                    gifSource = require('../../../assets/images/basketball-equipment.gif');
                                                                }

                                                                if (gifSource) {
                                                                    return (
                                                                        <Image
                                                                            source={gifSource}
                                                                            style={{ width: 60, height: 60 }}
                                                                            contentFit="contain"
                                                                            cachePolicy="memory-disk"
                                                                        />
                                                                    );
                                                                }

                                                                return (
                                                                    <MaterialCommunityIcons
                                                                        name={getClothingIcon(category.icon_name)}
                                                                        size={40}
                                                                        color={theme.colors.primary}
                                                                    />
                                                                );
                                                            })()}
                                                        </View>
                                                        <Text style={styles.categoryName} numberOfLines={2}>
                                                            {(() => {
                                                                const name = category.name.toLowerCase();
                                                                if (name === 'trouser' || name.includes('pants')) return 'Pants';
                                                                return category.name;
                                                            })()}
                                                        </Text>
                                                        <Text style={styles.categoryPrice}>
                                                            ${parseFloat(category.base_price).toFixed(2)}
                                                        </Text>
                                                        {isSelected && (
                                                            <View style={styles.checkmarkBadge}>
                                                                <MaterialCommunityIcons
                                                                    name="check-circle"
                                                                    size={24}
                                                                    color={theme.colors.success}
                                                                />
                                                            </View>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )
                        ))}
                    </View>
                </View>

                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Why Choose Us?</Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Image
                                    source={require('../../../assets/images/icon_cleaning.png')}
                                    style={{ width: 32, height: 32 }}
                                    contentFit="contain"
                                />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>Premium Cleaning</Text>
                                <Text style={styles.featureDescription}>
                                    Eco-friendly quality care
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
                                <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.success} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>Quality Guaranteed</Text>
                                <Text style={styles.featureDescription}>
                                    Professional cleaning experts
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                                <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.secondary} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>Real-time Tracking</Text>
                                <Text style={styles.featureDescription}>
                                    Track your order every step
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Floating Selection Card */}
            {selectedItems.length > 0 && (
                <Animated.View
                    style={[
                        styles.floatingCard,
                        {
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.floatingCardHeader}>
                        <Text style={styles.floatingCardTitle}>
                            {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'} Selected
                        </Text>
                        <Text style={styles.floatingCardTotal}>
                            ${calculateEstimatedTotal().toFixed(2)}
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.floatingItemsList}
                        showsVerticalScrollIndicator={false}
                    >
                        {selectedItems.map((item) => {
                            const category = categories.find(c => c.id === item.categoryId);
                            if (!category) return null;

                            return (
                                <View key={item.categoryId} style={styles.floatingItem}>
                                    <View style={styles.floatingItemInfo}>
                                        <Text style={styles.floatingItemName} numberOfLines={1}>
                                            {category.name}
                                        </Text>
                                        <Text style={styles.floatingItemPrice}>
                                            ${parseFloat(category.base_price).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.floatingItemControls}>
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.categoryId, item.quantity - 1)}
                                            style={styles.floatingQuantityButton}
                                        >
                                            <MaterialCommunityIcons name="minus" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={styles.floatingQuantityText}>× {item.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.categoryId, item.quantity + 1)}
                                            style={styles.floatingQuantityButton}
                                        >
                                            <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.proceedButton}
                        onPress={proceedToOrder}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.proceedButtonText}>Proceed to Order</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.lg,
        ...theme.shadows.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: {
        width: 60,
        height: 60,
        marginLeft: theme.spacing.sm,
    },
    greeting: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    primaryButton: {
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        ...theme.shadows.lg,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    buttonBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
    },
    buttonContentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingVertical: theme.spacing.xl,
    },
    arrowContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    buttonIcon: {
        marginRight: theme.spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addGifIcon: {
        width: 70,
        height: 70,
    },
    buttonContent: {
        flex: 1,
    },
    primaryButtonTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    primaryButtonSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        opacity: 0.9,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
    },
    categoryCard: {
        width: '33.33%',
        padding: theme.spacing.xs,
    },
    categoryCardInner: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    categoryIconContainer: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    categoryImage: {
        width: '100%',
        height: '100%',
    },
    categoryName: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.xs,
    },
    categoryPrice: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
    },
    featuresList: {
        gap: theme.spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    featureText: {
        flex: 1,
        justifyContent: 'center',
    },
    featureTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    featureDescription: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    errorBanner: {
        backgroundColor: '#f44336',
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    errorText: {
        flex: 1,
        color: '#fff',
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.medium,
    },
    retryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    retryText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.semibold,
    },
    cacheBanner: {
        backgroundColor: '#f5f5f5',
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    cacheText: {
        color: '#666',
        fontSize: theme.fonts.sizes.xs,
        fontStyle: 'italic',
    },
    // Selection feature styles
    categoryCardSelected: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        transform: [{ scale: 1.02 }],
    },
    checkmarkBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
        ...theme.shadows.md,
    },
    floatingCard: {
        position: 'absolute',
        bottom: 70, // Above tab bar
        left: theme.spacing.md,
        right: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.lg,
        maxHeight: 280,
        overflow: 'hidden',
    },
    floatingCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    floatingCardTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
    },
    floatingCardTotal: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
    },
    floatingItemsList: {
        maxHeight: 140,
        paddingHorizontal: theme.spacing.md,
    },
    floatingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    floatingItemInfo: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    floatingItemName: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
        marginBottom: 2,
    },
    floatingItemPrice: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
    },
    floatingItemControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    floatingQuantityButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    floatingQuantityText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        minWidth: 32,
        textAlign: 'center',
    },
    proceedButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.md,
        marginTop: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.xs,
        ...theme.shadows.md,
    },
    proceedButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
        color: '#fff',
    },
});

export default HomeScreen;
