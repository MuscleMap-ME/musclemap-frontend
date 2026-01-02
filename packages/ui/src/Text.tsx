/**
 * Text Components
 *
 * Cross-platform typography components with MuscleMap styling.
 */
import { styled, Text as TamaguiText, H1 as TamaguiH1, H2 as TamaguiH2, H3 as TamaguiH3, Paragraph as TamaguiParagraph } from 'tamagui';

export const Text = styled(TamaguiText, {
  name: 'Text',
  color: '$color',

  variants: {
    variant: {
      default: {},
      muted: {
        color: '$gray11',
      },
      accent: {
        color: '$blue10',
      },
      success: {
        color: '$green10',
      },
      warning: {
        color: '$yellow10',
      },
      error: {
        color: '$red10',
      },
    },
    weight: {
      regular: {
        fontWeight: '400',
      },
      medium: {
        fontWeight: '500',
      },
      semibold: {
        fontWeight: '600',
      },
      bold: {
        fontWeight: '700',
      },
    },
    align: {
      left: {
        textAlign: 'left',
      },
      center: {
        textAlign: 'center',
      },
      right: {
        textAlign: 'right',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
    weight: 'regular',
    align: 'left',
  },
});

export const H1 = styled(TamaguiH1, {
  name: 'H1',
});

export const H2 = styled(TamaguiH2, {
  name: 'H2',
});

export const H3 = styled(TamaguiH3, {
  name: 'H3',
});

export const Paragraph = styled(TamaguiParagraph, {
  name: 'Paragraph',
  color: '$gray11',
});

export const Label = styled(TamaguiText, {
  name: 'Label',
  fontSize: '$3',
  fontWeight: '500',
  color: '$gray11',
});

export const Caption = styled(TamaguiText, {
  name: 'Caption',
  fontSize: '$2',
  color: '$gray10',
});

export type TextProps = React.ComponentProps<typeof Text>;
