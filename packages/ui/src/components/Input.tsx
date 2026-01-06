import { styled, Stack, Text, GetProps, Input as TamaguiInput } from '@tamagui/core';
import { forwardRef } from 'react';

const InputFrame = styled(TamaguiInput, {
  name: 'Input',
  backgroundColor: '$backgroundStrong',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$4',
  paddingHorizontal: '$4',
  color: '$color',
  fontSize: 16,
  fontFamily: '$body',
  placeholderTextColor: '$placeholderColor',

  focusStyle: {
    borderColor: '$borderColorFocus',
    outlineWidth: 0,
  },

  hoverStyle: {
    borderColor: '$borderColorHover',
  },

  variants: {
    size: {
      sm: {
        height: 36,
        fontSize: 14,
        paddingHorizontal: '$3',
      },
      md: {
        height: 44,
        fontSize: 16,
        paddingHorizontal: '$4',
      },
      lg: {
        height: 52,
        fontSize: 18,
        paddingHorizontal: '$5',
      },
    },

    error: {
      true: {
        borderColor: '$error',
        focusStyle: {
          borderColor: '$error',
        },
      },
    },

    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
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
    fullWidth: true,
  },
});

const InputContainer = styled(Stack, {
  name: 'InputContainer',
  gap: '$1',
});

const InputLabel = styled(Text, {
  name: 'InputLabel',
  fontSize: 14,
  fontWeight: '500',
  color: '$color',
  marginBottom: '$1',
});

const InputError = styled(Text, {
  name: 'InputError',
  fontSize: 12,
  color: '$error',
  marginTop: '$1',
});

export type InputProps = GetProps<typeof InputFrame> & {
  label?: string;
  errorMessage?: string;
};

export const Input = forwardRef<typeof InputFrame, InputProps>(
  ({ label, errorMessage, error, ...props }, ref) => {
    const hasError = !!errorMessage || error;

    if (!label && !errorMessage) {
      return <InputFrame ref={ref} error={hasError} {...props} />;
    }

    return (
      <InputContainer>
        {label && <InputLabel>{label}</InputLabel>}
        <InputFrame ref={ref} error={hasError} {...props} />
        {errorMessage && <InputError>{errorMessage}</InputError>}
      </InputContainer>
    );
  }
);

Input.displayName = 'Input';

export { InputFrame, InputLabel, InputError, InputContainer };
