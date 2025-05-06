// scripts/check-env.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ANSI color codes for better terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
};

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables from multiple sources
const loadEnvFiles = () => {
    const envFiles = [
        { name: '.env', data: null },
        { name: '.env.local', data: null },
        { name: '.env.development', data: null },
        { name: '.env.production', data: null },
    ];

    envFiles.forEach(file => {
        const filePath = path.join(projectRoot, file.name);
        if (fs.existsSync(filePath)) {
            file.data = dotenv.parse(fs.readFileSync(filePath));
        }
    });

    return envFiles;
};

// Check for specific environment variables with detailed feedback
const checkAuthConfig = () => {
    console.log(`${colors.bold}${colors.blue}Checking NextAuth Configuration...${colors.reset}\n`);

    const requiredVars = [
        {
            name: 'NEXTAUTH_SECRET',
            description: 'Secret used to encrypt your auth tokens',
            recommendation: 'Can be any random string, but should be at least 32 characters. You can generate one with: `openssl rand -base64 32`'
        },
        {
            name: 'NEXTAUTH_URL',
            description: 'Full URL of your application',
            recommendation: 'Should match your deployment URL (e.g., http://localhost:3000 for development)'
        },
        {
            name: 'SPOTIFY_CLIENT_ID',
            description: 'Client ID from Spotify Developer Dashboard',
            recommendation: 'Create an app at https://developer.spotify.com/dashboard/'
        },
        {
            name: 'SPOTIFY_CLIENT_SECRET',
            description: 'Client Secret from Spotify Developer Dashboard',
            recommendation: 'Available in your Spotify Developer Dashboard'
        },
    ];

    const results = {
        present: 0,
        missing: 0,
        total: requiredVars.length
    };

    const envFiles = loadEnvFiles();

    // First, display what env files were found
    console.log(`${colors.cyan}Environment files:${colors.reset}`);
    envFiles.forEach(file => {
        if (file.data) {
            console.log(`  ${colors.green}✓${colors.reset} ${file.name} (found)`);
        } else {
            console.log(`  ${colors.yellow}○${colors.reset} ${file.name} (not found)`);
        }
    });
    console.log('');

    // Log which variables are imported in process.env
    console.log(`${colors.cyan}Required environment variables:${colors.reset}`);

    requiredVars.forEach(variable => {
        if (process.env[variable.name]) {
            results.present++;
            console.log(`  ${colors.green}✓${colors.reset} ${variable.name} is set`);
        } else {
            results.missing++;

            // Check if it exists in any .env file but not loaded
            let foundInEnvFile = false;
            let envFileWithVar = null;

            envFiles.forEach(file => {
                if (file.data && file.data[variable.name]) {
                    foundInEnvFile = true;
                    envFileWithVar = file.name;
                }
            });

            if (foundInEnvFile) {
                console.log(`  ${colors.yellow}!${colors.reset} ${variable.name} exists in ${envFileWithVar} but is not loaded into process.env`);
            } else {
                console.log(`  ${colors.red}✗${colors.reset} ${variable.name} is not set`);
            }

            console.log(`    ${colors.white}${variable.description}${colors.reset}`);
            console.log(`    ${colors.yellow}Recommendation: ${variable.recommendation}${colors.reset}`);
        }
    });

    console.log('');

    // Check Spotify configuration URL
    if (process.env.SPOTIFY_CLIENT_ID && process.env.NEXTAUTH_URL) {
        console.log(`${colors.cyan}Spotify callback configuration:${colors.reset}`);
        const callbackUrl = new URL('/api/auth/callback/spotify', process.env.NEXTAUTH_URL).toString();
        console.log(`  Callback URL to configure in Spotify Dashboard: ${colors.green}${callbackUrl}${colors.reset}`);
    }

    // Summary
    console.log('');
    console.log(`${colors.cyan}Summary:${colors.reset}`);
    if (results.missing === 0) {
        console.log(`${colors.green}All required environment variables are set.${colors.reset}`);
    } else {
        console.log(`${colors.yellow}${results.missing}/${results.total} required variables are missing.${colors.reset}`);
        console.log(`${colors.white}Please add the missing variables to your environment files.${colors.reset}`);
    }

    // Specific advice for NEXTAUTH_URL issues
    if (process.env.NEXTAUTH_URL) {
        const url = new URL(process.env.NEXTAUTH_URL);
        if (url.hostname === 'localhost') {
            console.log(`\n${colors.yellow}Note:${colors.reset} Your NEXTAUTH_URL is set to localhost.`);
            console.log(`When deploying, update this to your production URL.`);
        }
    }

    return results.missing === 0;
};

// Run the checks
try {
    dotenv.config({ path: path.join(projectRoot, '.env') });
    dotenv.config({ path: path.join(projectRoot, '.env.local') });

    console.log(`\n${colors.bold}${colors.white}====== NextAuth Environment Checker ======${colors.reset}\n`);
    const isConfigValid = checkAuthConfig();

    if (!isConfigValid) {
        console.log(`\n${colors.yellow}Please fix the environment issues before continuing.${colors.reset}`);
    } else {
        console.log(`\n${colors.green}Your NextAuth configuration looks good!${colors.reset}`);
    }
    console.log('');
} catch (error) {
    console.error(`${colors.red}Error checking environment configuration:${colors.reset}`, error);
    process.exit(1);
}