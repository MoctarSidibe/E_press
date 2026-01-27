// Icon mapping helper - centralizes all GIF icon logic
// Used by both HomeScreen and NewOrderScreen for consistency

export const getItemGifIcon = (categoryName) => {
    const normalizedName = categoryName.toLowerCase();

    if (normalizedName.includes('shirt') && !normalizedName.includes('t-shirt') && !normalizedName.includes('sweat')) {
        return require('../../assets/images/shirt.gif');
    } else if (normalizedName.includes('t-shirt')) {
        return require('../../assets/images/t-shirt.gif');
    } else if (normalizedName.includes('polo')) {
        return require('../../assets/images/polo.gif');
    } else if (normalizedName.includes('pants') || normalizedName.includes('trouser') || normalizedName.includes('pantalon') || normalizedName.includes('jean')) {
        return require('../../assets/images/pants.gif');
    } else if (normalizedName.includes('dress')) {
        return require('../../assets/images/dress (1).gif');
    } else if (normalizedName.includes('baby') || normalizedName.includes('bébé')) {
        return require('../../assets/images/baby-clothes.gif');
    } else if (normalizedName.includes('bed') || normalizedName.includes('drap')) {
        return require('../../assets/images/bed.gif');
    } else if (normalizedName.includes('combinaison') || normalizedName.includes('coverall')) {
        return require('../../assets/images/coverall (1).gif');
    } else if (normalizedName.includes('curtain') || normalizedName.includes('rideau')) {
        return require('../../assets/images/curtain.gif');
    } else if (normalizedName.includes('sweatshirt')) {
        return require('../../assets/images/hooded-sweatshirt.gif');
    } else if (normalizedName.includes('leather') || normalizedName.includes('cuir')) {
        return require('../../assets/images/leather-jacket.gif');
    } else if (normalizedName.includes('coat') || normalizedName.includes('manteau') || normalizedName.includes('jacket')) {
        return require('../../assets/images/jacket.gif');
    } else if (normalizedName.includes('panties') || normalizedName.includes('culotte')) {
        return require('../../assets/images/panties.gif');
    } else if (normalizedName.includes('pillow') || normalizedName.includes('oreiller')) {
        return require('../../assets/images/pillow.gif');
    } else if (normalizedName.includes('shoe') || normalizedName.includes('chaussure')) {
        return require('../../assets/images/shoes (1).gif');
    } else if (normalizedName.includes('short')) {
        return require('../../assets/images/short.gif');
    } else if (normalizedName.includes('skirt') || normalizedName.includes('jupe')) {
        return require('../../assets/images/skirt.gif');
    } else if (normalizedName.includes('sock') || normalizedName.includes('chaussette')) {
        return require('../../assets/images/socks (1).gif');
    } else if (normalizedName.includes('sweater') || normalizedName.includes('pull')) {
        return require('../../assets/images/sweater.gif');
    } else if (normalizedName.includes('towel') || normalizedName.includes('serviette')) {
        return require('../../assets/images/towels.gif');
    } else if (normalizedName.includes('vest') || normalizedName.includes('gilet')) {
        return require('../../assets/images/vest.gif');
    } else if (normalizedName.includes('hoodie')) {
        return require('../../assets/images/hoodie.gif');
    } else if (normalizedName.includes('tie') || normalizedName.includes('cravate')) {
        return require('../../assets/images/professionality.gif');
    } else if (normalizedName.includes('uniform') || normalizedName.includes('officer') || normalizedName.includes('officier')) {
        return require('../../assets/images/customs-officer.gif');
    } else if (normalizedName.includes('suit') || normalizedName.includes('costume')) {
        return require('../../assets/images/suit.gif');
    } else if (normalizedName.includes('underwear') || normalizedName.includes('sous-vêtement')) {
        return require('../../assets/images/bikini.gif');
    } else if (normalizedName.includes('sportswear') || normalizedName.includes('sport')) {
        return require('../../assets/images/basketball-equipment.gif');
    }

    return null; // Fallback to MaterialCommunityIcons if no GIF found
};
