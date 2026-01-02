/**
 * Button Component
 *
 * Cross-platform button with MuscleMap styling.
 */
import { Button as TamaguiButton, styled } from 'tamagui';

export const Button = styled(TamaguiButton, {
  name: 'Button',

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
        },
      },
    },
    size: {
      sm: {
        height: 32,
        paddingHorizontal: '$3',
        fontSize: '$3',
      },
      md: {
        height: 40,
        paddingHorizontal: '$4',
        fontSize: '$4',
      },
      lg: {
        height: 48,
        paddingHorizontal: '$5',
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
