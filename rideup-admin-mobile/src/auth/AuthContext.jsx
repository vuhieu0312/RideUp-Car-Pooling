import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('adminUser');
        if (raw) setUser(JSON.parse(raw));
      } catch {} finally { setLoading(false); }
    })();
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

import { login } from '../api/api';
export const useAuth = () => useContext(AuthContext);