import * as React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <View className="space-y-2">
                {label && (
                    <Text className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </Text>
                )}
                <TextInput
                    ref={ref}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-destructive',
                        className
                    )}
                    placeholderTextColor="#9CA3AF"
                    {...props}
                />
                {error && <Text className="text-sm font-medium text-destructive">{error}</Text>}
            </View>
        );
    }
);
Input.displayName = 'Input';

export { Input };
