const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
];

const missing = requiredEnvVars.filter((name) => !process.env[name]);
if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

if (
    process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET.includes('change_in_production')
) {
    // eslint-disable-next-line no-console
    console.error('❌ JWT_SECRET must be changed from the default value in production.');
    process.exit(1);
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  ALLOWED_ORIGINS is empty in production; CORS will allow all origins.');
}

module.exports = {
    allowedOrigins
};
