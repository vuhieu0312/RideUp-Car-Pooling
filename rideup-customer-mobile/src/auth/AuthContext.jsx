import { createContext, useContext, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session từ AsyncStorage khi app start
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('rideup-auth-expired', () => setUser(null));
    (async () => {
      try {var _storedUser$roles;
        const raw = await AsyncStorage.getItem('user');
        const storedUser = raw ? JSON.parse(raw) : null;
        if (storedUser != null && (_storedUser$roles = storedUser.roles) != null && _storedUser$roles.includes('CUSTOMER')) setUser(storedUser);else
        if (storedUser) await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      } catch {

        // ignore
      } finally {setLoading(false);
      }
    })();
    return () => subscription.remove();
  }, []);

  async function doLogin(email, password) {var _data$user;
    const data = await apiLogin(email, password);
    if (!((_data$user = data.user) != null && (_data$user = _data$user.roles) != null && _data$user.includes('CUSTOMER'))) throw new Error('Sai thông tin đăng nhập');
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function doLogout() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    setUser(null);
  }

  /** Merge patch vào user hiện tại + persist xuống AsyncStorage. */
  async function updateUser(patch) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      AsyncStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }

  const isCustomer = () => {var _user$roles;return user == null || (_user$roles = user.roles) == null ? void 0 : _user$roles.includes('CUSTOMER');};

  return (
    <AuthContext.Provider value={{ user, loading, doLogin, doLogout, updateUser, isCustomer }}>
      {children}
    </AuthContext.Provider>);

}

export const useAuth = () => useContext(AuthContext);