
import pino from 'pino';

// isDev removed to fix unused variable build error

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: undefined,
    browser: {
        asObject: true,
    },
});
