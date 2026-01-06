import { styled, Stack as TamaguiStack, GetProps } from '@tamagui/core';

export const Box = styled(TamaguiStack, {
  name: 'Box',
});

export const VStack = styled(TamaguiStack, {
  name: 'VStack',
  flexDirection: 'column',

  variants: {
    gap: {
      sm: { gap: '$2' },
      md: { gap: '$4' },
      lg: { gap: '$6' },
    },
    centered: {
      true: {
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,
});

export const HStack = styled(TamaguiStack, {
  name: 'HStack',
  flexDirection: 'row',
  alignItems: 'center',

  variants: {
    gap: {
      sm: { gap: '$2' },
      md: { gap: '$4' },
      lg: { gap: '$6' },
    },
    centered: {
      true: {
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    spread: {
      true: {
        justifyContent: 'space-between',
      },
    },
    wrap: {
      true: {
        flexWrap: 'wrap',
      },
    },
  } as const,
});

export const Center = styled(TamaguiStack, {
  name: 'Center',
  alignItems: 'center',
  justifyContent: 'center',
});

export const Spacer = styled(TamaguiStack, {
  name: 'Spacer',
  flex: 1,
});

export type BoxProps = GetProps<typeof Box>;
export type VStackProps = GetProps<typeof VStack>;
export type HStackProps = GetProps<typeof HStack>;
export type CenterProps = GetProps<typeof Center>;
