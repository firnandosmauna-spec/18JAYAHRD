import { useState } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Building2, Mail, Lock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { H1, P } from '../../components/ui/typography';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function signInWithEmail() {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('Error', 'Mohon isi email dan password');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting login for:', trimmedEmail);
            const { data: { session }, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword,
            });

            if (error) {
                console.error('Supabase Auth Error Detail:', JSON.stringify(error, null, 2));
                throw error;
            }
            if (!session) throw new Error('Sesi tidak ditemukan');

            // Check user role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('Profile Fetch Error Detail:', JSON.stringify(profileError, null, 2));
                throw new Error('Gagal memverifikasi profil pengguna');
            }

            // Allow both 'staff' and 'admin'
            if (profile?.role !== 'staff' && profile?.role !== 'admin') {
                console.log('Role Mismatch:', profile?.role);
                await supabase.auth.signOut();
                Alert.alert('Akses Ditolak', 'Aplikasi ini khusus untuk Staff/Karyawan.');
                return;
            }

            router.replace('/(app)/dashboard');
        } catch (error: any) {
            console.error('Detailed Login Error:', error);
            const errorMessage = error.message || 'Email atau password salah';
            Alert.alert('Login Gagal', `${errorMessage}\n\n(Error: ${error.code || 'unknown'})`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-[#FAFAF9]"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 80, paddingHorizontal: 20, paddingBottom: 40 }}>
                {/* Branding Section */}
                <View className="items-center mb-8 gap-3">
                    <View className="w-16 h-16 bg-[#1A2332] rounded-2xl items-center justify-center shadow-sm">
                        <Building2 size={32} color="white" />
                    </View>
                    <View className="items-center">
                        <H1 className="text-[#1C1C1E] font-bold text-3xl">18 Jaya HRD System</H1>
                        <P className="text-gray-500 text-center mt-1">
                            Portal Mandiri Karyawan 18 Jaya
                        </P>
                    </View>
                </View>

                {/* Login Form */}
                <Card className="w-full max-w-md self-center border-gray-200 shadow-sm bg-white">
                    <CardHeader className="items-center pb-2">
                        <CardTitle className="text-2xl text-[#1C1C1E]">Selamat Datang</CardTitle>
                        <CardDescription className="text-center">
                            Masuk ke akun Anda untuk melanjutkan
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <View>
                            <Input
                                label="Email"
                                placeholder="nama@perusahaan.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                startIcon={<Mail size={20} color="#9CA3AF" />}
                                className="bg-white border-gray-200 focus:border-[#0D7377]"
                            />
                        </View>
                        <View>
                            <Input
                                label="Password"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                startIcon={<Lock size={20} color="#9CA3AF" />}
                                className="bg-white border-gray-200 focus:border-[#0D7377]"
                                endIcon={
                                    showPassword ? (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    ) : (
                                        <Eye size={20} color="#9CA3AF" />
                                    )
                                }
                                onEndIconPress={() => setShowPassword(!showPassword)}
                            />
                        </View>

                        <View className="pt-2">
                            <Button
                                onPress={signInWithEmail}
                                disabled={loading}
                                className="w-full bg-[#0D7377] active:bg-[#095456] h-12"
                            >
                                <Text className="text-white font-bold text-base">
                                    {loading ? 'Memuat...' : 'Masuk'}
                                </Text>
                            </Button>
                        </View>
                    </CardContent>
                </Card>

                {/* Footer */}
                <View className="mt-8 items-center">
                    <P className="text-gray-400 text-xs">
                        © 2026 SHAbab_studio
                    </P>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
