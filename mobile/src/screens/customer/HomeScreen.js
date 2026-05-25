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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { categoriesAPI, pointsAPI, API_BASE } from '../../services/api';
import theme from '../../theme/theme';
import VirtualCard from '../../components/VirtualCard';

const TEAL = '#00D4D4';

// ─── GIF icon map ──────────────────────────────────────────────────────────────
// Includes both DB icon_name values (MaterialCommunityIcons names) and custom keys
const GIF_ICONS = {
    // ── DB icon_name values (migration 008) ──
    'human-male':           require('../../../assets/images/ensemble Homme.gif'),
    'human-female':         require('../../../assets/images/ensemble Dame.gif'),
    'human':                require('../../../assets/images/debardeur.gif'),
    'briefcase':            require('../../../assets/images/suit.gif'),
    'tshirt-crew':          require('../../../assets/images/t-shirt.gif'),
    'tshirt-crew-outline':  require('../../../assets/images/long-sleeves.gif'),
    'underwear':            require('../../../assets/images/short.gif'),
    'coat':                 require('../../../assets/images/peignoir-de-bain.gif'),
    'towel':                require('../../../assets/images/towels.gif'),
    // ── Custom/legacy keys ──
    'shirt':            require('../../../assets/images/shirt.gif'),
    't-shirt':          require('../../../assets/images/t-shirt.gif'),
    'polo':             require('../../../assets/images/polo.gif'),
    'vest':             require('../../../assets/images/vest.gif'),
    'long-sleeves':     require('../../../assets/images/long-sleeves.gif'),
    'sweater':          require('../../../assets/images/sweater.gif'),
    'hoodie':           require('../../../assets/images/hoodie.gif'),
    'hooded':           require('../../../assets/images/hooded-sweatshirt.gif'),
    'jacket':           require('../../../assets/images/jacket.gif'),
    'leather':          require('../../../assets/images/leather-jacket.gif'),
    'pants':            require('../../../assets/images/pants.gif'),
    'short':            require('../../../assets/images/short.gif'),
    'skirt':            require('../../../assets/images/skirt.gif'),
    'dress':            require('../../../assets/images/dress.gif'),
    'suit':             require('../../../assets/images/suit.gif'),
    'suit-full':        require('../../../assets/images/tuxedo.gif'),
    'tuxedo':           require('../../../assets/images/tuxedo.gif'),
    'coverall':         require('../../../assets/images/coverall.gif'),
    'clothes':          require('../../../assets/images/clothes.gif'),
    'towels':           require('../../../assets/images/towels.gif'),
    'bed':              require('../../../assets/images/bed.gif'),
    'pillow':           require('../../../assets/images/pillow.gif'),
    'curtain':          require('../../../assets/images/curtain.gif'),
    'laundry':          require('../../../assets/images/laundry.gif'),
    'socks':            require('../../../assets/images/socks.gif'),
    'bra':              require('../../../assets/images/bra.gif'),
    'bikini':           require('../../../assets/images/bikini.gif'),
    'boxer':            require('../../../assets/images/boxer-shorts.gif'),
    'ensemble-dame':    require('../../../assets/images/ensemble Dame.gif'),
    'ensemble-homme':   require('../../../assets/images/ensemble Homme.gif'),
    'debardeur':        require('../../../assets/images/debardeur.gif'),
    'pantalon-dame':    require('../../../assets/images/pantalon dame.gif'),
    'jupe-plisse':      require('../../../assets/images/jupe plisse.gif'),
    'robe-simple':      require('../../../assets/images/robe simple.gif'),
    'robe-de-mariee':   require('../../../assets/images/robe de mariage.gif'),
    'robe-soiree':      require('../../../assets/images/robe de soirée.gif'),
    'peignoir':         require('../../../assets/images/peignoir-de-bain.gif'),
    'paire-de-drap':    require('../../../assets/images/Paire de drap.gif'),
    'customs-officer':  require('../../../assets/images/customs-officer.gif'),
};
const DEFAULT_GIF = require('../../../assets/images/clothes.gif');


// Name-aware resolver: uses category name for granular matching (e.g. distinguishes
// "Robe de Mariage" from "Robe Simple" even though both have icon_name = 'dress').
// If the server has uploaded a custom gif_url, it takes priority.
const getGif = (iconName, categoryName, gifUrl) => {
    if (gifUrl) return { uri: `${API_BASE}${gifUrl}` };
    const n = (categoryName || '').toLowerCase();

    // ── Name-based priority matching (most specific first) ──
    if (n.includes('mariage'))                              return GIF_ICONS['robe-de-mariee'];
    if (n.includes('soirée') || n.includes('soiree'))      return GIF_ICONS['robe-soiree'];
    if (n.includes('robe'))                                 return GIF_ICONS['robe-simple'];
    if (n.includes('ensemble') && n.includes('homme'))      return GIF_ICONS['ensemble-homme'];
    if (n.includes('ensemble') && n.includes('dame'))       return GIF_ICONS['ensemble-dame'];
    if (n.includes('ensemble'))                             return GIF_ICONS['ensemble-homme'];
    if (n.includes('pantalon') && n.includes('dame'))       return GIF_ICONS['pantalon-dame'];
    if (n.includes('jupe') && n.includes('pliss'))          return GIF_ICONS['jupe-plisse'];
    if (n.includes('paire') && n.includes('drap'))          return GIF_ICONS['paire-de-drap'];
    if (n.includes('peignoir'))                             return GIF_ICONS['peignoir'];
    if (n.includes('combinaison'))                          return GIF_ICONS['coverall'];
    if (n.includes('costume'))                              return GIF_ICONS['suit'];
    if (n.includes('débardeur') || n.includes('debardeur')) return GIF_ICONS['debardeur'];
    if (n.includes('chemise'))                              return GIF_ICONS['shirt'];
    if (n.includes('cuir'))                                 return GIF_ICONS['leather'];
    if (n.includes('blouson') || n.includes('veste'))       return GIF_ICONS['jacket'];
    if (n.includes('jupe'))                                 return GIF_ICONS['skirt'];
    if (n.includes('pantalon'))                             return GIF_ICONS['pants'];

    // ── icon_name exact match ──
    if (!iconName) return DEFAULT_GIF;
    const key = iconName.toLowerCase();
    if (GIF_ICONS[key]) return GIF_ICONS[key];

    // ── Partial match ──
    const found = Object.keys(GIF_ICONS).find(k => key.includes(k) || k.includes(key));
    return found ? GIF_ICONS[found] : DEFAULT_GIF;
};

// ─── Barème E-Press fallback (used when API is offline) ───────────────────────
const FALLBACK_GROUPS = {
    'Ensembles & Professionnel': [
        { id: 'f1',  name: 'Ensemble Homme',        name_fr: 'Ensemble Homme',        base_price: 40, icon_name: 'human-male' },
        { id: 'f2',  name: 'Ensemble Dame',         name_fr: 'Ensemble Dame',         base_price: 40, icon_name: 'human-female' },
        { id: 'f4',  name: 'Costume',               name_fr: 'Costume',               base_price: 50, icon_name: 'briefcase' },
        { id: 'f5',  name: 'Combinaison',            name_fr: 'Combinaison',            base_price: 40, icon_name: 'coverall' },
        { id: 'f5b', name: 'Tenue Professionnelle', name_fr: 'Tenue Professionnelle', base_price: 30, icon_name: 'customs-officer' },
    ],
    'Vêtements du quotidien': [
        { id: 'f6',  name: 'Chemise',        name_fr: 'Chemise',        base_price: 15, icon_name: 'shirt' },
        { id: 'f7',  name: 'T-Shirt',        name_fr: 'T-Shirt',        base_price: 15, icon_name: 'tshirt-crew' },
        { id: 'f8',  name: 'Polo',           name_fr: 'Polo',           base_price: 15, icon_name: 'polo' },
        { id: 'f9',  name: 'Haut Dame',      name_fr: 'Haut Dame',      base_price: 15, icon_name: 'tshirt-crew-outline' },
        { id: 'f10', name: 'Débardeur',      name_fr: 'Débardeur',      base_price: 10, icon_name: 'human' },
        { id: 'f11', name: 'Pantalon',       name_fr: 'Pantalon',       base_price: 20, icon_name: 'pants' },
        { id: 'f12', name: 'Pantalon Jeans', name_fr: 'Pantalon Jeans', base_price: 20, icon_name: 'pants' },
        { id: 'f13', name: 'Pantalon Dame',  name_fr: 'Pantalon Dame',  base_price: 25, icon_name: 'pants' },
        { id: 'f14', name: 'Jupe Simple',    name_fr: 'Jupe Simple',    base_price: 20, icon_name: 'skirt' },
        { id: 'f15', name: 'Jupe Plissée',   name_fr: 'Jupe Plissée',   base_price: 25, icon_name: 'skirt' },
        { id: 'f16', name: 'Culotte',        name_fr: 'Culotte',        base_price: 10, icon_name: 'underwear' },
    ],
    'Robes & Soirée': [
        { id: 'f17', name: 'Robe Simple',     name_fr: 'Robe Simple',     base_price: 30,  icon_name: 'dress' },
        { id: 'f18', name: 'Robe de Soirée',  name_fr: 'Robe de Soirée',  base_price: 120, icon_name: 'dress' },
        { id: 'f19', name: 'Robe de Mariage', name_fr: 'Robe de Mariage', base_price: 300, icon_name: 'dress' },
    ],
    "Vêtements d'extérieur": [
        { id: 'f20',  name: 'Blouson',          name_fr: 'Blouson',          base_price: 25, icon_name: 'jacket' },
        { id: 'f20b', name: 'Veste en Cuir',    name_fr: 'Veste en Cuir',    base_price: 30, icon_name: 'leather' },
    ],
    'Linge de maison': [
        { id: 'f20c', name: 'Peignoir',     name_fr: 'Peignoir',     base_price: 25,  icon_name: 'coat' },
        { id: 'f21',  name: 'Drap Simple',  name_fr: 'Drap Simple',  base_price: 20,  icon_name: 'bed' },
        { id: 'f22',  name: 'Paire de Drap',name_fr: 'Paire de Drap',base_price: 40,  icon_name: 'bed' },
        { id: 'f23',  name: 'Couvre-Lit',   name_fr: 'Couvre-Lit',   base_price: 100, icon_name: 'bed' },
        { id: 'f24',  name: 'Serviette',    name_fr: 'Serviette',    base_price: 10,  icon_name: 'towel' },
        { id: 'f25',  name: 'Rideau',       name_fr: 'Rideau',       base_price: 25,  icon_name: 'curtain' },
    ],
};

const HomeScreen = ({ navigation }) => {
    const { user, updateUserPoints } = useAuth();
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [groupedCategories, setGroupedCategories] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [usingCache, setUsingCache] = useState(false);
    const [pointsData, setPointsData] = useState(null);
    const fadeAnim = useState(new Animated.Value(0))[0];

    // Smart selection feature
    const [selectedItems, setSelectedItems] = useState([]);
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        loadCategories();
        loadPoints();
    }, []);

    const loadPoints = async () => {
        try {
            const res = await pointsAPI.getBalance();
            setPointsData(res.data);
        } catch (e) {
            // Non-fatal: use user object fallback
        }
    };

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

            const groupsConfig = {
                'Ensembles & Professionnel': ['ensemble', 'costume', 'combinaison', 'tenue'],
                'Vêtements du quotidien':    ['chemise', 'haut', 't-shirt', 'polo', 'débardeur', 'pantalon', 'jupe', 'culotte'],
                'Robes & Soirée':            ['robe'],
                "Vêtements d'extérieur":     ['blouson', 'veste'],
                'Linge de maison':           ['drap', 'couvre', 'serviette', 'rideau', 'peignoir'],
            };

            const groups = Object.fromEntries(Object.keys(groupsConfig).map(k => [k, []]));
            response.data.forEach(cat => {
                const name = cat.name.toLowerCase();
                let placed = false;
                for (const [groupKey, keywords] of Object.entries(groupsConfig)) {
                    if (keywords.some(kw => name.includes(kw))) {
                        groups[groupKey].push(cat);
                        placed = true;
                        break;
                    }
                }
                if (!placed) groups['Vêtements du quotidien'].push(cat);
            });
            setGroupedCategories(groups);
        } catch (err) {
            console.error('Error loading categories:', err);
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || err.code === 'NETWORK_ERROR') {
                setError(t('errors.network'));
            } else {
                setError(t('errors.generic'));
            }
            // Show fallback categories so the screen isn't empty
            setGroupedCategories(FALLBACK_GROUPS);
            setCategories(Object.values(FALLBACK_GROUPS).flat());
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
                total += parseFloat(category.base_price) * item.quantity * 100;
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
                <Image
                    source={require('../../../assets/icon.svg')}
                    style={styles.headerDropIcon}
                    contentFit="contain"
                />
                <Text style={styles.headerBrand}>E-Press</Text>
                <Image
                    source={require('../../../assets/images/washing-machine.gif')}
                    style={styles.headerWashIcon}
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
                        <Text style={styles.retryText}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {usingCache && !error && (
                <View style={styles.cacheBanner}>
                    <MaterialCommunityIcons name="cloud-off-outline" size={20} color="#666" />
                    <Text style={styles.cacheText}>Données hors ligne affichées</Text>
                </View>
            )}

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Virtual E-Press Card */}
                <View style={styles.section}>
                    <VirtualCard
                        user={{
                            fullName: user?.fullName,
                            cardNumber: pointsData?.cardNumber || user?.cardNumber,
                            pointsBalance: pointsData?.pointsBalance ?? user?.pointsBalance ?? 0,
                            pointsEarnedTotal: pointsData?.pointsEarnedTotal ?? user?.pointsEarnedTotal ?? 0,
                        }}
                        onPress={() => navigation.navigate('PointsHistory')}
                    />
                    {/* New Order quick button below card */}
                    <TouchableOpacity
                        style={styles.newOrderButton}
                        onPress={() => navigation.navigate('NewOrder')}
                        activeOpacity={0.85}
                    >
                        <Image
                            source={require('../../../assets/images/add.gif')}
                            style={styles.addGifSmall}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                        <View style={styles.newOrderContent}>
                            <Text style={styles.newOrderTitle}>{t('customer.home.newOrder')}</Text>
                            <Text style={styles.newOrderSubtitle}>{t('customer.home.schedulePickup')}</Text>
                        </View>
                        <View style={styles.arrowContainer}>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Nos Services ── */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionTitleAccent} />
                        <Text style={styles.sectionTitle}>{t('customer.home.ourServices')}</Text>
                    </View>

                    {Object.entries(groupedCategories).map(([groupTitle, items]) =>
                        items.length > 0 && (
                            <View key={groupTitle} style={{ marginBottom: theme.spacing.lg }}>
                                <View style={styles.groupTitleRow}>
                                    <View style={styles.groupTitleLine} />
                                    <Text style={styles.groupTitle}>{groupTitle}</Text>
                                    <View style={styles.groupTitleLine} />
                                </View>
                                <View style={styles.grid}>
                                    {items.map((category) => {
                                        const isSelected = selectedItems.some(i => i.categoryId === category.id);
                                        return (
                                            <TouchableOpacity
                                                key={category.id}
                                                style={styles.categoryCard}
                                                onPress={() => toggleItemSelection(category.id)}
                                                activeOpacity={0.75}>
                                                <View style={[styles.categoryCardInner, isSelected && styles.categoryCardSelected]}>
                                                    <Image
                                                        source={getGif(category.icon_name, category.name_fr || category.name, category.gif_url)}
                                                        style={styles.categoryGif}
                                                        contentFit="contain"
                                                        cachePolicy="memory-disk"
                                                    />
                                                    <Text style={styles.categoryName} numberOfLines={2}>
                                                        {category.name_fr || category.name}
                                                    </Text>
                                                    <Text style={styles.categoryPrice}>
                                                        {(parseFloat(category.base_price) * 100).toFixed(0)} F
                                                    </Text>
                                                    {isSelected && (
                                                        <View style={styles.checkmarkBadge}>
                                                            <MaterialCommunityIcons name="check-circle" size={22} color={TEAL} />
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )
                    )}
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
                            {t('customer.home.itemsSelected', {
                                count: selectedItems.length,
                                item: selectedItems.length === 1 ? t('customer.home.item') : t('customer.home.items')
                            })}
                        </Text>
                        <Text style={styles.floatingCardTotal}>
                            {calculateEstimatedTotal().toFixed(0)} Fcfa
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
                                            {(parseFloat(category.base_price) * 100).toFixed(0)} Fcfa
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
                        <Text style={styles.proceedButtonText}>{t('customer.home.createOrder')}</Text>
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
        gap: 10,
    },
    headerDropIcon: {
        width: 32,
        height: 32,
    },
    headerBrand: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: 0.5,
        flex: 1,
    },
    headerWashIcon: {
        width: 46,
        height: 46,
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
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: 0.2,
    },
    newOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginTop: theme.spacing.md,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        ...theme.shadows.md,
    },
    addGifSmall: { width: 50, height: 50, marginRight: theme.spacing.sm },
    newOrderContent: { flex: 1 },
    newOrderTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
        marginBottom: 2,
    },
    newOrderSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    arrowContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
    },
    categoryCard: { width: '33.33%', padding: theme.spacing.xs },
    categoryCardInner: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: 'rgba(0,212,212,0.07)',
    },
    categoryName: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 3,
        lineHeight: 14,
    },
    categoryPrice: {
        fontSize: 12,
        fontWeight: '800',
        color: TEAL,
    },
    // ── Section title with teal accent bar ──
    sectionTitleRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
    sectionTitleAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: TEAL, marginRight: 10 },

    // ── Group title with lines ──
    groupTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
    groupTitleLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
    groupTitle: {
        fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary,
        marginHorizontal: 10, textTransform: 'uppercase', letterSpacing: 1.2,
    },

    // ── Category GIF icon ──
    categoryGif: { width: 48, height: 48, marginBottom: 6 },

    // ── Features 2×2 grid ──
    featureGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.xs, marginTop: theme.spacing.sm },
    featureCard:      { width: '50%', padding: theme.spacing.xs },
    featureCardInner: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
        flex: 1,
    },
    featureIcon:        { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
    featureTitle:       { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    featureDescription: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16 },
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
