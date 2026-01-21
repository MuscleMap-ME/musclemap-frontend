// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Archetype Images
 *
 * Adds high-quality Unsplash images to all archetypes for visual representation
 * on the onboarding flow and archetype selection screens.
 *
 * Images are sourced from Unsplash (free to use) and selected to match
 * each archetype's activity/discipline.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Unsplash image IDs mapped to archetypes
// Format: https://images.unsplash.com/photo-{id}?w=800&h=600&fit=crop&auto=format
const archetypeImages: Record<string, string> = {
  // ============================================
  // STRENGTH & MUSCLE
  // ============================================
  'bodybuilder': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&h=600&fit=crop&auto=format',
  'powerlifter': 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&h=600&fit=crop&auto=format',
  'strongman': 'https://images.unsplash.com/photo-1534368420009-621bfab424a8?w=800&h=600&fit=crop&auto=format',
  'functional': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&auto=format',
  'kettlebell-specialist': 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=800&h=600&fit=crop&auto=format',
  'arm-wrestler': 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=800&h=600&fit=crop&auto=format',
  'physique-competitor': 'https://images.unsplash.com/photo-1583454155184-870a1f63aebc?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // COMBAT & MARTIAL ARTS
  // ============================================
  'martial-artist': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=600&fit=crop&auto=format',
  'boxing': 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=600&fit=crop&auto=format',
  'wrestling': 'https://images.unsplash.com/photo-1588700783838-4c3c5b50d3f3?w=800&h=600&fit=crop&auto=format',
  'mma': 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800&h=600&fit=crop&auto=format',
  'judo': 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800&h=600&fit=crop&auto=format',
  'karate': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=600&fit=crop&auto=format',
  'taekwondo': 'https://images.unsplash.com/photo-1598518619776-eae3f8a34eac?w=800&h=600&fit=crop&auto=format',
  'krav-maga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format',
  'fencing': 'https://images.unsplash.com/photo-1544989164-31dc3c645987?w=800&h=600&fit=crop&auto=format',
  'brazilian-jiu-jitsu': 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800&h=600&fit=crop&auto=format',
  'muay-thai': 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // MOVEMENT & AGILITY
  // ============================================
  'gymnast': 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop&auto=format',
  'crossfit': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'dancer': 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&h=600&fit=crop&auto=format',
  'pole-fitness': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&auto=format',
  'flexibility-specialist': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format',
  'acrobat': 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop&auto=format',
  'calisthenics': 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // ENDURANCE & CARDIO
  // ============================================
  'runner': 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=600&fit=crop&auto=format',
  'swimmer': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop&auto=format',
  'cyclist': 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&h=600&fit=crop&auto=format',
  'ultra-runner': 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=600&fit=crop&auto=format',
  'marathon-runner': 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&h=600&fit=crop&auto=format',
  'speed-skater': 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop&auto=format',
  'triathlete': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop&auto=format',
  'competitive-swimmer': 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&h=600&fit=crop&auto=format',
  'rower': 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // ADVENTURE & OUTDOOR
  // ============================================
  'climber': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&h=600&fit=crop&auto=format',
  'skier': 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&h=600&fit=crop&auto=format',
  'snowboarder': 'https://images.unsplash.com/photo-1478641300939-0ec5188d3f0a?w=800&h=600&fit=crop&auto=format',
  'kayaker': 'https://images.unsplash.com/photo-1545477332-d6d4a2277c81?w=800&h=600&fit=crop&auto=format',
  'scuba-diver': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop&auto=format',
  'trail-runner': 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&h=600&fit=crop&auto=format',
  'mountaineer': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&auto=format',
  'surfer': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&h=600&fit=crop&auto=format',
  'hiker': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop&auto=format',
  'obstacle-course': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop&auto=format',
  'obstacle-course-racer': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop&auto=format',
  'rock-climber': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&h=600&fit=crop&auto=format',
  'paddleboard': 'https://images.unsplash.com/photo-1526188717906-ab4a2f949f48?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // TEAM SPORTS
  // ============================================
  'baseball': 'https://images.unsplash.com/photo-1508344928928-7165b0a59804?w=800&h=600&fit=crop&auto=format',
  'tennis': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop&auto=format',
  'volleyball': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop&auto=format',
  'lacrosse': 'https://images.unsplash.com/photo-1494919997080-ba9af74ab0f0?w=800&h=600&fit=crop&auto=format',
  'golf': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop&auto=format',
  'cricket': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=600&fit=crop&auto=format',
  'football': 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=600&fit=crop&auto=format',
  'basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop&auto=format',
  'soccer': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop&auto=format',
  'hockey': 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&h=600&fit=crop&auto=format',
  'rugby': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // MILITARY & TACTICAL
  // ============================================
  'military': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'army': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'marine': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'navy': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'air-force': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'special-forces': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'national-guard': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'space-force': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'coast-guard': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // FIRST RESPONDERS
  // ============================================
  'firefighter': 'https://images.unsplash.com/photo-1582483879529-e4d23bf9e21a?w=800&h=600&fit=crop&auto=format',
  'police': 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=800&h=600&fit=crop&auto=format',
  'ems': 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=800&h=600&fit=crop&auto=format',
  'paramedic': 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=800&h=600&fit=crop&auto=format',
  'corrections-officer': 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=800&h=600&fit=crop&auto=format',
  'border-patrol': 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=800&h=600&fit=crop&auto=format',
  'secret-service': 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=800&h=600&fit=crop&auto=format',
  'park-ranger': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop&auto=format',
  'search-rescue': 'https://images.unsplash.com/photo-1582483879529-e4d23bf9e21a?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // OCCUPATIONAL FITNESS
  // ============================================
  'construction-worker': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&auto=format',
  'warehouse-worker': 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=600&fit=crop&auto=format',
  'healthcare-worker': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&auto=format',
  'lineman': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop&auto=format',
  'tradesperson': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop&auto=format',
  'pilot': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&h=600&fit=crop&auto=format',
  'truck-driver': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=600&fit=crop&auto=format',
  'delivery-driver': 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // REHABILITATION & WELLNESS
  // ============================================
  'senior': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format',
  'prenatal': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&auto=format',
  'postnatal': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&auto=format',
  'rehab': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format',
  'yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format',
  'pilates': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&auto=format',

  // ============================================
  // GENERAL & DEFAULT
  // ============================================
  'general': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format',
  'beginner': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&auto=format',
};

// Default image for archetypes without a specific image
const defaultImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&auto=format';

export async function up() {
  log.info('Starting archetype images migration...');

  // Get all existing archetypes from identities table
  const archetypes = await db.query<{ id: string }>(`
    SELECT id FROM identities
  `);

  log.info(`Found ${archetypes.rowCount} archetypes to update`);

  let updated = 0;
  let skipped = 0;

  for (const archetype of archetypes.rows) {
    const imageUrl = archetypeImages[archetype.id] || defaultImage;

    try {
      await db.query(
        `UPDATE identities SET image_url = $1 WHERE id = $2`,
        [imageUrl, archetype.id]
      );
      updated++;
    } catch (err) {
      log.warn(`Failed to update image for archetype ${archetype.id}:`, err);
      skipped++;
    }
  }

  log.info(`Updated ${updated} archetypes with images, skipped ${skipped}`);

  // Log archetypes that got the default image (might need specific images later)
  const withDefault: string[] = [];
  for (const archetype of archetypes.rows) {
    if (!archetypeImages[archetype.id]) {
      withDefault.push(archetype.id);
    }
  }

  if (withDefault.length > 0) {
    log.info(`Archetypes using default image (${withDefault.length}): ${withDefault.join(', ')}`);
  }

  log.info('Archetype images migration completed');
}

export async function down() {
  log.info('Rolling back archetype images migration...');

  await db.query(`
    UPDATE identities SET image_url = NULL
  `);

  log.info('Archetype images rollback completed');
}
