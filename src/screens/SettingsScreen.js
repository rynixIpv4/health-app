import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { Text, Surface, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, themeColors } = useTheme();
  const { userData } = useUser();

  const settingsOptions = [
    { id: 'profile', title: 'Profile & Account setting', icon: 'account-outline', screen: 'Profile' },
    { id: 'notifications', title: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
    { id: 'security', title: 'Security', icon: 'shield-outline', screen: 'Security' },
    { id: 'about', title: 'About the app', icon: 'information-outline', screen: 'About' },
  ];

  const handleOptionPress = (screen) => {
    if (screen === 'Profile') {
      navigation.navigate('Profile');
    } else if (screen === 'Notifications') {
      navigation.navigate('Notifications');
    } else if (screen === 'About') {
      navigation.navigate('About');
    } else if (screen === 'Security') {
      navigation.navigate('Security');
    } else {
      // For future implementation of other screens
      console.log(`Navigate to ${screen}`);
    }
  };

  return (
    <SafeAreaView style={[
      styles.safeArea, 
      { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={isDarkMode ? '#121212' : '#FFFFFF'}
      />
      
      <View style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[
              styles.backButton,
              { backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0' }
            ]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons 
              name="chevron-left" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>Settings</Text>
          <View style={styles.headerRight} />
        </View>
        
        {/* Dark Mode Toggle */}
        <Surface style={[
          styles.themeToggleCard,
          { backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF' }
        ]}>
          <View style={styles.themeToggleContainer}>
            <View style={styles.themeTextContainer}>
              <MaterialCommunityIcons 
                name={isDarkMode ? "weather-night" : "weather-sunny"} 
                size={22} 
                color={isDarkMode ? '#9e77ed' : '#FF9500'} 
              />
              <Text style={[
                styles.themeToggleText,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              color="#9e77ed"
            />
          </View>
        </Surface>
        
        {/* Settings Options */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {settingsOptions.map((option) => (
            <Surface 
              key={option.id}
              style={[
                styles.optionCard,
                { backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF' }
              ]}
            >
              <TouchableOpacity 
                style={styles.option}
                onPress={() => handleOptionPress(option.screen)}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: isDarkMode ? '#2c2c2c' : '#f5f5f5' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={22} 
                      color={isDarkMode ? '#9e77ed' : '#9e77ed'} 
                    />
                  </View>
                  <Text style={[
                    styles.optionTitle,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}>{option.title}</Text>
                </View>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={22} 
                  color={isDarkMode ? '#AAAAAA' : '#AAAAAA'} 
                />
              </TouchableOpacity>
            </Surface>
          ))}
        </ScrollView>
        
        {/* Version Info */}
        <Text style={[
          styles.versionText,
          { color: isDarkMode ? '#777777' : '#999999' }
        ]}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    marginTop: Platform.OS === 'android' ? 10 : 0,
    height: Platform.OS === 'android' ? 60 : 'auto',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  themeToggleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  optionCard: {
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
  },
});

export default SettingsScreen; 