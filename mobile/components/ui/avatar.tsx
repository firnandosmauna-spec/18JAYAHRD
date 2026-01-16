import * as React from 'react';
import { View, Image, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface AvatarProps {
    source?: { uri?: string } | number; // Accept URI or local resource
    alt?: string;
    fallback?: string;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
}

const Avatar = ({ source, alt, fallback, className, size = 'default' }: AvatarProps) => {
    const [error, setError] = React.useState(false);

    const sizeClasses = {
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-14 w-14',
    };

    const hasSource = source && (typeof source === 'number' || (typeof source === 'object' && source.uri));

    return (
        <View
            className={cn(
                'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
                sizeClasses[size],
                className
            )}
        >
            {hasSource && !error ? (
                <Image
                    source={source as any}
                    className="h-full w-full"
                    onError={() => setError(true)}
                    accessibilityLabel={alt}
                />
            ) : (
                <View className="flex h-full w-full items-center justify-center bg-muted">
                    <Text className="text-muted-foreground font-medium">
                        {fallback || alt?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
            )}
        </View>
    );
};

export { Avatar };
