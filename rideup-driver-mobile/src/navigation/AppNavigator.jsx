import { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { getDriverStatus } from '../api/api';
import LoginScreen from '../screens/LoginScreen';
import DriverRegisterScreen from '../screens/DriverRegisterScreen';
import DriverStatusScreen from '../screens/DriverStatusScreen';
import HomeScreen from '../screens/HomeScreen';
import AllTripsScreen from '../screens/AllTripsScreen';
import TripCreateScreen from '../screens/TripCreateScreen';
import VehicleRegisterScreen from '../screens/VehicleRegisterScreen';
import VehicleListScreen from '../screens/VehicleListScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import AccountScreen from '../screens/AccountScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import { colors } from '../theme';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AllTripsStack = createNativeStackNavigator();
const PlaceholderStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

const TAB_ICON_SIZE = 22;

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="DriverRegister" component={DriverRegisterScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * Stack trong tab "Trang chủ" — chỉ chứa Home. Sub-screen (TripCreate, VehicleList,
 * VehicleRegister) mở như modal ở RootStack để có thể truy cập từ nhiều tab.
 */
function HomeTabs() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function AllTripsTab() {
  return (
    <AllTripsStack.Navigator screenOptions={{ headerShown: false }}>
      <AllTripsStack.Screen name="AllTrips" component={AllTripsScreen} />
    </AllTripsStack.Navigator>
  );
}

function makePlaceholderTab(title, icon, subtitle) {
  return function PlaceholderTab() {
    return (
      <PlaceholderStack.Navigator screenOptions={{ headerShown: false }}>
        <PlaceholderStack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          initialParams={{ title, icon, subtitle }}
        />
      </PlaceholderStack.Navigator>
    );
  };
}

const MessagesTab = makePlaceholderTab('Tin nhắn', 'message-text-outline', 'Hộp thư với khách và admin sẽ có ở đây');
const NotificationsTab = makePlaceholderTab('Thông báo', 'bell-outline', 'Cập nhật về booking và chuyến xe');

/**
 * Tab Tài khoản — stack chứa Account + 2 màn con (sửa profile, đổi mật khẩu).
 */
function AccountTab() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="Account" component={AccountScreen} />
      <AccountStack.Screen name="EditProfile" component={EditProfileScreen} />
      <AccountStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </AccountStack.Navigator>
  );
}

/**
 * Bottom tab navigator — 5 tab khi đã đăng nhập và được duyệt.
 * height = 60 + safe area inset phía dưới để icon + label không bị che.
 */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 6);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9aa9a4',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: 60 + bottomInset,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabs}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AllTripsTab"
        component={AllTripsTab}
        options={{
          tabBarLabel: 'Chuyến xe',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'car-multiple' : 'car-multiple'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesTab}
        options={{
          tabBarLabel: 'Tin nhắn',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'message-text' : 'message-text-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsTab}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'bell' : 'bell-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountTab}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Stack root — khi đã login + approved:
 * - MainTabs ở dưới cùng
 * - TripCreate / VehicleList / VehicleRegister là modal mở từ RootStack (truy cập từ mọi tab)
 */
function MainFlow() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="TripCreate" component={TripCreateScreen} />
      <RootStack.Screen name="VehicleList" component={VehicleListScreen} />
      <RootStack.Screen name="VehicleRegister" component={VehicleRegisterScreen} />
    </RootStack.Navigator>
  );
}

/**
 * Stack root tổng — chọn 1 trong 3 flow tùy trạng thái user:
 * - Chưa login → AuthFlow
 * - Đã login nhưng chưa được duyệt → DriverStatusScreen
 * - Đã login + APPROVED → MainFlow (tabs + modal sub-screens)
 */
export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [driverStatus, setDriverStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('rideup-driver-approved', () => setDriverStatus('APPROVED'));
    let cancelled = false;
    if (!user) {
      setDriverStatus(null);
      subscription.remove();
      return undefined;
    }
    setCheckingStatus(true);
    getDriverStatus()
      .then((status) => { if (!cancelled) setDriverStatus(status.status); })
      .catch(() => { if (!cancelled) setDriverStatus('APPROVED'); })
      .finally(() => { if (!cancelled) setCheckingStatus(false); });
    return () => { cancelled = true; subscription.remove(); };
  }, [user]);

  if (loading || (user && checkingStatus)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return <AuthFlow />;
  if (driverStatus !== 'APPROVED') return <DriverStatusScreen />;
  return <MainFlow />;
}