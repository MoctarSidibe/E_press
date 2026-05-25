import React, { useEffect, useRef, useState, memo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Animated
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { categoriesAPI } from '../../services/api';
import theme from '../../theme/theme';

// ─── Palette ──────────────────────────────────────────────────────────────────
const HERO_BG = '#07101f';
const TEAL    = '#00D4D4';
const TEAL_10 = 'rgba(0,212,212,0.10)';
const TEAL_20 = 'rgba(0,212,212,0.20)';

// ─── GIF icon map (require() must be static) ──────────────────────────────────
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

const getGif = (iconName, categoryName) => {
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

// ─── Barème E-Press fallback ───────────────────────────────────────────────────
const FALLBACK_GROUPS = {
    'Ensembles & Professionnel': [
        { id: 'f1',  name: 'Ensemble Homme',        name_fr: 'Ensemble Homme',        base_price: 40, icon_name: 'human-male' },
        { id: 'f2',  name: 'Ensemble Dame',         name_fr: 'Ensemble Dame',         base_price: 40, icon_name: 'human-female' },
        { id: 'f4',  name: 'Costume',               name_fr: 'Costume',               base_price: 50, icon_name: 'briefcase' },
        { id: 'f5',  name: 'Combinaison',            name_fr: 'Combinaison',            base_price: 40, icon_name: 'coverall' },
        { id: 'f5b', name: 'Tenue Professionnelle', name_fr: 'Tenue Professionnelle', base_price: 30, icon_name: 'customs-officer' },
    ],
    'Vêtements du quotidien': [
        { id: 'f6',  name: 'Chemise',        name_fr: 'Chemise',        base_price: 15,  icon_name: 'shirt' },
        { id: 'f7',  name: 'T-Shirt',        name_fr: 'T-Shirt',        base_price: 15,  icon_name: 'tshirt-crew' },
        { id: 'f8',  name: 'Polo',           name_fr: 'Polo',           base_price: 15,  icon_name: 'polo' },
        { id: 'f9',  name: 'Haut Dame',      name_fr: 'Haut Dame',      base_price: 15,  icon_name: 'tshirt-crew-outline' },
        { id: 'f10', name: 'Débardeur',      name_fr: 'Débardeur',      base_price: 10,  icon_name: 'human' },
        { id: 'f11', name: 'Pantalon',       name_fr: 'Pantalon',       base_price: 20,  icon_name: 'pants' },
        { id: 'f13', name: 'Pantalon Dame',  name_fr: 'Pantalon Dame',  base_price: 25,  icon_name: 'pants' },
        { id: 'f14', name: 'Jupe Simple',    name_fr: 'Jupe Simple',    base_price: 20,  icon_name: 'skirt' },
        { id: 'f15', name: 'Jupe Plissée',   name_fr: 'Jupe Plissée',   base_price: 25,  icon_name: 'skirt' },
        { id: 'f16', name: 'Culotte',        name_fr: 'Culotte',        base_price: 10,  icon_name: 'underwear' },
    ],
    'Robes & Soirée': [
        { id: 'f17', name: 'Robe Simple',     name_fr: 'Robe Simple',     base_price: 30,  icon_name: 'dress' },
        { id: 'f18', name: 'Robe de Soirée',  name_fr: 'Robe de Soirée',  base_price: 120, icon_name: 'dress' },
        { id: 'f19', name: 'Robe de Mariage', name_fr: 'Robe de Mariage', base_price: 300, icon_name: 'dress' },
    ],
    "Vêtements d'extérieur": [
        { id: 'f20',  name: 'Blouson',       name_fr: 'Blouson',       base_price: 25, icon_name: 'jacket' },
        { id: 'f20b', name: 'Veste en Cuir', name_fr: 'Veste en Cuir', base_price: 30, icon_name: 'leather' },
    ],
    'Linge de maison': [
        { id: 'f20c', name: 'Peignoir',      name_fr: 'Peignoir',      base_price: 25,  icon_name: 'coat' },
        { id: 'f22',  name: 'Drap Simple',   name_fr: 'Drap Simple',   base_price: 20,  icon_name: 'bed' },
        { id: 'f23',  name: 'Paire de Drap', name_fr: 'Paire de Drap', base_price: 40,  icon_name: 'bed' },
        { id: 'f24',  name: 'Couvre-Lit',    name_fr: 'Couvre-Lit',    base_price: 100, icon_name: 'bed' },
        { id: 'f25',  name: 'Serviette',     name_fr: 'Serviette',     base_price: 10,  icon_name: 'towel' },
        { id: 'f26',  name: 'Rideau',        name_fr: 'Rideau',        base_price: 25,  icon_name: 'curtain' },
    ],
};

// ─── Rising bubble config ─────────────────────────────────────────────────────
// size, left position (%), travel duration (ms), start delay (ms), opacity
// Kept lean (5 bubbles, slower cycles) to limit GPU/CPU load on mid-range Android.
const BUBBLE_CFG = [
    { size: 18, left: '10%', dur: 13000, delay: 0,    o: 0.26 },
    { size: 10, left: '30%', dur: 15000, delay: 2400, o: 0.20 },
    { size: 22, left: '52%', dur: 12000, delay: 4800, o: 0.22 },
    { size:  9, left: '72%', dur: 14000, delay: 1500, o: 0.24 },
    { size: 14, left: '88%', dur: 13500, delay: 6500, o: 0.20 },
];

// ─── Single rising bubble ─────────────────────────────────────────────────────
const RisingBubble = memo(({ size, left, dur, delay, o }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Mounted-flag closure so the recursive animation chain stops the moment
        // the screen unmounts. Without this, 5 bubbles kept animating forever
        // on the UI thread — drained battery and overheated the phone.
        let mounted = true;
        let currentAnim = null;

        const run = () => {
            if (!mounted) return;
            anim.setValue(0);
            currentAnim = Animated.timing(anim, {
                toValue: 1,
                duration: dur,
                useNativeDriver: true,
            });
            currentAnim.start(({ finished }) => {
                if (finished && mounted) run();
            });
        };
        const t = setTimeout(run, delay);
        return () => {
            mounted = false;
            clearTimeout(t);
            if (currentAnim) currentAnim.stop();
        };
    }, []);

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -340],
    });
    const opacity = anim.interpolate({
        inputRange: [0, 0.08, 0.75, 1],
        outputRange: [0,    o,    o, 0],
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                bottom: -size,
                left,
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.5,
                borderColor: TEAL,
                backgroundColor: 'transparent',
                opacity,
                transform: [{ translateY }],
            }}
        />
    );
});

// ─── Hero bubble layer ────────────────────────────────────────────────────────
const HeroBubbles = memo(() => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BUBBLE_CFG.map((cfg, i) => (
            <RisingBubble key={i} size={cfg.size} left={cfg.left}
                dur={cfg.dur} delay={cfg.delay} o={cfg.o} />
        ))}
    </View>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────
const GuestHomeScreen = ({ navigation }) => {
    const [groupedCategories, setGroupedCategories] = useState({});
    const [loading, setLoading] = useState(true);
    const entranceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadCategories();
        Animated.timing(entranceAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    }, []);

    const heroOpacity    = entranceAnim;
    const heroTranslateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

    const loadCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
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
                for (const [key, kws] of Object.entries(groupsConfig)) {
                    if (kws.some(kw => name.includes(kw))) { groups[key].push(cat); placed = true; break; }
                }
                if (!placed) groups['Vêtements du quotidien'].push(cat);
            });
            setGroupedCategories(groups);
        } catch {
            setGroupedCategories(FALLBACK_GROUPS);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={TEAL} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* ── Header ─────────────────────────────── */}
            <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.greeting} numberOfLines={1}>Bienvenue sur E-Press</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>Laverie & Pressing Premium</Text>
                </View>
                <Image
                    source={require('../../../assets/images/logo customer.gif')}
                    style={styles.headerLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}>

                {/* ── Hero Card ──────────────────────── */}
                <Animated.View style={[styles.heroCard, {
                    opacity: heroOpacity,
                    transform: [{ translateY: heroTranslateY }],
                }]}>
                    <HeroBubbles />

                    {/* Logo + text row */}
                    <View style={styles.heroRow}>
                        <View style={styles.heroIconWrap}>
                            <Image
                                source={require('../../../assets/icon.svg')}
                                style={styles.heroDrop}
                                contentFit="contain"
                            />
                        </View>
                        <View style={styles.heroTextBlock}>
                            <View style={styles.heroPill}>
                                <View style={styles.heroPillDot} />
                                <Text style={styles.heroPillText}>PROGRAMME FIDÉLITÉ</Text>
                            </View>
                            <Text style={styles.heroTitle}>Rejoignez E-Press{'\n'}& Gagnez des Points !</Text>
                            <Text style={styles.heroSub}>
                                <Text style={styles.heroSubAccent}>Pressing premium</Text>
                                {' · '}
                                <Text style={styles.heroSubAccent}>Collecte & Livraison</Text>
                            </Text>
                        </View>
                    </View>

                    {/* CTA buttons — at the bottom of the hero. Primary "S'inscrire"
                        gets more visual weight (bigger, teal). */}
                    <View style={styles.heroCTA}>
                        <TouchableOpacity
                            style={styles.btnGhost}
                            onPress={() => navigation.navigate('Login')}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons name="login" size={16} color="#fff" />
                            <Text style={styles.btnGhostText}>Connexion</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.btnTeal}
                            onPress={() => navigation.navigate('Register')}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons name="account-plus" size={18} color={HERO_BG} />
                            <Text style={styles.btnTealText}>S'inscrire</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Services ───────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionTitleAccent} />
                        <Text style={styles.sectionTitle}>Nos Services</Text>
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
                                    {items.map(category => (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={styles.categoryCard}
                                            onPress={() => navigation.navigate('Login')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={styles.categoryCardInner}>
                                                <Image
                                                    source={getGif(category.icon_name, category.name_fr || category.name)}
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
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )
                    )}
                </View>

                {/* ── Why us 2×2 grid ────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pourquoi nous choisir ?</Text>
                    <View style={styles.featureGrid}>
                        {[
                            { icon: 'star-circle',   color: TEAL,      bg: TEAL_10,                  title: 'Points Fidélité',     desc: 'Gagnez des points à chaque commande' },
                            { icon: 'tag-multiple',  color: '#FFD700', bg: 'rgba(255,215,0,0.09)',    title: 'Coupons Exclusifs',   desc: 'Codes promo pour économiser davantage' },
                            { icon: 'map-marker',    color: '#a78bfa', bg: 'rgba(167,139,250,0.09)',  title: 'Suivi en Temps Réel', desc: 'De la collecte jusqu\'à la livraison' },
                            { icon: 'shield-check',  color: '#34d399', bg: 'rgba(52,211,153,0.09)',   title: 'Qualité Garantie',    desc: '100% satisfait ou remboursé' },
                        ].map(f => (
                            <View key={f.title} style={styles.featureCard}>
                                <View style={[styles.featureCardInner]}>
                                    <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                                        <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
                                    </View>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureDescription}>{f.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Bottom CTA ─────────────────────── */}
                <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
                    <Image source={require('../../../assets/icon.svg')} style={styles.ctaIcon} contentFit="contain" />
                    <Text style={styles.ctaButtonText}>Créer un compte gratuit</Text>
                </TouchableOpacity>
                <View style={{ height: 28 }} />
            </ScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:        { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

    header: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.lg,
        ...theme.shadows.sm,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTextWrap: { flex: 1, marginRight: 12, minWidth: 0 },
    headerLogo:     { width: 46, height: 46, flexShrink: 0 },
    greeting:   { fontSize: theme.fonts.sizes.xxl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text },
    subtitle:   { fontSize: theme.fonts.sizes.sm,  color: theme.colors.textSecondary, marginTop: 2 },

    content:          { flex: 1 },
    contentContainer: { padding: theme.spacing.lg },

    // ── Hero
    heroCard: {
        backgroundColor: HERO_BG,
        borderRadius: 22,
        padding: 20,
        marginBottom: theme.spacing.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,212,212,0.12)',
        ...theme.shadows.lg,
    },
    heroRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    heroIconWrap: {
        width: 54, height: 54, borderRadius: 16,
        backgroundColor: TEAL_10,
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.25)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14, flexShrink: 0,
    },
    heroDrop:      { width: 32, height: 32 },
    heroTextBlock: { flex: 1 },
    heroPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: TEAL_10,
        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start', marginBottom: 7,
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.20)',
    },
    heroPillDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: TEAL },
    heroPillText: { fontSize: 9, color: TEAL, fontWeight: '700', letterSpacing: 0.9 },
    heroTitle:    { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, marginBottom: 5 },
    heroSub:       { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
    heroSubAccent: { color: TEAL, fontWeight: '700' },

    heroCTA: { flexDirection: 'row', gap: 10 },
    btnGhost: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    btnGhostText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnTeal: {
        flex: 1.4, paddingVertical: 14, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 8,
        backgroundColor: TEAL,
        shadowColor: TEAL, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    btnTealText: { color: HERO_BG, fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },

    // ── Services
    section:          { marginBottom: theme.spacing.xl },
    sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
    sectionTitleAccent: {
        width: 4, height: 22, borderRadius: 2,
        backgroundColor: TEAL, marginRight: 10,
    },
    sectionTitle:     { fontSize: 22, fontWeight: '900', color: theme.colors.text, letterSpacing: 0.2 },

    groupTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
    groupTitleLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
    groupTitle: {
        fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary,
        marginHorizontal: 10, textTransform: 'uppercase', letterSpacing: 1.2,
    },

    grid:         { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.xs },
    categoryCard: { width: '33.33%', padding: theme.spacing.xs },
    categoryCardInner: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: 12, paddingHorizontal: 6,
        alignItems: 'center',
        ...theme.shadows.sm,
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.07)',
    },
    categoryGif:   { width: 48, height: 48, marginBottom: 6 },
    categoryName:  { fontSize: 11, fontWeight: '600', color: theme.colors.text, textAlign: 'center', marginBottom: 3, lineHeight: 14 },
    categoryPrice: { fontSize: 12, fontWeight: '800', color: TEAL },

    // ── Features 2×2 grid
    featureGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    featureCard: {
        width: '50%', padding: theme.spacing.xs,
    },
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

    // ── Bottom CTA
    ctaButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: HERO_BG,
        borderRadius: 16, paddingVertical: 16,
        borderWidth: 1, borderColor: TEAL_20,
        ...theme.shadows.md,
    },
    ctaIcon:       { width: 20, height: 20 },
    ctaButtonText: { color: TEAL, fontSize: theme.fonts.sizes.md, fontWeight: '800', letterSpacing: 0.5 },
});

export default GuestHomeScreen;
