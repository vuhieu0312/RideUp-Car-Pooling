import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { login } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('rideup-auth-expired', () => setUser(null));
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('adminUser');
        const storedUser = raw ? JSON.parse(raw) : null;
        if (storedUser?.user?.roles?.includes('ADMIN')) setUser(storedUser);
        else if (storedUser) await AsyncStorage.multiRemove(['adminToken', 'adminUser']);
      } catch {} finally { setLoading(false); }
    })();
    return () => subscription.remove();
  }, []);

  async function doLogin(email, password) {
    const data = await login(email, password);
    if (!data?.user?.roles?.includes('ADMIN')) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }
    await AsyncStorage.setItem('adminToken', data.accessToken);
    await AsyncStorage.setItem('adminUser', JSON.stringify(data));
    setUser(data);
    return data;
  }

  async function doLogout() {
    await AsyncStorage.multiRemove(['adminToken', 'adminUser']);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, doLogin, doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);