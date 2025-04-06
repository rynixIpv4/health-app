import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Text, Surface, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  
  // State for notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    generalNotification: false,
    sound: false,
    doNotDisturb: true,
    vibrate: true,
    lockScreen: false,
    reminders: false,
  });

  // Handle toggle changes
  const handleToggle = (setting) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    });
  };

  // Notification options
  const notificationOptions = [
    { 
      id: 'generalNotification', 
      title: 'General Notification', 
      description: 'Receive notifications about your activity and health',
      icon: 'bell-outline' 
    },
    { 
      id: 'sound', 
      title: 'Sound', 
      description: 'Play sound for notifications',
      icon: 'volume-high' 
    },
    { 
      id: 'doNotDisturb', 
      title: 'Don\'t Disturb Mode', 
      description: 'Mute notifications during specified hours',
      icon: 'moon-waning-crescent' 
    },
    { 
      id: 'vibrate', 
      title: 'Vibrate', 
      description: 'Vibrate when receiving notifications',
      icon: 'vibrate' 
    },
    { 
      id: 'lockScreen', 
      title: 'Lock Screen', 
      description: 'Show notifications on lock screen',
      icon: 'cellphone-lock' 
    },
    { 
      id: 'reminders', 
      title: 'Reminders', 
      description: 'Get reminders for your daily goals',
      icon: 'alarm' 
    },
  ];

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
          ]}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
        
        {/* Notification Settings */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {notificationOptions.map((option) => (
            <Surface 
              key={option.id}
              style={[
                styles.optionCard,
                { backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF' }
              ]}
            >
              <View style={styles.option}>
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { 
                      backgroundColor: notificationSettings[option.id] 
                        ? '#9e77ed20' 
                        : isDarkMode ? '#2c2c2c' : '#f5f5f5' 
                    }
                  ]}>
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={22} 
                      color={notificationSettings[option.id] ? '#9e77ed' : isDarkMode ? '#AAAAAA' : '#777777'} 
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.optionTitle,
                      { color: isDarkMode ? '#FFFFFF' : '#000000' }
                    ]}>{option.title}</Text>
                    <Text style={[
                      styles.optionDescription,
                      { color: isDarkMode ? '#AAAAAA' : '#777777' }
                    ]}>{option.description}</Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings[option.id]}
                  onValueChange={() => handleToggle(option.id)}
                  color="#9e77ed"
                  style={styles.switch}
                />
              </View>
            </Surface>
          ))}
          
          <View style={styles.infoContainer}>
            <MaterialCommunityIcons 
              name="information-outline" 
              size={16} 
              color={isDarkMode ? '#AAAAAA' : '#777777'} 
              style={styles.infoIcon}
            />
            <Text style={[
              styles.infoText,
              { color: isDarkMode ? '#AAAAAA' : '#777777' }
            ]}>
              You can customize how and when you receive notifications. 
              Some notifications are essential for the app functionality and cannot be disabled.
            </Text>
          </View>
        </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
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
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  switch: {
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  }
});

export default NotificationsScreen; 