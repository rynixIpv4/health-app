import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { auth, db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  arrayRemove
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SecurityScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const themeColors = {
    background: isDarkMode ? '#121212' : '#f8f9fa',
    card: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#212529',
    subText: isDarkMode ? '#adb5bd' : '#6c757d',
    accent: '#9e77ed',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    divider: isDarkMode ? '#2c2c2c' : '#e9ecef',
  };

  // Generate a unique device ID if not already stored
  const getOrCreateDeviceId = async () => {
    try {
      let deviceId = await AsyncStorage.getItem('@device_id');
      
      if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
        await AsyncStorage.setItem('@device_id', deviceId);
      }
      
      setCurrentDeviceId(deviceId);
      return deviceId;
    } catch (error) {
      console.error('Error getting/creating device ID:', error);
      return null;
    }
  };

  // Register current device if not already registered
  const registerCurrentDevice = async (userId, deviceId) => {
    try {
      if (!userId || !deviceId) return;

      const deviceInfo = {
        id: deviceId,
        name: getDeviceName(),
        location: await getLocationInfo(),
        lastActive: new Date().toISOString(),
        isCurrent: true,
        createdAt: serverTimestamp(),
        platform: Platform.OS,
        model: getDeviceModel(),
      };

      // Check if device already exists
      const deviceRef = doc(db, `users/${userId}/devices/${deviceId}`);
      const deviceDoc = await getDoc(deviceRef);

      if (!deviceDoc.exists()) {
        // Add new device
        await setDoc(deviceRef, deviceInfo);
      } else {
        // Update last active timestamp
        await updateDoc(deviceRef, {
          lastActive: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  // Get the device name
  const getDeviceName = () => {
    const defaultNames = {
      ios: 'iPhone',
      android: 'Android Device',
      web: 'Web Browser',
    };
    
    return defaultNames[Platform.OS] || 'Unknown Device';
  };

  // Get the device model
  const getDeviceModel = () => {
    if (Platform.OS === 'ios') {
      return Platform.constants.systemName + ' ' + Platform.constants.osVersion;
    } else if (Platform.OS === 'android') {
      return 'Android ' + Platform.Version;
    }
    return 'Unknown Model';
  };

  // Get location info (simplified, in a real app you'd use Geolocation)
  const getLocationInfo = async () => {
    // Simplified location for demo - in a real app, you'd use geolocation API
    // and possibly a reverse geocoding service
    return 'Unknown Location';
  };

  // Format timestamp to relative time
  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
      if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
      if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  // Load user's devices
  const loadDevices = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        console.log('No user logged in');
        setLoading(false);
        return;
      }
      
      // Get current device ID
      const deviceId = await getOrCreateDeviceId();
      
      // Register current device if not already registered
      await registerCurrentDevice(user.uid, deviceId);
      
      // Fetch all devices
      const devicesRef = collection(db, `users/${user.uid}/devices`);
      const querySnapshot = await getDocs(devicesRef);
      
      const devicesList = [];
      querySnapshot.forEach((doc) => {
        const deviceData = doc.data();
        devicesList.push({
          ...deviceData,
          isCurrent: deviceData.id === deviceId,
        });
      });
      
      // Sort by last active (most recent first)
      devicesList.sort((a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(b.lastActive) - new Date(a.lastActive);
      });
      
      setDevices(devicesList);
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    
    // Load 2FA setting and user data
    const loadUserSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserData(userData);
          
          // Set 2FA state from Firestore
          if (userData.twoFactorEnabled) {
            setIs2FAEnabled(true);
          }
          
          // Double-check with the actual Firebase Auth state
          try {
            const { multiFactor } = require('firebase/auth');
            const multiFactorUser = multiFactor(user);
            const enrolledFactors = multiFactorUser.enrolledFactors || [];
            
            console.log('2FA status check - Firebase enrolled factors:', enrolledFactors);
            
            if (enrolledFactors.length > 0) {
              // User has 2FA enabled in Firebase Auth
              console.log('User has 2FA enabled in Firebase Auth');
              
              // If it's not enabled in Firestore, update it
              if (!userData.twoFactorEnabled) {
                console.log('Updating Firestore to reflect 2FA status from Firebase Auth');
                await updateDoc(userRef, {
                  twoFactorEnabled: true
                });
              }
              
              setIs2FAEnabled(true);
            } else {
              // User doesn't have 2FA in Firebase Auth
              console.log('User does not have 2FA enabled in Firebase Auth');
              
              // If it's enabled in Firestore, update it
              if (userData.twoFactorEnabled) {
                console.log('Updating Firestore to reflect 2FA status from Firebase Auth');
                await updateDoc(userRef, {
                  twoFactorEnabled: false
                });
              }
              
              setIs2FAEnabled(false);
            }
          } catch (error) {
            console.error('Error checking MFA status:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    
    loadUserSettings();
  }, []);

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handle2FAToggle = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Check if user has verified phone
      if (!userData?.phoneVerified) {
        // First, display error about needing to set up phone verification
        Alert.alert(
          'Phone Verification Required',
          'You need to set up phone verification before enabling two-factor authentication.',
          [
            {
              text: 'Set Up Now',
              onPress: () => {
                navigation.navigate('PhoneSetup', { fromSettings: true });
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

      // If turning ON 2FA
      if (!is2FAEnabled) {
        // Show password modal
        setPassword('');
        setPasswordError('');
        setShowPasswordModal(true);
      } else {
        // If turning OFF 2FA - show confirmation
        Alert.alert(
          'Disable Two-Factor Authentication',
          'This will make your account less secure. Are you sure you want to continue?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                try {
                  setIsLoading(true);
                  
                  // Attempt to unenroll 2FA
                  const { unenroll2FAFactor } = require('../firebase');
                  const result = await unenroll2FAFactor(user);
                  
                  if (result.success) {
                    // Update UI state
                    setIs2FAEnabled(false);
                    
                    // Update in Firestore
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      twoFactorEnabled: false,
                      updatedAt: serverTimestamp(),
                    });
                    
                    Alert.alert(
                      'Two-Factor Authentication Disabled',
                      'Two-factor authentication has been disabled for your account.'
                    );
                  } else {
                    Alert.alert('Error', result.error || 'Failed to disable two-factor authentication');
                  }
                } catch (error) {
                  console.error('Error disabling 2FA:', error);
                  Alert.alert('Error', 'Failed to disable two-factor authentication');
                } finally {
                  setIsLoading(false);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating 2FA setting:', error);
      Alert.alert('Error', 'Failed to update two-factor authentication setting');
    }
  };

  const handlePasswordVerification = async () => {
    if (!password) {
      setPasswordError('Password cannot be empty');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Verify user's password
      const { EmailAuthProvider, reauthenticateWithCredential } = require('firebase/auth');
      const credential = EmailAuthProvider.credential(
        user.email, 
        password
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Close the modal
      setShowPasswordModal(false);
      
      // Navigate to phone setup for 2FA enrollment
      navigation.navigate('PhoneSetup', { 
        fromSettings: true,
        enable2FA: true
      });
    } catch (error) {
      console.error('Password verification error:', error);
      setPasswordError('Incorrect password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = (deviceId) => {
    Alert.alert(
      'Remove Device',
      'This will log out this device from your account. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Device',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;
              
              // Delete device from Firestore
              await deleteDoc(doc(db, `users/${user.uid}/devices/${deviceId}`));
              
              // Update UI
              setDevices(prevDevices => prevDevices.filter(device => device.id !== deviceId));
              
              Alert.alert('Success', 'Device has been logged out from your account.');
            } catch (error) {
              console.error('Error removing device:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  const renderDeviceCard = (device) => (
    <Surface key={device.id} style={[styles.deviceCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.deviceInfo}>
        <View style={[styles.deviceIconContainer, { backgroundColor: 'rgba(158, 119, 237, 0.1)' }]}>
          <MaterialCommunityIcons
            name={device.platform === 'ios' ? 'apple' : device.platform === 'android' ? 'android' : 'cellphone'}
            size={24}
            color={themeColors.accent}
          />
        </View>
        <View style={styles.deviceDetails}>
          <Text style={[styles.deviceName, { color: themeColors.text }]}>
            {device.name} {device.isCurrent && '(Current Device)'}
          </Text>
          <Text style={[styles.deviceLocation, { color: themeColors.subText }]}>
            {device.location || 'Unknown Location'}
          </Text>
          <Text style={[styles.deviceLastActive, { color: themeColors.subText }]}>
            Last active: {formatLastActive(device.lastActive)}
          </Text>
        </View>
      </View>
      {!device.isCurrent && (
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: themeColors.danger + '20' }]}
          onPress={() => handleRemoveDevice(device.id)}
        >
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color={themeColors.danger}
          />
        </TouchableOpacity>
      )}
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.background}
        translucent={true}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.card }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={themeColors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            Security
          </Text>
        </View>

        {/* Authentication Section */}
        <Surface style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons
                name="shield-lock"
                size={24}
                color={themeColors.accent}
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Authentication</Text>
            </View>
          </View>
          <Text style={[styles.sectionDescription, { color: themeColors.subText }]}>
            Secure your account with two-factor authentication and manage your password.
          </Text>

          {/* Password */}
          <TouchableOpacity 
            style={[
              styles.menuItem, 
              { borderBottomColor: themeColors.divider }
            ]}
            onPress={handleChangePassword}
          >
            <View style={styles.menuItemContent}>
              <MaterialCommunityIcons name="lock" size={22} color={themeColors.accent} />
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>Change Password</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={themeColors.subText} />
          </TouchableOpacity>

          {/* 2FA Toggle */}
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={styles.menuItemContent}>
              <MaterialCommunityIcons name="two-factor-authentication" size={22} color={themeColors.accent} />
              <Text style={[styles.menuItemText, { color: themeColors.text }]}>Two-Factor Authentication</Text>
            </View>
            <Switch
              value={is2FAEnabled}
              onValueChange={handle2FAToggle}
              trackColor={{ false: themeColors.divider, true: themeColors.accent + '80' }}
              thumbColor={is2FAEnabled ? themeColors.accent : '#f4f3f4'}
            />
          </View>
          
          {/* Phone verification for 2FA */}
          <View style={[styles.menuItem, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: themeColors.divider }]}>
            <View style={styles.menuItemContent}>
              <MaterialCommunityIcons name="cellphone-check" size={22} color={themeColors.accent} />
              <View>
                <Text style={[styles.menuItemText, { color: themeColors.text }]}>Phone Verification</Text>
                <Text style={[styles.menuItemSubtext, { color: themeColors.subText }]}>
                  {userData?.phoneVerified 
                    ? `Verified: ${userData.phoneNumber}` 
                    : 'Set up phone verification for 2FA'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.phoneVerifyButton, { backgroundColor: themeColors.accent + '20' }]}
              onPress={() => navigation.navigate('PhoneSetup', { fromSettings: true })}
            >
              <Text style={[styles.phoneVerifyText, { color: themeColors.accent }]}>
                {userData?.phoneVerified ? 'Update' : 'Setup'}
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Logged-in Devices Section */}
        <Surface style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons
                name="devices"
                size={24}
                color={themeColors.accent}
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                Logged-in Devices
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadDevices}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={themeColors.accent}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDescription, { color: themeColors.subText }]}>
            Manage devices that are currently logged into your account.
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.accent} />
              <Text style={[styles.loadingText, { color: themeColors.subText }]}>
                Loading devices...
              </Text>
            </View>
          ) : (
            <View style={styles.devicesList}>
              {devices.length > 0 ? (
                devices.map(renderDeviceCard)
              ) : (
                <Text style={[styles.emptyText, { color: themeColors.subText }]}>
                  No devices found
                </Text>
              )}
            </View>
          )}
        </Surface>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Password Verification Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Verify Password
            </Text>
            <Text style={[styles.modalMessage, { color: themeColors.subText }]}>
              Please enter your password to enable two-factor authentication
            </Text>
            
            <TextInput
              style={[
                styles.passwordInput,
                { 
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: passwordError ? themeColors.danger : themeColors.divider
                }
              ]}
              placeholder="Enter your password"
              placeholderTextColor={themeColors.subText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            
            {passwordError ? (
              <Text style={[styles.errorText, { color: themeColors.danger }]}>
                {passwordError}
              </Text>
            ) : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: themeColors.divider }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.verifyButton, 
                  { backgroundColor: themeColors.accent }
                ]}
                onPress={handlePasswordVerification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  devicesList: {
    marginTop: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  deviceLastActive: {
    fontSize: 12,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 119, 237, 0.1)',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  bottomPadding: {
    height: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  phoneVerifyButton: {
    padding: 8,
    borderRadius: 8,
  },
  phoneVerifyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  passwordInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
  },
  verifyButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SecurityScreen; 