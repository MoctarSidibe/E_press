import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Comprehensive mapping of all service categories to MaterialCommunityIcons
export const CLOTHING_ICONS = {
    // Shirts & Tops
    'shirt': 'tshirt-crew-outline',
    'tshirt': 'tshirt-crew',
    't-shirt': 'tshirt-crew',
    'blouse': 'tshirt-v-outline',
    'sweater': 'tshirt-v',

    // Formal Wear
    'suit': 'account-tie',
    'suit-jacket': 'account-tie-outline',
    'blazer': 'account-tie-outline',
    'jacket': 'coat-rack',
    'coat': 'coat-rack',

    // Bottoms
    'pants': 'drama-masks', // best approximation
    'trousers': 'drama-masks',
    'shorts': 'run-fast',
    'skirt': 'gender-female',

    // Dresses
    'dress': 'tshirt-crew-outline',

    // Underwear
    'underwear': 'balloon',
    'panties': 'heart-outline',
    'boxer': 'checkbox-blank-outline',

    // Socks & Accessories
    'sock': 'foot-print',
    'socks': 'foot-print',
    'tie': 'tie',
    'scarf': 'scarf',
    'glove': 'glove',
    'gloves': 'glove',
    'hat': 'hat-fedora',
    'cap': 'hat-fedora',

    // Household - Bedding
    'bed': 'bed',
    'bedsheet': 'bed-outline',
    'sheet': 'bed-outline',
    'blanket': 'bed-king',
    'pillow': 'pillow',
    'duvet': 'bed-king-outline',
    'bathrobe': 'hanger',

    // Household - Linens
    'towel': 'paper-roll',
    'curtain': 'curtains',
    'curtains': 'curtains',
    'tablecloth': 'table-furniture',
    'napkin': 'square-outline',

    // Swimwear
    'swimsuit': 'swim',
    'swim': 'swim',

    // Fallback
    'default': 'hanger'
};

export const getClothingIcon = (iconName) => {
    if (!iconName) return CLOTHING_ICONS['default'];

    const lowerName = iconName.toLowerCase();

    // Direct match
    if (CLOTHING_ICONS[lowerName]) {
        return CLOTHING_ICONS[lowerName];
    }

    // Fuzzy match - find key that includes the search term
    const matchedKey = Object.keys(CLOTHING_ICONS).find(key =>
        lowerName.includes(key) || key.includes(lowerName)
    );

    return matchedKey ? CLOTHING_ICONS[matchedKey] : CLOTHING_ICONS['default'];
};

// Status icons - Using MCI equivalents
export const STATUS_ICONS = {
    pending: 'clock-outline',
    assigned: 'account-outline',
    driver_en_route_pickup: 'car',
    arrived_pickup: 'map-marker-outline',
    picked_up: 'check-circle-outline',
    in_facility: 'home-outline',
    cleaning: 'washing-machine',
    ready: 'check-all',
    out_for_delivery: 'truck-delivery-outline',
    driver_en_route_delivery: 'truck-delivery',
    arrived_delivery: 'map-marker',
    delivered: 'check-decagram',
    cancelled: 'close-circle-outline',
};

export const getStatusIcon = (status) => {
    return STATUS_ICONS[status] || 'circle-outline';
};

// Payment method icons
export const PAYMENT_ICONS = {
    cash: 'cash',
    airtel_money: 'cellphone',
    moov_money: 'cellphone-wireless',
};

export const getPaymentIcon = (method) => {
    return PAYMENT_ICONS[method] || 'credit-card-outline';
};

export default MaterialCommunityIcons;
