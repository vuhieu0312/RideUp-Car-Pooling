import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import TripSearchScreen from '../screens/TripSearchScreen';
import BookingCreateScreen from '../screens/BookingCreateScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';

const Stack = createNativeStackNavigator();

/**
 * Stack root:
 * - Khi chưa login → Auth stack (Login, Register)
 * - Khi đã login (CUSTOMER) → Main stack (Home, Search, Book, MyBookings)
 */
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="TripSearch" component={TripSearchScreen} />
          <Stack.Screen name="BookingCreate" component={BookingCreateScreen} />
          <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}