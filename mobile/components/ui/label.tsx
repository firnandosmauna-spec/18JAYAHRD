import * as React from 'react';
import { Text, View } from 'react-native';
import { cn } from '../../lib/utils';

// Simplified Label for React Native
const Label = React.forwardRef<Text, React.ComponentProps<typeof Text>>(
    ({ className, ...props }, ref) => (
        <Text
            ref={ref}
            className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className
            )}
            {...props}
        />
    )
);
Label.displayName = 'Label';

export { Label };
