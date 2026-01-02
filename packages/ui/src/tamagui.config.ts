/**
 * Tamagui Configuration
 *
 * Shared Tamagui config for MuscleMap apps.
 */
import { createTamagui, type TamaguiInternalConfig } from 'tamagui';
import { config } from '@tamagui/config/v3';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tamaguiConfig: TamaguiInternalConfig = createTamagui(config) as any;

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
