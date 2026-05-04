import 'react-native-gesture-handler';
import React from 'react';

import { StatusBar, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause this to error, so we catch it */
});


import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Member 1 — Profile / User Pages
import ProfileScreen from './src/screens/profile/ProfileScreen';
import UserDashboardScreen from './src/screens/user/UserDashboardScreen';

// Member 2 — Reader
import ReaderScreen from './src/screens/reader/ReaderScreen';

// Member 3 — Activity
import ActivityScreen from './src/screens/activity/ActivityScreen';

// Member 4 — Feedback
import FeedbackScreen from './src/screens/feedback/FeedbackScreen';

// Member 1 — Payment
import PaymentScreen from './src/screens/profile/PaymentScreen';

// Member 5 — Books
import BooksScreen from './src/screens/books/BooksScreen';
import BookDetailScreen from './src/screens/books/BookDetailScreen';
import AddBookScreen from './src/screens/books/AddBookScreen';
import EditBookScreen from './src/screens/books/EditBookScreen';

// Member 6 — Search
import SearchScreen from './src/screens/search/SearchScreen';

// QR Scanner
import QRScannerScreen from './src/screens/qr/QRScannerScreen';

// Member 7 — Bookshelf
import BookshelfScreen from './src/screens/bookshelf/BookshelfScreen';
import WishlistManagementScreen from './src/screens/library/WishlistManagementScreen';

// Admin screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminFeedbackScreen from './src/screens/admin/AdminFeedbackScreen';
import AdminBooksScreen from './src/screens/admin/AdminBooksScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ 
      headerShown: false,
    }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ─── Helper: tab bar icon factory ─────────────────────────────────────────────
function tabIcon(name, focusedName) {
  return ({ focused, color, size }) => (
    <Ionicons name={focused ? focusedName : name} size={size} color={color} />
  );
}

// ─── User Main Tabs ────────────────────────────────────────────────────────────
function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { 
          height: 85, 
          paddingBottom: 25, 
          paddingTop: 12,
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 25,
          shadowColor: colors.primary,
          shadowOpacity: 0.15,
          shadowRadius: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={UserDashboardScreen}
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tab.Screen
        name="Bookshelf"
        component={BookshelfNavigator}
        options={{ title: 'Library', tabBarIcon: tabIcon('library-outline', 'library') }}
      />
      <Tab.Screen
        name="Books"
        component={BooksNavigator}
        options={{ title: 'Store', tabBarIcon: tabIcon('cart-outline', 'cart') }}
      />
      <Tab.Screen
        name="Search"
        component={SearchNavigator}
        options={{ title: 'Search', tabBarIcon: tabIcon('search-outline', 'search') }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: 'Stats', tabBarIcon: tabIcon('bar-chart-outline', 'bar-chart') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tab.Navigator>
  );
}

// ─── Admin Tabs ────────────────────────────────────────────────────────────────
function AdminTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { 
          height: 85, 
          paddingBottom: 25, 
          paddingTop: 12,
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 25,
          shadowColor: colors.primary,
          shadowOpacity: 0.15,
          shadowRadius: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        }
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardNavigator}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid-outline', 'grid') }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: 'Users', tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tab.Screen
        name="AdminFeedback"
        component={AdminFeedbackScreen}
        options={{ title: 'Feedback', tabBarIcon: tabIcon('chatbubbles-outline', 'chatbubbles') }}
      />
      <Tab.Screen
        name="Books"
        component={AdminBooksNavigator}
        options={{ title: 'Books', tabBarIcon: tabIcon('library-outline', 'library') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tab.Navigator>
  );
}

// ─── Nested Stacks ─────────────────────────────────────────────────────────────
function BooksNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BooksList" component={BooksScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Book Details' }} />
      <Stack.Screen 
        name="Reader" 
        component={ReaderScreen} 
        options={{ 
          title: 'Reader', 
          headerShown: true, 
        }} 
      />
      <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Add Book', headerShown: true }} />
      <Stack.Screen name="EditBook" component={EditBookScreen} options={{ title: 'Edit Book', headerShown: true }} />
    </Stack.Navigator>
  );
}

function SearchNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: true }} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan QR Code', headerShown: true }} />
    </Stack.Navigator>
  );
}

function BookshelfNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookshelfMain" component={BookshelfScreen} />
      <Stack.Screen name="WishlistManagement" component={WishlistManagementScreen} options={{ title: 'My Wishlists' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback', headerShown: true }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Premium Subscription', headerShown: true }} />
    </Stack.Navigator>
  );
}

function AdminDashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}

function AdminBooksNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminBooksMain" component={AdminBooksScreen} />
      <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Add Book', headerShown: true }} />
      <Stack.Screen name="EditBook" component={EditBookScreen} options={{ title: 'Edit Book', headerShown: true }} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator (auth guard) ───────────────────────────────────────────────
function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [timedOut, setTimedOut] = React.useState(false);
  const loading = authLoading && !timedOut;

  React.useEffect(() => {
    // Force splash screen hide after 3 seconds even if auth is slow
    const timer = setTimeout(() => {
      setTimedOut(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);

    if (!authLoading) {
      setTimedOut(true);
      SplashScreen.hideAsync().catch(() => {});
    }

    return () => clearTimeout(timer);
  }, [authLoading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!user) return <AuthStack />;

  return user.role === 'admin' ? <AdminTabs /> : <MainTabs />;
}


import { SafeAreaProvider } from 'react-native-safe-area-context';

// ─── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, dark } = useTheme();
  
  return (
    <NavigationContainer theme={dark ? DarkNavTheme : DefaultNavTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />
      <RootNavigator />
    </NavigationContainer>
  );
}

const DefaultNavTheme = {
  dark: false,
  colors: {
    primary: '#4f46e5',
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
    notification: '#ef4444',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

const DarkNavTheme = {
  dark: true,
  colors: {
    primary: '#818cf8',
    background: '#000000',
    card: '#121212',
    text: '#f8fafc',
    border: '#1e293b',
    notification: '#f87171',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

