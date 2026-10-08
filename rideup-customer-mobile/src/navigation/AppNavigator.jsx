import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import TripSearchScreen from '../screens/TripSearchScreen';
import BookingCreateScreen from '../screens/BookingCreateScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import AccountScreen from '../screens/AccountScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import { colors } from '../theme';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const MyBookingsStack = createNativeStackNavigator();
const PlaceholderStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

const TAB_ICON_SIZE = 22;

/**
 * Stack trong tab "Trang chủ" — chứa Home + các sub-screen đặt xe (TripSearch, BookingCreate).
 * Các sub-screen này không có tab bar.
 */
function HomeTabs() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="TripSearch" component={TripSearchScreen} />
      <HomeStack.Screen name="BookingCreate" component={BookingCreateScreen} />
    </HomeStack.Navigator>
  );
}

function MyBookingsTab() {
  return (
    <MyBookingsStack.Navigator screenOptions={{ headerShown: false }}>
      <MyBookingsStack.Screen name="MyBookings" component={MyBookingsScreen} />
    </MyBookingsStack.Navigator>
  );
}

/**
 * Stack dùng chung cho 3 tab placeholder (Tin nhắn, Thông báo, Tài khoản).
 * Mỗi tab truyền param` title`/`icon`/`subtitle` khác nhau qua initialParams.
 */
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

const MessagesTab = makePlaceholderTab('Tin nhắn', 'message-text-outline', 'Hộp thư với tài xế và admin sẽ có ở đây');
const NotificationsTab = makePlaceholderTab('Thông báo', 'bell-outline', 'Cập nhật về chuyến xe và booking');

/**
 * Tab Tài khoản — stack chứa Account + 2 màn con (sửa profile, đổi mật khẩu).
 * Header ẩn vì mỗi screen tự vẽ topBar với IconButton back.
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
 * Bottom tab navigator — 5 tab khi đã đăng nhập.
 * height = 60 + safe area inset phía dưới (Android navigation bar, iOS home indicator)
 * để icon + label không bị che.
 */
function MainTabs() {
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

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * Stack root:
 * - Khi chưa login → Auth flow
 * - Khi đã login → MainTabs (Bottom tab navigator)
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
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Screen name="Auth" component={AuthFlow} />
      ) : (
        <RootStack.Screen name="Main" component={MainTabs} />
      )}
    </RootStack.Navigator>
  );
}