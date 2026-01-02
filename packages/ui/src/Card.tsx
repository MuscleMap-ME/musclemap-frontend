/**
 * Card Component
 *
 * Cross-platform card container with MuscleMap styling.
 */
import { Card as TamaguiCard, styled, YStack } from 'tamagui';

export const Card = styled(TamaguiCard, {
  name: 'Card',
  backgroundColor: '$background',
  borderRadius: '$4',
  padding: '$4',

  variants: {
    variant: {
      elevated: {
        elevate: true,
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      outlined: {
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      filled: {
        backgroundColor: '$gray2',
      },
    },
    interactive: {
      true: {
        hoverStyle: {
          backgroundColor: '$gray3',
        },
        pressStyle: {
          backgroundColor: '$gray4',
          scale: 0.98,
        },
        cursor: 'pointer',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'elevated',
  },
});

export const CardHeader = styled(YStack, {
  name: 'CardHeader',
  paddingBottom: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
  marginBottom: '$3',
});

export const CardContent = styled(YStack, {
  name: 'CardContent',
  space: '$2',
});

export const CardFooter = styled(YStack, {
  name: 'CardFooter',
  paddingTop: '$3',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
  marginTop: '$3',
});

export type CardProps = React.ComponentProps<typeof Card>;
