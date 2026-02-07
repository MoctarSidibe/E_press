const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to allow cleartext HTTP to API server (161.97.66.69)
 * Required for Android 9+ which blocks HTTP by default
 */
function withNetworkSecurityConfig(config) {
    // 1. Add networkSecurityConfig reference to AndroidManifest
    config = withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const app = manifest.manifest.application?.[0];
        if (app) {
            app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
        }
        return config;
    });

    // 2. Create network_security_config.xml file
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const xmlDir = path.join(
                config.modRequest.platformProjectRoot,
                'app',
                'src',
                'main',
                'res',
                'xml'
            );
            fs.mkdirSync(xmlDir, { recursive: true });
            const xmlPath = path.join(xmlDir, 'network_security_config.xml');
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">161.97.66.69</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>`;
            fs.writeFileSync(xmlPath, xml);
            return config;
        }
    ]);

    return config;
}

module.exports = withNetworkSecurityConfig;
