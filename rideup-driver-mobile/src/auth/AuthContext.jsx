import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { login as apiLogin } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('rideup-auth-expired', () => setUser(null));
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        const storedUser = raw ? JSON.parse(raw) : null;
        if (storedUser?.roles?.includes('DRIVER')) setUser(storedUser);
        else if (storedUser) await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
    return () => subscription.remove();
  }, []);

  async function doLogin(email, password) {
    const data = await apiLogin(email, password);
    if (!data.user?.roles?.includes('DRIVER')) throw new Error('Sai thông tin đăng nhập');
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function saveSession(data) {
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function doLogout() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    setUser(null);
  }

  /**
   * Merge patch vào user hiện tại + persist xuống AsyncStorage.
   * Dùng sau khi PATCH /users/me hoặc upload avatar.
   */
  async function updateUser(patch) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      AsyncStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }

  const isDriver = () => user?.roles?.includes('DRIVER');

  return (
    <AuthContext.Provider value={{ user, loading, doLogin, saveSession, doLogout, updateUser, isDriver }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);