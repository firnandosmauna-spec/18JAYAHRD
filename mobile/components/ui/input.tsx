import * as React from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { cn } from '../../lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    onEndIconPress?: () => void;
}

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
    ({ className, label, error, startIcon, endIcon, onEndIconPress, ...props }, ref) => {
        return (
            <View className="space-y-2">
                {label && (
                    <Text className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </Text>
                )}
                <View className="relative justify-center">
                    {startIcon && (
                        <View className="absolute left-3 z-10">
                            {startIcon}
                        </View>
                    )}
                    <TextInput
                        ref={ref}
                        className={cn(
                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                            error && 'border-destructive',
                            startIcon && 'pl-10', // Add padding left if start icon exists
                            endIcon && 'pr-10', // Add padding right if end icon exists
                            className
                        )}
                        placeholderTextColor="#9CA3AF"
                        {...props}
                    />
                    {endIcon && (
                        <TouchableOpacity
                            onPress={onEndIconPress}
                            className="absolute right-3"
                        >
                            {endIcon}
                        </TouchableOpacity>
                    )}
                </View>
                {/* Error text below */}
                {error && <Text className="text-sm font-medium text-destructive">{error}</Text>}
            </View>
        );
    }
);
Input.displayName = 'Input';

export { Input };
