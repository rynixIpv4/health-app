import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, Linking, Image } from 'react-native';
import { Text, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const AboutScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  
  const appVersion = "1.0.1";
  
  const aboutSections = [
    {
      id: 'app',
      title: 'App Information',
      items: [
        { 
          id: 'version', 
          title: 'Version', 
          value: appVersion,
          icon: 'information-outline'
        },
        { 
          id: 'build', 
          title: 'Build', 
          value: '2023.05.01',
          icon: 'code-tags'
        },
        { 
          id: 'platform', 
          title: 'Platform', 
          value: Platform.OS === 'ios' ? 'iOS' : 'Android',
          icon: Platform.OS === 'ios' ? 'apple' : 'android'
        },
        {
          id: 'lastUpdate',
          title: 'Last Update',
          value: 'May 1, 2023',
          icon: 'update'
        },
        {
          id: 'size',
          title: 'App Size',
          value: '24.5 MB',
          icon: 'database'
        }
      ]
    }
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
          ]}>About the App</Text>
          <View style={styles.headerRight} />
        </View>
        
        {/* App Logo and Name */}
        <View style={styles.appInfoContainer}>
          <View style={[
            styles.logoContainer,
            { backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5' }
          ]}>
            <MaterialCommunityIcons 
              name="heart-pulse" 
              size={48} 
              color="#9e77ed" 
            />
          </View>
          <Text style={[
            styles.appName,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>Health Tracking App</Text>
          <Text style={[
            styles.appTagline,
            { color: isDarkMode ? '#AAAAAA' : '#777777' }
          ]}>Monitor your health and fitness in one place</Text>
        </View>
        
        {/* About Sections */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {aboutSections.map((section) => (
            <View key={section.id} style={styles.sectionContainer}>
              <Text style={[
                styles.sectionTitle,
                { color: isDarkMode ? '#9e77ed' : '#9e77ed' }
              ]}>{section.title}</Text>
              
              <Surface style={[
                styles.sectionCard,
                { backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF' }
              ]}>
                {section.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemContent}>
                        <View style={[
                          styles.iconContainer,
                          { backgroundColor: isDarkMode ? '#2c2c2c' : '#f5f5f5' }
                        ]}>
                          <MaterialCommunityIcons 
                            name={item.icon} 
                            size={20} 
                            color="#9e77ed" 
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <Text style={[
                            styles.itemTitle,
                            { color: isDarkMode ? '#FFFFFF' : '#000000' }
                          ]}>{item.title}</Text>
                          {item.value && (
                            <Text style={[
                              styles.itemValue,
                              { color: isDarkMode ? '#AAAAAA' : '#777777' }
                            ]}>{item.value}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {index < section.items.length - 1 && (
                      <Divider style={{ 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#EEEEEE',
                        marginLeft: 56
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </Surface>
            </View>
          ))}
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[
              styles.sectionTitle,
              { color: isDarkMode ? '#9e77ed' : '#9e77ed' }
            ]}>Description</Text>
            
            <Surface style={[
              styles.descriptionCard,
              { backgroundColor: isDarkMode ? '#1e1e1e' : '#FFFFFF' }
            ]}>
              <Text style={[
                styles.descriptionText,
                { color: isDarkMode ? '#DDDDDD' : '#555555' }
              ]}>
                Health Tracking App is a comprehensive health monitoring solution designed to help you track your daily activities, heart rate, sleep patterns, and more. The app connects with compatible devices to provide real-time health data and insights.
              </Text>
              <Text style={[
                styles.descriptionText,
                { color: isDarkMode ? '#DDDDDD' : '#555555', marginTop: 12 }
              ]}>
                With an intuitive interface and powerful analytics, you can easily monitor your health trends and make informed decisions about your wellness journey.
              </Text>
            </Surface>
          </View>
          
          {/* Copyright */}
          <Text style={[
            styles.copyright,
            { color: isDarkMode ? '#777777' : '#999999' }
          ]}>© 2023 All rights reserved.</Text>
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
  appInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 14,
    marginTop: 4,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionCard: {
    borderRadius: 12,
    padding: 16,
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
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  }
});

export default AboutScreen; 