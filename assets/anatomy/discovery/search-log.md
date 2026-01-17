# Anatomy Asset Discovery - Search Log

## Search Session: January 17, 2025

### Search Queries Executed

| # | Query | Results Reviewed | Key Findings |
|---|-------|------------------|--------------|
| 1 | `site:sketchfab.com "human anatomy" "CC0" OR "CC-BY" downloadable` | 10+ | Found Z-Anatomy collection, mohamedhussien anatomy model, CC0 materials |
| 2 | `site:sketchfab.com "muscle anatomy" 3D model free download` | 10+ | Found Ruslan Gadzhiev anatomy studies, CharacterZone muscular model |
| 3 | `site:sketchfab.com "male body" anatomy 3D rigged model` | 10+ | Found Niclas basemesh (both sexes), Malbeasy base mesh, multiple rigged options |
| 4 | `site:sketchfab.com "female body" anatomy 3D rigged model` | 10+ | Found camilooh rigged female, same Niclas basemesh, 3DDisco animated pack |
| 5 | `site:sketchfab.com "muscular system" separate muscles 3D` | 10+ | Found Simplified Male Muscular System, 3D4SCI professional model |
| 6 | `site:turbosquid.com human anatomy 3D model muscles` | 10+ | Body Muscle Anatomy with 136 parts, various free/paid options |
| 7 | `site:cgtrader.com anatomical model muscles individual` | 10+ | Male Muscular System with separate muscle OBJ, head anatomy muscles |
| 8 | `Z-Anatomy open source 3D human model` | 10+ | Found GitHub repo, itch.io app, Sketchfab collection - CC-BY-SA-4.0 |
| 9 | `Quaternius human body 3D model free CC0` | 10+ | Stylized low-poly humans, not anatomically detailed |
| 10 | `BodyParts3D download GLTF GLB anatomy` | 10+ | Original BodyParts3D is OBJ, Z-Anatomy provides Blender version |
| 11 | `poly.pizza human anatomy body muscles` | 5+ | Limited anatomical models, mostly stylized characters |
| 12 | `ReadyPlayerMe avatar body 3D model rigged` | 10+ | Good rigged avatars but not anatomically detailed |
| 13 | `itch.io 3D anatomy model human body muscles` | 10+ | Z-Anatomy is the main anatomical option on itch.io |
| 14 | `free3d.com human anatomy muscular system` | 10+ | Several free options with various licenses |
| 15 | `MakeHuman 3D body model rigged GLTF` | 10+ | Open source body generator, needs conversion to GLB |

### Key Findings Summary

#### Best Free Options (Priority 1)

1. **Z-Anatomy (GitHub)** - CC-BY-SA-4.0
   - Open source, individual muscle meshes
   - Based on BodyParts3D medical dataset
   - Requires Blender export to GLB
   - Comprehensive anatomical coverage

2. **Human Male/Female Basemesh Rigged (Sketchfab)** - CC-BY-4.0
   - Both male and female included
   - Fully rigged, T-pose
   - Good base body for overlay

3. **Male/Female Muscular System Anatomy Study (Sketchfab)** - CC-BY-4.0
   - By Ruslan Gadzhiev
   - High quality ZBrush sculpts
   - Need to verify mesh separation

4. **Male Base Muscular Anatomy (Sketchfab)** - CC-BY-4.0
   - By CharacterZone
   - Low-poly, AR/VR ready
   - Good for real-time rendering

#### Best Paid Options (Within $200 Budget)

1. **3D Musculoskeletal System Anatomy (Sketchfab)** - $99
   - Professional grade by 3D4SCI
   - ~1M triangles, 4K textures
   - Objects grouped and named separately
   - Organized by body region

2. **Male Muscular System (CGTrader)** - $29
   - Includes `musculature_separate_muscles.obj`
   - Named individual muscles
   - Skeleton also included

3. **Body Muscle Anatomy (TurboSquid)** - $49
   - 136 separate parts
   - Each muscle is separate mesh

### License Analysis

| License | Count | Commercial Use | Attribution Required |
|---------|-------|----------------|---------------------|
| CC-BY-4.0 | 8 | Yes | Yes |
| CC-BY-SA-4.0 | 2 | Yes | Yes (ShareAlike) |
| CC0-1.0 | 1 | Yes | No |
| Royalty-Free | 3 | Yes | Per vendor terms |
| Unknown/TBD | 3 | Needs verification | Needs verification |

### Challenges Encountered

1. **Separate Muscle Meshes** - Most free models are single unified meshes. Finding individual muscles as separate selectable objects is rare in free assets.

2. **License Ambiguity** - Some Sketchfab models don't clearly display their license on the page preview; need to check download page.

3. **Format Availability** - Many source models are in ZBrush (.ztl) or other proprietary formats requiring conversion.

4. **Female Anatomy** - Fewer options available compared to male anatomy models.

5. **Triangle Budget** - High-detail anatomical models often exceed 100K triangles; will need aggressive LOD generation.

### Recommendations

1. **Immediate Downloads (Auto-acquirable, CC-BY/CC0):**
   - Human Male/Female Basemesh Rigged (Niclas)
   - Male Body Muscular System (Ruslan Gadzhiev)
   - Female Body Muscular System (Ruslan Gadzhiev)
   - Male Base Muscular Anatomy (CharacterZone)
   - Z-Anatomy from GitHub

2. **Manual Queue (Login/Purchase Required):**
   - 3D Musculoskeletal System ($99) - Best separate muscle option
   - Male Muscular System CGTrader ($29) - Named separate meshes
   - Simplified Male Muscular System - Verify license first

3. **Fallback Strategy:**
   - If separate muscle meshes unavailable for free, purchase 3D4SCI model ($99)
   - Use Z-Anatomy as base for muscle overlay layer

### Files Generated

- `curated-sources.csv` - 17 candidate assets with full metadata
- `search-log.md` - This file

### Next Steps

1. Download auto-acquirable assets from Sketchfab
2. Clone Z-Anatomy GitHub repository
3. Create manual queue for login-required and paid assets
4. Begin conversion pipeline with downloaded assets
