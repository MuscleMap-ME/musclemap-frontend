import { styled, Stack, GetProps } from '@tamagui/core';

export const Card = styled(Stack, {
  name: 'Card',
  backgroundColor: '$card',
  borderRadius: '$4',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    hoverable: {
      true: {
        hoverStyle: {
          backgroundColor: '$cardHover',
        },
        cursor: 'pointer',
      },
    },

    pressable: {
      true: {
        hoverStyle: {
          backgroundColor: '$cardHover',
        },
        pressStyle: {
          opacity: 0.9,
          scale: 0.99,
        },
        cursor: 'pointer',
      },
    },

    elevated: {
      true: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    },

    size: {
      sm: {
        padding: '$3',
      },
      md: {
        padding: '$4',
      },
      lg: {
        padding: '$6',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

export type CardProps = GetProps<typeof Card>;

export const CardHeader = styled(Stack, {
  name: 'CardHeader',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '$3',
});

export const CardContent = styled(Stack, {
  name: 'CardContent',
  gap: '$2',
});

export const CardFooter = styled(Stack, {
  name: 'CardFooter',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: '$3',
  gap: '$2',
});
