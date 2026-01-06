#!/usr/bin/env node
/**
 * MuscleMap App Store Preparation Script
 *
 * Automates everything needed for App Store submission:
 * - Generates all app icons (iOS + Android)
 * - Creates App Store metadata JSON
 * - Generates screenshot templates
 * - Creates store listing text
 *
 * Usage:
 *   node scripts/prepare-app-store.cjs
 *   pnpm prepare:appstore
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed. Run: pnpm add -D sharp');
  process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const MOBILE_DIR = path.join(ROOT_DIR, 'apps/mobile');
const ASSETS_DIR = path.join(MOBILE_DIR, 'assets');
const STORE_DIR = path.join(MOBILE_DIR, 'store-assets');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// ============================================
// ICON CONFIGURATIONS
// ============================================

const IOS_ICONS = [
  { name: 'icon-20.png', size: 20 },
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29.png', size: 29 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40.png', size: 40 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-76.png', size: 76 },
  { name: 'icon-76@2x.png', size: 152 },
  { name: 'icon-83.5@2x.png', size: 167 },
  { name: 'icon-1024.png', size: 1024 }, // App Store
];

const ANDROID_ICONS = [
  { name: 'mipmap-mdpi/ic_launcher.png', size: 48 },
  { name: 'mipmap-hdpi/ic_launcher.png', size: 72 },
  { name: 'mipmap-xhdpi/ic_launcher.png', size: 96 },
  { name: 'mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { name: 'mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { name: 'playstore-icon.png', size: 512 }, // Play Store
];

const EXPO_ICONS = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 288 },
  { name: 'favicon.png', size: 48 },
];

// App Store screenshot dimensions
const SCREENSHOT_SIZES = {
  'iPhone 6.7"': { width: 1290, height: 2796 },    // iPhone 15 Pro Max
  'iPhone 6.5"': { width: 1284, height: 2778 },    // iPhone 14 Plus
  'iPhone 5.5"': { width: 1242, height: 2208 },    // iPhone 8 Plus
  'iPad Pro 12.9"': { width: 2048, height: 2732 }, // iPad Pro
  'iPad Pro 11"': { width: 1668, height: 2388 },   // iPad Pro 11
};

// ============================================
// APP STORE METADATA
// ============================================

const APP_STORE_METADATA = {
  // Basic Info
  name: 'MuscleMap',
  subtitle: 'Visual Workout Tracking',

  // Descriptions
  description: `MuscleMap is the fitness app that shows you exactly which muscles you're working - in real-time.

VISUALIZE YOUR PROGRESS
See your muscle activation light up as you train. Our proprietary 3D muscle visualization system shows you exactly which muscle groups are being targeted with every exercise.

SMART WORKOUT TRACKING
• Log exercises with sets, reps, and weight
• Track your progress over time with detailed analytics
• View muscle group coverage to ensure balanced training
• Get AI-powered workout recommendations

PERSONALIZED TRAINING
MuscleMap learns your training patterns and preferences to suggest workouts that target your lagging muscle groups. Never miss a muscle again.

COMMUNITY & COMPETITION
• Join challenges and compete on leaderboards
• Share your achievements and progress photos
• Connect with other fitness enthusiasts
• Find workout partners in your area

HEALTHKIT INTEGRATION
Sync your workouts with Apple Health to keep all your fitness data in one place.

KEY FEATURES:
✓ Real-time 3D muscle visualization
✓ Comprehensive exercise library with 500+ exercises
✓ Progress tracking and analytics
✓ AI-powered workout recommendations
✓ Social features and leaderboards
✓ Apple Watch companion app
✓ HealthKit integration
✓ Dark mode optimized UI

Whether you're a beginner or advanced athlete, MuscleMap helps you train smarter by showing you exactly what's happening inside your body.

Start your transformation today.`,

  promotionalText: 'New: AI-powered workout recommendations now available! Let MuscleMap create the perfect training plan for your goals.',

  keywords: 'workout,fitness,muscle,gym,exercise,training,bodybuilding,strength,tracking,health,weightlifting,progress,3D,visualization',

  // What's New (for updates)
  whatsNew: `• New icon library with premium fitness icons
• Improved muscle visualization system
• Bug fixes and performance improvements
• Enhanced dark mode support`,

  // Support
  supportUrl: 'https://musclemap.me/support',
  marketingUrl: 'https://musclemap.me',
  privacyPolicyUrl: 'https://musclemap.me/privacy',

  // Categories
  primaryCategory: 'Health & Fitness',
  secondaryCategory: 'Sports',

  // Age Rating
  ageRating: '4+',

  // Copyright
  copyright: `© ${new Date().getFullYear()} MuscleMap`,

  // Contact
  contactEmail: 'support@musclemap.me',
  contactPhone: '',
  contactFirstName: 'Jean-Paul',
  contactLastName: 'Niko',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateIcon(sourceBuffer, outputPath, size, options = {}) {
  const dir = path.dirname(outputPath);
  await ensureDir(dir);

  const { background = { r: 10, g: 10, b: 15, alpha: 1 }, padding = 0 } = options;

  const contentSize = size - (padding * 2);

  await sharp(sourceBuffer)
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function createPlaceholderScreenshot(outputPath, size, text) {
  const { width, height } = size;

  // Create a dark gradient background with MuscleMap branding
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0f;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#001433;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0a0a0f;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#0066ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff3366;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="0" y="${height - 8}" width="100%" height="8" fill="url(#accent)"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="${Math.floor(width * 0.08)}" font-weight="bold" fill="#ffffff" text-anchor="middle">MuscleMap</text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${Math.floor(width * 0.03)}" fill="rgba(255,255,255,0.7)" text-anchor="middle">${text}</text>
      <text x="50%" y="90%" font-family="Arial, sans-serif" font-size="${Math.floor(width * 0.02)}" fill="rgba(255,255,255,0.5)" text-anchor="middle">Replace with actual screenshot</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

// ============================================
// MAIN GENERATION FUNCTIONS
// ============================================

async function generateAllIcons() {
  console.log('📱 Generating App Icons...\n');

  // Find source logo
  const logoPath = path.join(PUBLIC_DIR, 'logo.png');
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Logo not found at public/logo.png');
    return false;
  }

  const sourceBuffer = await sharp(logoPath).toBuffer();
  const metadata = await sharp(sourceBuffer).metadata();
  console.log(`   Source: ${logoPath} (${metadata.width}x${metadata.height})\n`);

  // Generate Expo icons (main ones used by the app)
  console.log('   Expo Icons:');
  for (const icon of EXPO_ICONS) {
    const outputPath = path.join(ASSETS_DIR, icon.name);
    await generateIcon(sourceBuffer, outputPath, icon.size, {
      background: { r: 10, g: 10, b: 15, alpha: 1 },
      padding: icon.name === 'adaptive-icon.png' ? Math.floor(icon.size * 0.15) : 0,
    });
    console.log(`   ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate iOS icons
  const iosDir = path.join(STORE_DIR, 'ios');
  await ensureDir(iosDir);
  console.log('\n   iOS Icons:');
  for (const icon of IOS_ICONS) {
    const outputPath = path.join(iosDir, icon.name);
    await generateIcon(sourceBuffer, outputPath, icon.size);
    console.log(`   ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate Android icons
  const androidDir = path.join(STORE_DIR, 'android');
  await ensureDir(androidDir);
  console.log('\n   Android Icons:');
  for (const icon of ANDROID_ICONS) {
    const outputPath = path.join(androidDir, icon.name);
    await generateIcon(sourceBuffer, outputPath, icon.size, {
      padding: icon.name.includes('ic_launcher') ? Math.floor(icon.size * 0.1) : 0,
    });
    console.log(`   ✓ ${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log('\n✅ Icons generated successfully!\n');
  return true;
}

async function generateScreenshotTemplates() {
  console.log('📸 Generating Screenshot Templates...\n');

  const screenshotsDir = path.join(STORE_DIR, 'screenshots');
  await ensureDir(screenshotsDir);

  const screens = [
    'Muscle Visualization',
    'Workout Tracking',
    'Progress Analytics',
    'Exercise Library',
    'Community Features',
  ];

  for (const [device, size] of Object.entries(SCREENSHOT_SIZES)) {
    const deviceDir = path.join(screenshotsDir, device.replace(/"/g, 'in').replace(/ /g, '-'));
    await ensureDir(deviceDir);

    console.log(`   ${device}:`);
    for (let i = 0; i < screens.length; i++) {
      const filename = `screenshot-${i + 1}-${screens[i].toLowerCase().replace(/ /g, '-')}.png`;
      const outputPath = path.join(deviceDir, filename);
      await createPlaceholderScreenshot(outputPath, size, screens[i]);
      console.log(`   ✓ ${filename}`);
    }
    console.log('');
  }

  console.log('✅ Screenshot templates generated!\n');
  console.log('   📝 Replace these placeholders with actual app screenshots\n');
  return true;
}

async function generateMetadata() {
  console.log('📝 Generating App Store Metadata...\n');

  const metadataDir = path.join(STORE_DIR, 'metadata');
  await ensureDir(metadataDir);

  // Write main metadata JSON
  const metadataPath = path.join(metadataDir, 'app-store-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(APP_STORE_METADATA, null, 2));
  console.log('   ✓ app-store-metadata.json');

  // Write description as plain text (easier to copy/paste)
  const descPath = path.join(metadataDir, 'description.txt');
  fs.writeFileSync(descPath, APP_STORE_METADATA.description);
  console.log('   ✓ description.txt');

  // Write keywords
  const keywordsPath = path.join(metadataDir, 'keywords.txt');
  fs.writeFileSync(keywordsPath, APP_STORE_METADATA.keywords);
  console.log('   ✓ keywords.txt');

  // Write what's new
  const whatsNewPath = path.join(metadataDir, 'whats-new.txt');
  fs.writeFileSync(whatsNewPath, APP_STORE_METADATA.whatsNew);
  console.log('   ✓ whats-new.txt');

  // Write promotional text
  const promoPath = path.join(metadataDir, 'promotional-text.txt');
  fs.writeFileSync(promoPath, APP_STORE_METADATA.promotionalText);
  console.log('   ✓ promotional-text.txt');

  console.log('\n✅ Metadata generated successfully!\n');
  return true;
}

async function generatePrivacyPolicy() {
  console.log('🔒 Generating Privacy Policy...\n');

  const privacyPolicy = `# MuscleMap Privacy Policy

Last Updated: ${new Date().toISOString().split('T')[0]}

## Overview

MuscleMap ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.

## Information We Collect

### Information You Provide
- **Account Information**: Email address, username, and password when you create an account
- **Profile Information**: Name, profile photo, fitness goals, and preferences
- **Workout Data**: Exercises, sets, reps, weights, and workout history
- **Health Data**: With your permission, we access HealthKit/Google Fit data including workouts, heart rate, and activity

### Information Collected Automatically
- **Device Information**: Device type, operating system, and unique device identifiers
- **Usage Data**: App interactions, features used, and session duration
- **Analytics**: Aggregated, anonymized usage statistics

## How We Use Your Information

- Provide and improve our fitness tracking services
- Personalize your workout recommendations
- Display your progress and achievements
- Enable social features and community interactions
- Send important updates about your account
- Analyze app performance and user experience

## Data Sharing

We do not sell your personal information. We may share data with:
- **Service Providers**: Third-party services that help us operate the app
- **Legal Requirements**: When required by law or to protect our rights
- **With Your Consent**: When you explicitly agree to sharing

## Health Data

We treat health and fitness data with extra care:
- HealthKit/Google Fit data is only accessed with your explicit permission
- Health data is encrypted in transit and at rest
- We never share health data with third parties for advertising
- You can revoke access at any time in your device settings

## Data Security

We implement industry-standard security measures:
- Encryption of data in transit (TLS/SSL)
- Encryption of sensitive data at rest
- Regular security audits
- Secure authentication practices

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your workout history
- Opt out of analytics

## Data Retention

- Account data is retained while your account is active
- Workout history is retained until you delete it or your account
- You can request complete data deletion at any time

## Children's Privacy

MuscleMap is not intended for children under 13. We do not knowingly collect data from children under 13.

## Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via the app or email.

## Contact Us

For privacy-related questions or requests:
- Email: privacy@musclemap.me
- Support: https://musclemap.me/support

## California Residents (CCPA)

California residents have additional rights under the CCPA, including the right to know what personal information is collected and the right to opt out of the sale of personal information.

## European Users (GDPR)

If you are in the European Economic Area, you have additional rights under GDPR including data portability and the right to lodge a complaint with a supervisory authority.
`;

  // Save to docs
  const docsPath = path.join(ROOT_DIR, 'docs/PRIVACY_POLICY.md');
  fs.writeFileSync(docsPath, privacyPolicy);
  console.log('   ✓ docs/PRIVACY_POLICY.md');

  // Save to public for web
  const publicPath = path.join(PUBLIC_DIR, 'privacy-policy.md');
  fs.writeFileSync(publicPath, privacyPolicy);
  console.log('   ✓ public/privacy-policy.md');

  // Save to store assets
  const storePath = path.join(STORE_DIR, 'metadata/privacy-policy.md');
  await ensureDir(path.dirname(storePath));
  fs.writeFileSync(storePath, privacyPolicy);
  console.log('   ✓ store-assets/metadata/privacy-policy.md');

  console.log('\n✅ Privacy policy generated!\n');
  return true;
}

function printSubmissionChecklist() {
  console.log('='.repeat(60));
  console.log('📋 APP STORE SUBMISSION CHECKLIST');
  console.log('='.repeat(60));
  console.log(`
Before submitting to the App Store, complete these steps:

□ APPLE DEVELOPER ACCOUNT
  □ Sign up at https://developer.apple.com/programs/ ($99/year)
  □ Complete enrollment (may take 1-2 days)

□ APP STORE CONNECT SETUP
  □ Create new app at https://appstoreconnect.apple.com
  □ Bundle ID: com.musclemap.app
  □ Note the App Store Connect App ID

□ UPDATE CONFIGURATION
  □ Update apps/mobile/eas.json with your Apple credentials:
     - appleId: Your Apple ID email
     - ascAppId: App Store Connect App ID
     - appleTeamId: Your team ID (from developer portal)

□ EAS SETUP
  □ Install EAS CLI: npm install -g eas-cli
  □ Login: eas login
  □ Initialize: cd apps/mobile && eas init
  □ Update app.json with the projectId

□ SCREENSHOTS
  □ Replace placeholder screenshots with actual app screenshots
  □ Location: apps/mobile/store-assets/screenshots/

□ PRIVACY POLICY
  □ Host privacy policy at https://musclemap.me/privacy
  □ Ensure it's accessible before submission

□ BUILD & SUBMIT
  □ Build: eas build --platform ios --profile production
  □ Submit: eas submit --platform ios --profile production

□ APP REVIEW
  □ Complete the app review questionnaire
  □ Provide test account credentials if needed
  □ Respond promptly to any reviewer questions

Need help? Run: node scripts/prepare-app-store.cjs --help
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MuscleMap App Store Preparation');
  console.log('='.repeat(60) + '\n');

  try {
    await ensureDir(STORE_DIR);

    await generateAllIcons();
    await generateScreenshotTemplates();
    await generateMetadata();
    await generatePrivacyPolicy();

    printSubmissionChecklist();

    console.log('\n✅ All assets generated successfully!');
    console.log(`\n📁 Output directory: ${STORE_DIR}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
