import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Platform, StatusBar, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { loadProfileImage } from '../utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { userData: contextUserData, setUserData: setContextUserData } = useUser();
  const [userData, setUserData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [healthData, setHealthData] = useState({
    heartRate: 0,
    cycling: 0,
    steps: 0,
    sleep: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user data when component mounts
    loadUserData();
    if (auth.currentUser) {
      loadProfileImage(storage, auth.currentUser.uid, setProfileImage);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("Dashboard screen focused - reloading profile image");
      if (auth.currentUser) {
        loadProfileImage(storage, auth.currentUser.uid, setProfileImage);
      }
      return () => {};
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        console.log('DashboardScreen: No user logged in');
        setLoading(false);
        return;
      }

      console.log(`DashboardScreen: Loading data for user: ${user.uid}, displayName: ${user.displayName || 'none'}, email: ${user.email || 'none'}`);

      // If we have context data with a name, use it first to avoid delay
      if (contextUserData && contextUserData.name) {
        console.log(`DashboardScreen: Using data from context with name: ${contextUserData.name}`);
        setUserData(contextUserData);
        
        // Use health data from context if available
        if (contextUserData.healthData) {
          setHealthData(contextUserData.healthData);
        }
        
        setLoading(false);
        return;
      }

      // Get user data from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('DashboardScreen: User data loaded from Firestore:', JSON.stringify(data));
        
        // Make sure we have a name in the data
        if (!data.name) {
          if (user.displayName) {
            data.name = user.displayName;
            console.log(`DashboardScreen: Adding missing name from displayName: ${user.displayName}`);
            // Update Firestore with the name
            await setDoc(userRef, { name: user.displayName }, { merge: true });
          } else {
            data.name = `User-${user.uid.substring(0, 4)}`;
            console.log(`DashboardScreen: Adding generated name: ${data.name}`);
            // Update Firestore with the name
            await setDoc(userRef, { name: data.name }, { merge: true });
          }
        }
        
        setUserData(data);
        setContextUserData(data); // Update the context as well
        
        // Get health data if available
        if (data.healthData) {
          setHealthData(data.healthData);
        } else {
          // Create default health data if none exists
          const defaultHealthData = {
            heartRate: 78,
            cycling: 24,
            steps: 15000,
            sleep: 8,
          };
          
          setHealthData(defaultHealthData);
          
          // Save default health data to Firestore
          await setDoc(userRef, { 
            healthData: defaultHealthData 
          }, { merge: true });
        }
      } else {
        // If user document doesn't exist, create one with default values
        const displayName = user.displayName || `User-${user.uid.substring(0, 4)}`;
        const defaultData = {
          name: displayName,
          email: user.email || '',
          firstName: user.displayName ? user.displayName.split(' ')[0] : '',
          lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
          createdAt: new Date(),
          healthData: {
            heartRate: 78,
            cycling: 24,
            steps: 15000,
            sleep: 8,
          }
        };
        
        console.log(`DashboardScreen: Creating default user data with name: ${defaultData.name}`);
        await setDoc(userRef, defaultData);
        setUserData(defaultData);
        setContextUserData(defaultData); // Update the context as well
        setHealthData(defaultData.healthData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('DashboardScreen: Error loading user data:', error);
      setLoading(false);
    }
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToStats = (type) => {
    navigation.navigate('Stats', { type });
  };

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.safeArea,
        { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
      ]}>
        <View style={[
          styles.loadingContainer,
          { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
        ]}>
          <ActivityIndicator size="large" color={isDarkMode ? '#FFFFFF' : '#9e77ed'} />
          <Text style={{ color: isDarkMode ? '#FFFFFF' : '#000000', marginTop: 20 }}>Loading your health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.safeArea,
      { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#121212" : "#FFFFFF"}
        translucent={Platform.OS === 'android'} 
      />
      <View style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>Home</Text>
          <TouchableOpacity onPress={navigateToProfile}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../assets/images/profile-pic.png')}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[
            styles.greeting,
            { color: isDarkMode ? '#AAAAAA' : '#666666' }
          ]}>Hello,</Text>
          <Text style={[
            styles.name,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {(() => {
              // Direct debugging of userData and contextUserData
              console.log('DASHBOARD SCREEN - Raw userData:', JSON.stringify(userData || {}));
              console.log('DASHBOARD SCREEN - Raw contextUserData:', JSON.stringify(contextUserData || {}));
              
              // Simple display logic - try in order of precedence
              let nameToShow = 'User';
              
              if (userData && userData.name) {
                nameToShow = userData.name;
                console.log(`DASHBOARD SCREEN - Using userData.name: ${nameToShow}`);
              } else if (contextUserData && contextUserData.name) {
                nameToShow = contextUserData.name;
                console.log(`DASHBOARD SCREEN - Using contextUserData.name: ${nameToShow}`);
              } else if (auth.currentUser && auth.currentUser.displayName) {
                nameToShow = auth.currentUser.displayName;
                console.log(`DASHBOARD SCREEN - Using auth.currentUser.displayName: ${nameToShow}`);
              }
              
              return nameToShow;
            })()}
          </Text>
        </View>

        {/* Warning/Notification */}
        <View style={styles.warningBox}>
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={20} 
            color={isDarkMode ? '#FFD700' : '#FFD700'} 
          />
          <Text style={[
            styles.warningText,
            { color: isDarkMode ? '#AAAAAA' : '#666666' }
          ]}>
            You haven't checked out the app recently. Do some workouts.
          </Text>
        </View>
        <Text style={[
          styles.timeAgo,
          { color: isDarkMode ? '#777777' : '#999999' }
        ]}>3 days ago</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Heart Rate Card */}
          <TouchableOpacity 
            style={[styles.statCard, styles.heartRateCard, 
              { backgroundColor: isDarkMode ? '#33292B' : '#FFF5F5' }
            ]}
            onPress={() => navigateToStats('heart')}
          >
            <View style={styles.statContent}>
              <MaterialCommunityIcons name="heart" size={20} color="#FF5252" />
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>Heart Rate</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>{healthData.heartRate}
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>bpm</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Cycling Card */}
          <TouchableOpacity 
            style={[styles.statCard, styles.cyclingCard,
              { backgroundColor: isDarkMode ? '#292D3E' : '#F3F0FF' }
            ]}
            onPress={() => navigateToStats('cycling')}
          >
            <View style={styles.statContent}>
              <MaterialCommunityIcons name="bike" size={20} color="#9e77ed" />
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>Cycling</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>{healthData.cycling}
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>min</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Steps Card */}
          <TouchableOpacity 
            style={[styles.statCard, styles.stepsCard,
              { backgroundColor: isDarkMode ? '#293333' : '#ECFDF5' }
            ]}
            onPress={() => navigateToStats('steps')}
          >
            <View style={styles.statContent}>
              <MaterialCommunityIcons name="shoe-print" size={20} color="#4CAF50" />
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>Steps</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>{healthData.steps.toLocaleString()}
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>steps</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Sleep Card */}
          <TouchableOpacity 
            style={[styles.statCard, styles.sleepCard,
              { backgroundColor: isDarkMode ? '#293342' : '#EFF6FF' }
            ]}
            onPress={() => navigateToStats('sleep')}
          >
            <View style={styles.statContent}>
              <MaterialCommunityIcons name="power-sleep" size={20} color="#2196F3" />
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>Sleep</Text>
            </View>
            <View style={styles.statValueContainer}>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>{healthData.sleep}
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>hrs</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: Platform.OS === 'android' ? 10 : 0,
    height: Platform.OS === 'android' ? 60 : 'auto',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  greetingSection: {
    marginBottom: 12,
  },
  greeting: {
    fontSize: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heartRateCard: {
    backgroundColor: '#FFF5F5',
  },
  cyclingCard: {
    backgroundColor: '#F3F0FF',
  },
  stepsCard: {
    backgroundColor: '#ECFDF5',
  },
  sleepCard: {
    backgroundColor: '#EFF6FF',
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  statValueContainer: {
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DashboardScreen; 