/**
 * Input Component
 *
 * Cross-platform text input with MuscleMap styling.
 */
import { Input as TamaguiInput, styled, XStack, Text, YStack } from 'tamagui';
import type { ReactNode } from 'react';

export const Input = styled(TamaguiInput, {
  name: 'Input',
  borderWidth: 1,
  borderColor: '$gray7',
  borderRadius: '$3',
  paddingHorizontal: '$3',
  backgroundColor: '$background',

  focusStyle: {
    borderColor: '$blue8',
    outlineWidth: 0,
  },

  variants: {
    size: {
      sm: {
        height: 36,
        fontSize: '$3',
      },
      md: {
        height: 44,
        fontSize: '$4',
      },
      lg: {
        height: 52,
        fontSize: '$5',
      },
    },
    status: {
      error: {
        borderColor: '$red8',
        focusStyle: {
          borderColor: '$red9',
        },
      },
      success: {
        borderColor: '$green8',
        focusStyle: {
          borderColor: '$green9',
        },
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

interface InputFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function InputField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  children,
}: InputFieldProps) {
  return (
    <YStack space="$1">
      {label && (
        <Text fontSize="$3" fontWeight="500" color="$gray11">
          {label}
        </Text>
      )}
      <XStack alignItems="center" position="relative">
        {leftIcon && (
          <XStack position="absolute" left="$3" zIndex={1}>
            {leftIcon}
          </XStack>
        )}
        {children}
        {rightIcon && (
          <XStack position="absolute" right="$3" zIndex={1}>
            {rightIcon}
          </XStack>
        )}
      </XStack>
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text fontSize="$2" color="$gray10">
          {hint}
        </Text>
      )}
    </YStack>
  );
}

export type InputProps = React.ComponentProps<typeof Input>;
