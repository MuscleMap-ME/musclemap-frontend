/**
 * Button Component
 *
 * Cross-platform button with MuscleMap styling.
 *
 * TOUCHSCREEN-FIRST: All sizes meet minimum 44px (iOS) / 48px (Material) touch target.
 * Sizes have been increased from original to ensure accessibility:
 * - sm: was 32px, now 44px
 * - md: was 40px, now 48px
 * - lg: was 48px, now 56px
 */
import { Button as TamaguiButton, styled } from 'tamagui';

export const Button = styled(TamaguiButton, {
  name: 'Button',

  // TOUCHSCREEN-FIRST: Base touch-friendly styles
  userSelect: 'none',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$blue10',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$blue11',
        },
        pressStyle: {
          backgroundColor: '$blue9',
          scale: 0.98,
        },
      },
      secondary: {
        backgroundColor: '$gray4',
        color: '$gray12',
        hoverStyle: {
          backgroundColor: '$gray5',
        },
        pressStyle: {
          backgroundColor: '$gray6',
          scale: 0.98,
        },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$gray8',
        color: '$gray12',
        hoverStyle: {
          backgroundColor: '$gray3',
        },
        pressStyle: {
          backgroundColor: '$gray4',
          scale: 0.98,
        },
      },
      danger: {
        backgroundColor: '$red10',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$red11',
        },
        pressStyle: {
          backgroundColor: '$red9',
          scale: 0.98,
        },
      },
      success: {
        backgroundColor: '$green10',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$green11',
        },
        pressStyle: {
          backgroundColor: '$green9',
          scale: 0.98,
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$gray11',
        hoverStyle: {
          backgroundColor: '$gray3',
        },
        pressStyle: {
          backgroundColor: '$gray4',
          scale: 0.98,
        },
      },
    },
    size: {
      /**
       * TOUCHSCREEN-FIRST SIZES
       * All meet minimum 44px iOS / 48px Material touch target
       */
      sm: {
        height: 44,           // Was 32, increased for touch
        paddingHorizontal: '$4',
        fontSize: '$3',
      },
      md: {
        height: 48,           // Was 40, increased for touch
        paddingHorizontal: '$5',
        fontSize: '$4',
      },
      lg: {
        height: 56,           // Was 48, increased for touch
        paddingHorizontal: '$6',
        fontSize: '$5',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonProps = React.ComponentProps<typeof Button>;
