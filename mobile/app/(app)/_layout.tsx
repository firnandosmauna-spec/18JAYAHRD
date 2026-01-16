import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function AppLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            {/* Add other screens here */}
        </Stack>
    );
}
