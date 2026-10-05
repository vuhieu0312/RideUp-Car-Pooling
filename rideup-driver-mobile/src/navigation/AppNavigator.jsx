import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DriverRegisterScreen from '../screens/DriverRegisterScreen';
import DriverStatusScreen from '../screens/DriverStatusScreen';
import HomeScreen from '../screens/HomeScreen';
import AllTripsScreen from '../screens/AllTripsScreen';
import TripCreateScreen from '../screens/TripCreateScreen';
import VehicleRegisterScreen from '../screens/VehicleRegisterScreen';
import VehicleListScreen from '../screens/VehicleListScreen';

const Stack = createNativeStackNavigator();

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
          <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DriverStatus" component={DriverStatusScreen} />
          <Stack.Screen name="AllTrips" component={AllTripsScreen} />
          <Stack.Screen name="TripCreate" component={TripCreateScreen} />
          <Stack.Screen name="VehicleRegister" component={VehicleRegisterScreen} />
          <Stack.Screen name="VehicleList" component={VehicleListScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}