import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </SafeAreaProvider>
    );
}
