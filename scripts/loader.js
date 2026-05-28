/**
 * Enhanced TypeScript loader with better error handling
 */
import {
    resolve as resolveTs,
    getFormat,
    transformSource,
    load,
} from "ts-node/esm";
import * as tsConfigPaths from "tsconfig-paths";

export { getFormat, transformSource, load };

// Setup path mapping
const { absoluteBaseUrl, paths } = tsConfigPaths.loadConfig();
const matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);

export function resolve(specifier, context, defaultResolver) {
    try {
        const mappedSpecifier = matchPath(specifier);
        if (mappedSpecifier) {
            specifier = `${mappedSpecifier}`;
        }
        return resolveTs(specifier, context, defaultResolver);
    } catch (error) {
        // Enhanced error logging for resolve issues
        console.error('\n🚨 Error in module resolution:');
        console.error('Specifier:', specifier);
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        throw error;
    }
}

// Enhanced error formatting function
const formatError = (error, context = '') => {
    const separator = '='.repeat(80);
  
    console.error(`🚨 ${context.toUpperCase()} ERROR`);

    
    if (error && typeof error === 'object') {
        // Handle Error instances
        if (error instanceof Error) {
            console.error(`Type: ${error.constructor.name}`);
            console.error(`Message: ${error.message}`);
            
            if (error.stack) {
                console.error('\nStack Trace:');
                const stack = error.stack.split('\n');
                stack.forEach((line, index) => {
                    if (index === 0) {
                        console.error(`  → ${line}`);
                    } else {
                        console.error(`    ${line}`);
                    }
                });
            }
        } 
        // Handle objects with null prototype
        else if (Object.getPrototypeOf(error) === null) {
            console.error('Object with null prototype detected');
            const props = Object.getOwnPropertyNames(error);
            console.error('Properties:', props);
            
            props.forEach(prop => {
                try {
                    const value = error[prop];
                    if (typeof value === 'function') {
                        console.error(`  ${prop}: [Function]`);
                    } else {
                        console.error(`  ${prop}:`, JSON.stringify(value, null, 2));
                    }
                } catch (e) {
                    console.error(`  ${prop}: [Unable to serialize]`);
                }
            });
            
            // Try to call inspect function if it exists
            if (error[Symbol.for('nodejs.util.inspect.custom')]) {
                try {
                    console.error('\nInspect output:');
                    console.error(error[Symbol.for('nodejs.util.inspect.custom')]());
                } catch (e) {
                    console.error('Failed to call inspect function');
                }
            }
        }
        // Handle regular objects
        else {
            console.error('Error object:');
            try {
                console.error(JSON.stringify(error, null, 2));
            } catch (e) {
                console.error('Unable to stringify error object');
                console.error('Error toString():', String(error));
            }
        }
    } else {
        console.error('Error value:', error);
        console.error('Error type:', typeof error);
    }
    
    console.error(separator + '\n');
};

// Global error handlers
process.on('uncaughtException', (error) => {
    formatError(error, 'UNCAUGHT EXCEPTION');
    console.error('💀 Process will exit due to uncaught exception\n');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 UNHANDLED PROMISE REJECTION');
    console.error('='.repeat(80));
    console.error('Promise:', promise);
    console.error('Reason:');
    formatError(reason, 'PROMISE REJECTION');
    console.error('💀 Process will exit due to unhandled rejection\n');
    process.exit(1);
});

// Log when loader is initialized
console.log('🔧 TypeScript loader initialized with enhanced error handling');
