import * as React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
    'flex-row items-center justify-center rounded-md',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                destructive: 'bg-destructive',
                outline: 'border border-input bg-background',
                secondary: 'bg-secondary',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

const buttonTextVariants = cva(
    'text-sm font-medium',
    {
        variants: {
            variant: {
                default: 'text-primary-foreground',
                destructive: 'text-destructive-foreground',
                outline: 'text-foreground',
                secondary: 'text-secondary-foreground',
                ghost: 'text-foreground',
                link: 'text-primary',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface ButtonProps
    extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
    label?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
    ({ className, variant, size, label, children, ...props }, ref) => {
        return (
            <TouchableOpacity
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            >
                {label ? (
                    <Text className={cn(buttonTextVariants({ variant }))}>
                        {label}
                    </Text>
                ) : (
                    React.Children.map(children, (child) => {
                        if (typeof child === 'string') {
                            return <Text className={cn(buttonTextVariants({ variant }))}>{child}</Text>;
                        }
                        return child;
                    })
                )}
            </TouchableOpacity>
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
