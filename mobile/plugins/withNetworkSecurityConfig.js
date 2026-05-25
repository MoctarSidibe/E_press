const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to allow cleartext HTTP to specific hosts.
 * Required because Android 9+ blocks HTTP by default and our backend uses
 * plain HTTP (Coolify reverse proxy on port 80, no TLS yet).
 *
 * Allowlist:
 *   - 161.97.66.69         production backend
 *   - localhost / 10.0.2.2  local backend from emulator
 *   - LAN_DEV_HOSTS         developer machines on Wi-Fi (Expo dev client / sideloaded APK)
 *
 * To add your dev machine, append its LAN IP to LAN_DEV_HOSTS below. This file
 * runs at prebuild time, so changes require an `expo prebuild` / new build to
 * take effect. (Expo Go ignores this file — it uses its own manifest.)
 */
const LAN_DEV_HOSTS = [
    '192.168.1.76',   // current dev machine
];

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
            const allHosts = ['161.97.66.69', 'localhost', '10.0.2.2', ...LAN_DEV_HOSTS];
            const domainLines = allHosts
                .map(h => `        <domain includeSubdomains="true">${h}</domain>`)
                .join('\n');
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
${domainLines}
    </domain-config>
</network-security-config>`;
            fs.writeFileSync(xmlPath, xml);
            return config;
        }
    ]);

    return config;
}

module.exports = withNetworkSecurityConfig;
