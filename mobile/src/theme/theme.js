export default {
    // Colors
    colors: {
        // Primary palette - Turquoise/Cyan blue theme matching the logo
        primary: '#00D4D4',          // Vibrant turquoise blue
        primaryDark: '#00A8A8',      // Darker turquoise
        primaryLight: '#33E0E0',     // Lighter turquoise

        secondary: '#00B4D8',        // Complementary blue
        secondaryDark: '#0096C7',    // Darker blue
        secondaryLight: '#48CAE4',   // Lighter blue

        // Accent
        accent: '#FF6B9D',           // Modern pink accent
        accentLight: '#FF8FB3',

        // Neutrals
        background: '#F0FDFD',       // Very light turquoise tint
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',

        // Text
        text: '#1A1F36',
        textSecondary: '#697386',
        textTertiary: '#A3ACB9',

        // Status colors
        success: '#00D9A3',
        warning: '#FFA726',
        error: '#FF5252',
        info: '#00D4D4',             // Using turquoise for info

        // Order status colors
        pending: '#FFA726',
        assigned: '#00D4D4',         // Turquoise for assigned
        picked_up: '#9C27B0',
        cleaning: '#00B4D8',         // Blue for cleaning
        out_for_delivery: '#4CAF50',
        delivered: '#00D9A3',
        cancelled: '#FF5252',

        // Borders
        border: '#E2E8F0',
        borderLight: '#F1F5F9',

        // Dark mode
        dark: {
            background: '#0F1419',
            surface: '#1A2028',
            surfaceElevated: '#222A35',
            text: '#FFFFFF',
            textSecondary: '#A3ACB9',
            border: '#2D3748',
        },
    },

    // Typography
    fonts: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
        sizes: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 20,
            xxl: 24,
            xxxl: 32,
        },
        weights: {
            regular: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
    },

    // Spacing
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    // Border radius
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
        full: 9999,
    },

    // Shadows (cross-platform compatible)
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 1,
            },
            shadowOpacity: 0.18,
            shadowRadius: 1.0,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.20,
            shadowRadius: 1.41,
            elevation: 2,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.23,
            shadowRadius: 2.62,
            elevation: 4,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.27,
            shadowRadius: 4.65,
            elevation: 8,
        },
    },
};
