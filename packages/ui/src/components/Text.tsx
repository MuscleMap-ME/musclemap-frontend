import { styled, Text as TamaguiText, GetProps } from '@tamagui/core';

export const Text = styled(TamaguiText, {
  name: 'Text',
  color: '$color',
  fontFamily: '$body',

  variants: {
    variant: {
      default: {},
      muted: {
        color: '$placeholderColor',
      },
      error: {
        color: '$error',
      },
      success: {
        color: '$success',
      },
      primary: {
        color: '$primary',
      },
    },

    size: {
      xs: { fontSize: 12, lineHeight: 16 },
      sm: { fontSize: 14, lineHeight: 20 },
      md: { fontSize: 16, lineHeight: 24 },
      lg: { fontSize: 18, lineHeight: 28 },
      xl: { fontSize: 20, lineHeight: 28 },
    },

    weight: {
      normal: { fontWeight: '400' },
      medium: { fontWeight: '500' },
      semibold: { fontWeight: '600' },
      bold: { fontWeight: '700' },
    },

    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    weight: 'normal',
  },
});

export const Heading = styled(TamaguiText, {
  name: 'Heading',
  color: '$color',
  fontFamily: '$heading',
  fontWeight: '700',

  variants: {
    level: {
      1: { fontSize: 36, lineHeight: 40 },
      2: { fontSize: 30, lineHeight: 36 },
      3: { fontSize: 24, lineHeight: 32 },
      4: { fontSize: 20, lineHeight: 28 },
      5: { fontSize: 18, lineHeight: 24 },
      6: { fontSize: 16, lineHeight: 24 },
    },

    align: {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    },
  } as const,

  defaultVariants: {
    level: 3,
  },
});

export const Label = styled(TamaguiText, {
  name: 'Label',
  color: '$color',
  fontSize: 14,
  fontWeight: '500',
  marginBottom: '$1',
});

export type TextProps = GetProps<typeof Text>;
export type HeadingProps = GetProps<typeof Heading>;
export type LabelProps = GetProps<typeof Label>;
