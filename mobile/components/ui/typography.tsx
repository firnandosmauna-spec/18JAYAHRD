import * as React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { cn } from '../../lib/utils';

const H1 = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn(
            'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
            className
        )}
        {...props}
    />
));
H1.displayName = 'H1';

const H2 = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn(
            'scroll-m-20 border-b border-border pb-2 text-3xl font-semibold tracking-tight first:mt-0',
            className
        )}
        {...props}
    />
));
H2.displayName = 'H2';

const H3 = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn(
            'scroll-m-20 text-2xl font-semibold tracking-tight',
            className
        )}
        {...props}
    />
));
H3.displayName = 'H3';

const H4 = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn(
            'scroll-m-20 text-xl font-semibold tracking-tight',
            className
        )}
        {...props}
    />
));
H4.displayName = 'H4';

const P = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('leading-7 [&:not(:first-child)]:mt-6', className)}
        {...props}
    />
));
P.displayName = 'P';

const Lead = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-xl text-muted-foreground', className)}
        {...props}
    />
));
Lead.displayName = 'Lead';

const Large = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-lg font-semibold', className)}
        {...props}
    />
));
Large.displayName = 'Large';

const Small = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-sm font-medium leading-none', className)}
        {...props}
    />
));
Small.displayName = 'Small';

const Muted = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
Muted.displayName = 'Muted';

export { H1, H2, H3, H4, P, Lead, Large, Small, Muted };
