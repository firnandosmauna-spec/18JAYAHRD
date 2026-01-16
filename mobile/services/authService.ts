import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../lib/database';

export interface SignInData {
    email: string;
    password: string;
}

export class AuthService {
    async signIn(data: SignInData) {
        try {
            const db = await getDB();

            const result = await db.getFirstAsync<{
                id: string;
                email: string;
                name: string;
                role: string;
                modules: string;
            }>(
                'SELECT * FROM profiles WHERE email = ? AND password = ?',
                [data.email, data.password]
            );

            if (!result) {
                throw new Error('Invalid email or password');
            }

            const user = {
                ...result,
                modules: JSON.parse(result.modules)
            };

            // Persist session
            await AsyncStorage.setItem('user_session', JSON.stringify(user));

            return { user, session: { access_token: 'local-token', user } };
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        await AsyncStorage.removeItem('user_session');
    }

    async getUser() {
        const session = await AsyncStorage.getItem('user_session');
        return session ? JSON.parse(session) : null;
    }
}

export const authService = new AuthService();
