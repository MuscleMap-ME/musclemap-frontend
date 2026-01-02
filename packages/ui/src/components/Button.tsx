import { styled, Stack, Text, GetProps } from '@tamagui/core';
import { forwardRef } from 'react';

const ButtonFrame = styled(Stack, {
  name: 'Button',
  tag: 'button',
  role: 'button',
  focusable: true,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$4',
  borderRadius: '$4',
  cursor: 'pointer',
  userSelect: 'none',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        hoverStyle: {
          backgroundColor: '$primaryHover',
        },
        pressStyle: {
          opacity: 0.9,
        },
      },
      secondary: {
        backgroundColor: '$card',
        borderWidth: 1,
        borderColor: '$borderColor',
        hoverStyle: {
          backgroundColor: '$cardHover',
        },
        pressStyle: {
          opacity: 0.9,
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
        pressStyle: {
          opacity: 0.9,
        },
      },
      danger: {
        backgroundColor: '$error',
        hoverStyle: {
          opacity: 0.9,
        },
        pressStyle: {
          opacity: 0.8,
        },
      },
      success: {
        backgroundColor: '$success',
        hoverStyle: {
          opacity: 0.9,
        },
        pressStyle: {
          opacity: 0.8,
        },
      },
    },

    size: {
      sm: {
        height: 32,
        paddingHorizontal: '$3',
      },
      md: {
        height: 44,
        paddingHorizontal: '$4',
      },
      lg: {
        height: 52,
        paddingHorizontal: '$5',
      },
    },

    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
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

const ButtonText = styled(Text, {
  name: 'ButtonText',
  userSelect: 'none',
  color: '$color',
  fontWeight: '600',

  variants: {
    variant: {
      primary: {
        color: '#ffffff',
      },
      secondary: {
        color: '$color',
      },
      ghost: {
        color: '$color',
      },
      danger: {
        color: '#ffffff',
      },
      success: {
        color: '#ffffff',
      },
    },

    size: {
      sm: {
        fontSize: 14,
      },
      md: {
        fontSize: 16,
      },
      lg: {
        fontSize: 18,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonProps = GetProps<typeof ButtonFrame> & {
  children?: React.ReactNode;
  isLoading?: boolean;
};

export const Button = forwardRef<typeof ButtonFrame, ButtonProps>(
  ({ children, variant, size, isLoading, disabled, ...props }, ref) => {
    return (
      <ButtonFrame
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Text color="$color">Loading...</Text>
        ) : typeof children === 'string' ? (
          <ButtonText variant={variant} size={size}>
            {children}
          </ButtonText>
        ) : (
          children
        )}
      </ButtonFrame>
    );
  }
);

Button.displayName = 'Button';
