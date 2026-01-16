import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { H1, P } from '../../components/ui/typography';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await authService.signIn({
                email,
                password,
            });
            // Navigation is handled by Index/Layout check or manual replace
            router.replace('/(app)/dashboard');
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    }

    // Disable Sign Up for local DB unless we implement it
    async function signUpWithEmail() {
        Alert.alert('Local Mode', 'Contact administrator to create an account.');
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
                <View className="items-center mb-8">
                    <H1 className="text-primary mb-2">HRD System (Local)</H1>
                    <P className="text-muted-foreground text-center">
                        Offline Database Mode
                    </P>
                </View>

                <Card className="w-full max-w-md self-center">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the system
                            Start with: admin@company.com / admin123
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <View>
                            <Input
                                label="Email"
                                placeholder="email@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                        <View>
                            <Input
                                label="Password"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View className="pt-4 space-y-2">
                            <Button
                                label={loading ? 'Loading...' : 'Sign In'}
                                onPress={signInWithEmail}
                                disabled={loading}
                            />
                            <Button
                                variant="outline"
                                label="Sign Up"
                                onPress={signUpWithEmail}
                                disabled={loading}
                            />
                        </View>
                    </CardContent>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
