import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BookingCreateScreen from '../screens/BookingCreateScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import useUnreadNotifications from '../hooks/useUnreadNotifications';
import AccountScreen from '../screens/AccountScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChatScreen from '../screens/ChatScreen';
import { colors } from '../theme';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const MyBookingsStack = createNativeStackNavigator();
const PlaceholderStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

const TAB_ICON_SIZE = 22;

function HomeTabs() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="BookingCreate" component={BookingCreateScreen} />
    </HomeStack.Navigator>
  );
}

function MyBookingsTab() {
  return (
    <MyBookingsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyBookingsStack.Screen name="MyBookings" component={MyBookingsScreen} />
      <MyBookingsStack.Screen name="Chat" component={ChatScreen} />
    </MyBookingsStack.Navigator>
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

const NotificationsTab = NotificationsScreen;

function AccountTab() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="Account" component={AccountScreen} />
      <AccountStack.Screen name="EditProfile" component={EditProfileScreen} />
      <AccountStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </AccountStack.Navigator>
  );
}

function MainTabs() {
  const unread = useUnreadNotifications();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 6);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryAccent,
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
        name="MyBookingsTab"
        component={MyBookingsTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('MyBookingsTab', { screen: 'MyBookings' }),
        })}
        options={{
          tabBarLabel: 'Chuyến xe',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'car-multiple' : 'car-outline'}
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
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#dc2626', fontSize: 10 },
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

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

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
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Screen name="Auth" component={AuthFlow} />
      ) : (
        <RootStack.Screen name="Main" component={MainTabs} />
      )}
    </RootStack.Navigator>
  );
}