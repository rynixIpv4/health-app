import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { UserProvider, useUser } from './src/contexts/UserContext';

// Suppress specific React warnings for third-party libraries
import { LogBox } from 'react-native';
LogBox.ignoreLogs([
  'Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.',
]);

import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import BluetoothScreen from './src/screens/BluetoothScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StatsScreen from './src/screens/StatsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AboutScreen from './src/screens/AboutScreen';
import HealthDetailsScreen from './src/screens/HealthDetailsScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import PhoneSetupScreen from './src/screens/PhoneSetupScreen';
import PhoneVerificationScreen from './src/screens/PhoneVerificationScreen';
import TwoFactorAuthScreen from './src/screens/TwoFactorAuthScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  HealthDetails: undefined;
  MainApp: undefined;
  Profile: undefined;
  Stats: { type: string };
  Notifications: undefined;
  About: undefined;
  EmergencyContacts: undefined;
  Security: undefined;
  ChangePassword: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  PhoneSetup: { fromSettings?: boolean, enable2FA?: boolean };
  PhoneVerification: { 
    phoneNumber: string; 
    verificationId: string; 
    fromSettings?: boolean;
    enable2FA?: boolean;
  };
  TwoFactorAuth: { 
    resolver: any; 
    email: string;
  };
};

type BottomTabParamList = {
  Home: undefined;
  Activity: undefined;
  Connect: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
const { width } = Dimensions.get('window');

// Create a comprehensive custom theme with all necessary typography variants
const CustomLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#000000',
    background: '#FFFFFF',
    surface: '#FFFFFF',
  },
  fonts: MD3LightTheme.fonts,
};

// Create a matching dark theme with the same typography
const CustomDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFFFFF',
    background: '#121212',
    surface: '#1E1E1E',
  },
  fonts: MD3DarkTheme.fonts,
};

// Adapt the themes for React Navigation
const adaptedLightTheme = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  materialLight: CustomLightTheme,
}).LightTheme;

const adaptedDarkTheme = adaptNavigationTheme({
  reactNavigationDark: NavigationDefaultTheme,
  materialDark: CustomDarkTheme,
}).DarkTheme;

const LightTheme = adaptedLightTheme;
const DarkTheme = adaptedDarkTheme;

// Custom tab bar component
interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { isDarkMode } = useTheme();
  
  // Define platform-specific shadow styles
  const shadowStyle = Platform.OS === 'ios' 
    ? {
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: isDarkMode ? 0.3 : 0.15,
        shadowRadius: 10,
      } 
    : {
        elevation: isDarkMode ? 3 : 4, // Reduced elevation for Android, even lower in dark mode
      };
  
  return (
    <View style={styles.tabBarContainer}>
      <View style={[
        styles.tabBar,
        { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
        shadowStyle
      ]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Get the icon name based on the route
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = isFocused ? 'home' : 'home-outline';
              break;
            case 'Activity':
              iconName = isFocused ? 'chart-line' : 'chart-line-variant';
              break;
            case 'Connect':
              iconName = isFocused ? 'bluetooth' : 'bluetooth-off';
              break;
            case 'Settings':
              iconName = isFocused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <View key={index} style={styles.tabItem}>
              <View 
                style={[
                  styles.tabButton, 
                  isFocused && [
                    styles.tabButtonActive,
                    { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
                  ]
                ]}
              >
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={24}
                  color={isFocused 
                    ? (isDarkMode ? '#FFFFFF' : '#000000') 
                    : (isDarkMode ? '#8E8E93' : '#8E8E93')}
                  onPress={onPress}
                />
              </View>
              {isFocused && <View style={[
                styles.tabIndicator,
                { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }
              ]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MainApp() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Activity" 
        component={ActivityScreen}
        options={{
          tabBarLabel: 'Activity',
        }}
      />
      <Tab.Screen 
        name="Connect" 
        component={BluetoothScreen}
        options={{
          tabBarLabel: 'Connect',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isOnboarded, isLoading } = useUser();

  // Apply the appropriate theme
  const theme = isDarkMode ? DarkTheme : LightTheme;

  // Show loading screen while checking authentication state
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#121212' : '#FFFFFF'
      }}>
        <ActivityIndicator size="large" color={isDarkMode ? '#FFFFFF' : '#9e77ed'} />
      </View>
    );
  }

  // Determine initial route - if not authenticated, always start with SignIn/Onboarding
  const initialRoute = isAuthenticated 
    ? 'MainApp' 
    : isOnboarded 
      ? 'SignIn' 
      : 'Onboarding';

  return (
    <PaperProvider theme={isDarkMode ? CustomDarkTheme : CustomLightTheme}>
      <NavigationContainer theme={theme}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: isDarkMode ? '#121212' : '#FFFFFF'
            }
          }}
          initialRouteName={initialRoute}
        >
          
          {/* Auth Screens - Always include these so navigation works properly after logout */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
          
          {/* App Screens */}
          <Stack.Screen 
            name="MainApp" 
            component={MainApp} 
            options={{ gestureEnabled: false }} // Prevent swiping back to auth screens
          />
          <Stack.Screen name="HealthDetails" component={HealthDetailsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="PhoneSetup" component={PhoneSetupScreen} />
          <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

function AppNavigator() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 60,
    width: width - 40,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  }
});

export default AppNavigator; 