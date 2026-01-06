/**
 * Character Stats Card Component
 *
 * D&D-style character stats display with hexagonal radar visualization
 * and individual stat bars.
 */
import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import { YStack, XStack, Text, Card, H3, Progress } from 'tamagui';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import type { CharacterStats } from '@musclemap/client';

interface CharacterStatsCardProps {
  stats: CharacterStats;
  showRadar?: boolean;
  compact?: boolean;
}

// Stat metadata with colors and abbreviations
const STAT_META = {
  strength: { name: 'Strength', abbr: 'STR', color: '#FF3366', description: 'Raw lifting power' },
  constitution: { name: 'Constitution', abbr: 'CON', color: '#00CC66', description: 'Recovery & resilience' },
  dexterity: { name: 'Dexterity', abbr: 'DEX', color: '#FFB800', description: 'Movement skill' },
  power: { name: 'Power', abbr: 'PWR', color: '#FF6B00', description: 'Explosive force' },
  endurance: { name: 'Endurance', abbr: 'END', color: '#0066FF', description: 'Stamina' },
  vitality: { name: 'Vitality', abbr: 'VIT', color: '#9333EA', description: 'Overall health' },
} as const;

type StatKey = keyof typeof STAT_META;
const STAT_ORDER: StatKey[] = ['strength', 'constitution', 'dexterity', 'power', 'endurance', 'vitality'];

interface RadarChartProps {
  stats: CharacterStats;
  size: number;
}

function RadarChart({ stats, size }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.4;
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Calculate max stat for normalization
  const maxStat = Math.max(
    ...STAT_ORDER.map((key) => stats[key]),
    100 // Minimum scale of 100
  );

  // Calculate polygon points for the stats
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const angleStep = (2 * Math.PI) / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i - Math.PI / 2; // Start from top
      const statKey = STAT_ORDER[i];
      const value = stats[statKey] / maxStat;
      const radius = value * maxRadius;

      pts.push({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    }

    return pts;
  }, [stats, maxStat, center, maxRadius]);

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Axis endpoints
  const axisPoints = useMemo(() => {
    const pts: { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number; key: StatKey }[] = [];
    const angleStep = (2 * Math.PI) / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i - Math.PI / 2;
      pts.push({
        x1: center,
        y1: center,
        x2: center + maxRadius * Math.cos(angle),
        y2: center + maxRadius * Math.sin(angle),
        labelX: center + (maxRadius + 20) * Math.cos(angle),
        labelY: center + (maxRadius + 20) * Math.sin(angle),
        key: STAT_ORDER[i],
      });
    }

    return pts;
  }, [center, maxRadius]);

  return (
    <Svg width={size} height={size}>
      {/* Background level rings */}
      {levels.map((level) => {
        const pts: string[] = [];
        const angleStep = (2 * Math.PI) / 6;
        for (let i = 0; i < 6; i++) {
          const angle = angleStep * i - Math.PI / 2;
          const radius = level * maxRadius;
          pts.push(`${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`);
        }
        return (
          <Polygon
            key={level}
            points={pts.join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map(({ x1, y1, x2, y2, key }) => (
        <Line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth={1} />
      ))}

      {/* Stats polygon */}
      <Polygon
        points={polygonPoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth={2}
      />

      {/* Points on vertices */}
      {points.map((point, i) => (
        <Circle
          key={STAT_ORDER[i]}
          cx={point.x}
          cy={point.y}
          r={4}
          fill={STAT_META[STAT_ORDER[i]].color}
        />
      ))}

      {/* Labels */}
      {axisPoints.map(({ labelX, labelY, key }) => (
        <G key={`label-${key}`}>
          <SvgText
            x={labelX}
            y={labelY}
            fill={STAT_META[key].color}
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {STAT_META[key].abbr}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

interface StatBarProps {
  statKey: StatKey;
  value: number;
  maxValue: number;
}

function StatBar({ statKey, value, maxValue }: StatBarProps) {
  const meta = STAT_META[statKey];
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <YStack space="$1">
      <XStack justifyContent="space-between" alignItems="center">
        <XStack space="$2" alignItems="center">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: meta.color,
            }}
          />
          <Text fontSize="$3" fontWeight="600">
            {meta.abbr}
          </Text>
          <Text color="$gray11" fontSize="$2">
            {meta.name}
          </Text>
        </XStack>
        <Text fontWeight="bold" color={meta.color}>
          {value.toFixed(0)}
        </Text>
      </XStack>
      <Progress value={percentage} max={100}>
        <Progress.Indicator
          animation="bouncy"
          backgroundColor={meta.color}
        />
      </Progress>
    </YStack>
  );
}

export function CharacterStatsCard({
  stats,
  showRadar = true,
  compact = false,
}: CharacterStatsCardProps) {
  const { width } = Dimensions.get('window');
  const radarSize = Math.min(width - 80, 280);

  // Calculate max stat for bar scaling
  const maxStat = Math.max(
    ...STAT_ORDER.map((key) => stats[key]),
    100
  );

  // Display order: vitality first (overall), then others
  const displayOrder: StatKey[] = compact
    ? ['vitality', 'strength', 'endurance']
    : ['vitality', 'strength', 'constitution', 'dexterity', 'power', 'endurance'];

  return (
    <Card padding="$4" elevate>
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <H3>Character Stats</H3>
          {stats.lastCalculatedAt && (
            <Text color="$gray11" fontSize="$1">
              Updated {new Date(stats.lastCalculatedAt).toLocaleDateString()}
            </Text>
          )}
        </XStack>

        {showRadar && !compact && (
          <YStack alignItems="center">
            <RadarChart stats={stats} size={radarSize} />
          </YStack>
        )}

        <YStack space="$3">
          {displayOrder.map((key) => (
            <StatBar key={key} statKey={key} value={stats[key]} maxValue={maxStat * 1.2} />
          ))}
        </YStack>
      </YStack>
    </Card>
  );
}

export default CharacterStatsCard;
