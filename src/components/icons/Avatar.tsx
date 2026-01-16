/**
 * MuscleMap Avatar Component
 *
 * Generates unique, deterministic avatars using DiceBear.
 * Perfect for user profiles, leaderboards, and community features.
 *
 * Styles available:
 * - avataaars: Cartoon-style human avatars
 * - bottts: Robot avatars (great for AI/bot indicators)
 * - lorelei: Stylized portrait illustrations
 * - notionists: Clean, minimal avatar style
 * - thumbs: Thumbs up/down style
 * - shapes: Abstract geometric shapes
 * - rings: Circular ring patterns
 * - identicon: GitHub-style identicons
 */

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import {
  avataaars,
  bottts,
  lorelei,
  notionists,
  shapes,
  rings,
  identicon,
  thumbs,
  funEmoji,
  adventurer,
  adventurerNeutral,
  bigEars,
  bigEarsNeutral,
  bigSmile,
  croodles,
  croodlesNeutral,
  micah,
  miniavs,
  openPeeps,
  personas,
  pixelArt,
  pixelArtNeutral,
} from '@dicebear/collection';

// Available avatar styles
const avatarStyles = {
  avataaars,
  bottts,
  lorelei,
  notionists,
  shapes,
  rings,
  identicon,
  thumbs,
  funEmoji,
  adventurer,
  adventurerNeutral,
  bigEars,
  bigEarsNeutral,
  bigSmile,
  croodles,
  croodlesNeutral,
  micah,
  miniavs,
  openPeeps,
  personas,
  pixelArt,
  pixelArtNeutral,
};

// Size presets
const sizePresets = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 120,
  '3xl': 160,
};

// MuscleMap brand colors for avatar backgrounds
const brandBackgrounds = [
  '0066ff', // brand-blue-500
  '0052cc', // brand-blue-600
  '003d99', // brand-blue-700
  'ff3366', // brand-pulse-500
  'cc2952', // brand-pulse-600
  '3b82f6', // muscle-back
  '8b5cf6', // muscle-arms
  '22c55e', // muscle-legs
];

/**
 * Avatar component that generates unique avatars from seeds
 *
 * @param {Object} props
 * @param {string} props.seed - Unique identifier (user ID, email, etc.)
 * @param {string} props.style - Avatar style (default: 'avataaars')
 * @param {string|number} props.size - Size preset or pixel value
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.rounded - Use circular avatar (default: true)
 * @param {string} props.backgroundColor - Override background color
 * @param {Object} props.options - Additional DiceBear options
 */
export default function Avatar({
  seed = 'default',
  style = 'avataaars',
  size = 'md',
  className = '',
  rounded = true,
  backgroundColor,
  options = {},
  alt,
  ...props
}) {
  // Get pixel size
  const pixelSize = typeof size === 'number' ? size : sizePresets[size] || sizePresets.md;

  // Generate avatar SVG
  const avatarSvg = useMemo(() => {
    const selectedStyle = avatarStyles[style] || avatarStyles.avataaars;

    const avatar = createAvatar(selectedStyle, {
      seed: String(seed),
      size: pixelSize,
      backgroundColor: backgroundColor ? [backgroundColor.replace('#', '')] : brandBackgrounds,
      backgroundType: ['solid'],
      radius: rounded ? 50 : 0,
      ...options,
    });

    return avatar.toDataUri();
  }, [seed, style, pixelSize, rounded, backgroundColor, options]);

  return (
    <img
      src={avatarSvg}
      alt={alt || `Avatar for ${seed}`}
      width={pixelSize}
      height={pixelSize}
      className={`mm-avatar ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`.trim()}
      style={{
        width: pixelSize,
        height: pixelSize,
        objectFit: 'cover',
      }}
      {...props}
    />
  );
}

/**
 * Avatar with status indicator
 */
export function AvatarWithStatus({
  seed,
  style,
  size = 'md',
  status = 'offline', // 'online' | 'offline' | 'away' | 'busy'
  className = '',
  ...props
}) {
  const pixelSize = typeof size === 'number' ? size : sizePresets[size] || sizePresets.md;
  const indicatorSize = Math.max(8, pixelSize * 0.25);

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar seed={seed} style={style} size={size} {...props} />
      <span
        className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-void-base ${statusColors[status]}`}
        style={{
          width: indicatorSize,
          height: indicatorSize,
        }}
      />
    </div>
  );
}

/**
 * Avatar group for showing multiple users
 */
export function AvatarGroup({
  users = [], // Array of { id, name, ...avatarProps }
  max = 4,
  size = 'md',
  style = 'avataaars',
  className = '',
  ...props
}) {
  const pixelSize = typeof size === 'number' ? size : sizePresets[size] || sizePresets.md;
  const displayUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  return (
    <div className={`flex items-center ${className}`} {...props}>
      {displayUsers.map((user, index) => (
        <div
          key={user.id || index}
          className="relative ring-2 ring-void-base rounded-full"
          style={{
            marginLeft: index > 0 ? -(pixelSize * 0.3) : 0,
            zIndex: displayUsers.length - index,
          }}
        >
          <Avatar
            seed={user.id || user.name || String(index)}
            style={user.style || style}
            size={size}
            {...user}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className="relative flex items-center justify-center rounded-full bg-glass-white-10 text-text-secondary font-medium ring-2 ring-void-base"
          style={{
            marginLeft: -(pixelSize * 0.3),
            width: pixelSize,
            height: pixelSize,
            fontSize: pixelSize * 0.35,
            zIndex: 0,
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

/**
 * Editable avatar with upload capability
 */
export function EditableAvatar({
  seed,
  imageUrl, // If provided, shows uploaded image instead of generated avatar
  style = 'avataaars',
  size = 'xl',
  onImageChange,
  className = '',
  ...props
}) {
  const pixelSize = typeof size === 'number' ? size : sizePresets[size] || sizePresets.md;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
  };

  return (
    <div className={`relative inline-block group ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="User avatar"
          className="rounded-full object-cover"
          style={{ width: pixelSize, height: pixelSize }}
          {...props}
        />
      ) : (
        <Avatar seed={seed} style={style} size={size} {...props} />
      )}

      {onImageChange && (
        <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
          <span className="text-white text-xs font-medium">Change</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

/**
 * Get avatar URL for external use (e.g., in emails, OG images)
 */
export function getAvatarUrl(seed, style = 'avataaars', size = 128) {
  const selectedStyle = avatarStyles[style] || avatarStyles.avataaars;

  const avatar = createAvatar(selectedStyle, {
    seed: String(seed),
    size,
    backgroundColor: brandBackgrounds,
    backgroundType: ['solid'],
    radius: 50,
  });

  return avatar.toDataUri();
}

/**
 * Available style names for reference
 */
export const availableStyles = Object.keys(avatarStyles);

export { sizePresets as avatarSizes };
