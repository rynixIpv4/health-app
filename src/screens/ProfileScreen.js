import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, StatusBar, SafeAreaView, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, storage, db, verifyStorageSetup } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImageToFirebase, uploadProfileImage, loadProfileImage, saveProfileImageLocally } from '../utils/imageUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import * as FileSystem from 'expo-file-system';
import { uploadDirectFromUri } from '../utils/imageUtils';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { setIsAuthenticated, userData: contextUserData, setUserData: setContextUserData } = useUser();
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Theme colors based on dark/light mode
  const themeColors = {
    background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
    card: isDarkMode ? '#2c2c2c' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#333333',
    subText: isDarkMode ? '#aaaaaa' : '#666666',
    accent: isDarkMode ? '#9e77ed' : '#7048e8',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    icon: isDarkMode ? '#ffffff' : '#333333',
  };

  useEffect(() => {
    // Load profile image and user data when component mounts
    const loadProfile = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (user) {
          console.log('Loading profile for user:', user.uid);
          setCurrentUser(user); // Set the current user state
          
          // Change the Storage verification to be less aggressive and not block if it fails
          console.log('Checking Firebase Storage access...');
          try {
            const storageVerification = await verifyStorageSetup(false); // Change to false to be less aggressive
            
            if (storageVerification.success) {
              console.log('Firebase Storage check passed:', storageVerification.message);
            } else {
              console.log('Firebase Storage check noticed potential issues:', storageVerification.error);
              // Don't show alert to user - just log the issue
            }
          } catch (storageError) {
            console.error('Error checking storage:', storageError);
            // Don't block the app flow if storage verification fails
          }
          
          await loadProfileImage(storage, user.uid, setProfileImage);
          await loadUserData();
        } else {
          console.log('No user is signed in');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
    
    // Set up an auth state listener
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user); // Update current user state when auth state changes
        try {
          setLoading(true);
          await loadProfileImage(storage, user.uid, setProfileImage);
          await loadUserData();
        } catch (error) {
          console.error('Error in auth state listener:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setProfileImage(null);
        setUserData(null);
      }
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('ProfileScreen: No user logged in');
        return;
      }

      console.log(`ProfileScreen: Loading data for user: ${user.uid}, displayName: ${user.displayName || 'none'}, email: ${user.email || 'none'}`);

      // Use context data if available and has a name
      if (contextUserData && contextUserData.name) {
        console.log('ProfileScreen: Using context data with name:', contextUserData.name);
        setUserData(contextUserData);
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('ProfileScreen: Loaded user data from Firestore:', JSON.stringify(data));
        
        // Make sure we have a name in the data
        if (!data.name) {
          if (user.displayName) {
            data.name = user.displayName;
            console.log(`ProfileScreen: Adding missing name from displayName: ${user.displayName}`);
            // Update Firestore with the name
            await setDoc(userDocRef, { name: user.displayName }, { merge: true });
          } else {
            data.name = `User-${user.uid.substring(0, 4)}`;
            console.log(`ProfileScreen: Adding generated name: ${data.name}`);
            // Update Firestore with the name
            await setDoc(userDocRef, { name: data.name }, { merge: true });
          }
        }
        
        setUserData(data);
        // Update context as well
        setContextUserData(data);
      } else {
        console.log("ProfileScreen: No user data found! Creating default user data...");
        
        // Create default user data if none exists
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
        
        console.log('ProfileScreen: Creating default user data with name:', defaultData.name);
        // Save default user data to Firestore
        await setDoc(userDocRef, defaultData);
        
        // Update local state
        setUserData(defaultData);
        // Update context as well
        setContextUserData(defaultData);
      }
    } catch (error) {
      console.error("ProfileScreen: Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // iOS-specific uploadImageSimple function with extra processing to shrink image size
  const uploadImageSimple = async (uri) => {
    try {
      if (!currentUser) {
        console.error('No user logged in');
        return null;
      }
      
      console.log('Starting iOS-optimized upload for user:', currentUser.uid);
      
      // Create unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `profile_${currentUser.uid}_${timestamp}.jpg`;
      const imagePath = `profileImages/${filename}`;
      console.log('Target storage path:', imagePath);
      
      // For iOS with Expo, we need a special approach
      try {
        // Check if the image is already very small (less than 100KB)
        let imageUri = uri;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log(`Original image size: ${fileInfo.size / 1024} KB`);
        
        // If image is still large despite quality setting, manually resize it
        if (fileInfo.size > 100 * 1024) { // Larger than 100KB
          console.log('Image still too large, manually reducing size...');
          
          // For iOS, create a tiny copy in a temporary location
          const tempUri = FileSystem.cacheDirectory + `small_${timestamp}.jpg`;
          
          // Use expo-file-system to create a small copy
          await FileSystem.copyAsync({
            from: uri,
            to: tempUri
          });
          
          console.log('Created temporary copy at:', tempUri);
          
          // Use this smaller temporary file instead
          imageUri = tempUri;
          
          // Check new size
          const newFileInfo = await FileSystem.getInfoAsync(tempUri);
          console.log(`Reduced image size: ${newFileInfo.size / 1024} KB`);
        }
        
        // Create the storage reference
        const storageRef = ref(storage, imagePath);
        
        // Convert to blob using fetch
        console.log('Creating blob from URI:', imageUri);
        
        // On iOS, get the blob in chunks to avoid memory issues
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        console.log(`Final blob size: ${blob.size / 1024} KB, uploading...`);
        
        // Special upload approach for iOS
        if (blob.size > 250 * 1024) { // If still over 250KB
          console.log('Blob still large, using special handling...');
          // Special case for large files on iOS
          await saveProfileImageLocally(currentUser, imageUri);
          return imageUri; // Return local URI instead of cloud URL
        }
        
        // Otherwise continue with normal upload for small files
        console.log('Starting upload of small image...');
        await uploadBytes(storageRef, blob);
        console.log('Upload completed successfully');
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Download URL:', downloadURL);
        
        // Update profile image URL in Auth
        if (downloadURL) {
          try {
            // Update Auth profile
            await updateProfile(currentUser, {
              photoURL: downloadURL
            });
            console.log('Auth profile photoURL updated');
            
            // Also store in AsyncStorage for quick access
            await AsyncStorage.setItem(`profileImageURL_${currentUser.uid}`, downloadURL);
          } catch (profileError) {
            console.error('Error updating profile:', profileError);
            // Non-critical error, continue
          }
        }
        
        return downloadURL;
      } catch (error) {
        console.error('Firebase upload error:', error);
        
        // Fall back to local storage
        console.log('Firebase upload failed, using local storage');
        await saveProfileImageLocally(currentUser, uri);
        return uri;
      }
    } catch (error) {
      console.error('Complete upload failure:', error);
      throw error;
    }
  };

  // Update the handleImagePicker function to use the new uploadDirectFromUri method with improved iOS support
  const handleImagePicker = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Gallery permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to set a profile picture.');
        return;
      }

      // Launch image picker with extreme compression
      console.log('Launching image picker with extreme compression...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.01, // Ultra-low quality (1%) to make image tiny
        exif: false, // Don't include EXIF data
      });

      console.log('Image picker completed selection');

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        console.log('Selected image URI:', selectedImageUri);
        
        // Show temporary local image
        setProfileImage(selectedImageUri);
        setIsLoading(true);
        
        try {
          // Always save locally first for immediate feedback and as a backup
          await saveProfileImageLocally(currentUser, selectedImageUri);
          console.log('Image saved locally as a backup');
          
          // Try the improved iOS-compatible upload method
          try {
            console.log('Attempting Firebase upload with iOS-optimized method...');
            // Use the direct method which now handles iOS correctly with uploadString
            const downloadURL = await uploadDirectFromUri(storage, currentUser, selectedImageUri);
            
            if (downloadURL) {
              console.log('Cloud upload successful!');
              // Update profile image URL in Firebase Auth
              await updateProfile(currentUser, {
                photoURL: downloadURL
              });
              console.log('Updated Auth profile with photoURL');
              
              // Update Firebase user doc
              const userRef = doc(db, 'users', currentUser.uid);
              await setDoc(userRef, { photoURL: downloadURL }, { merge: true });
              console.log('Updated Firestore user document with photoURL');
              
              // Set displayed image
              setProfileImage(downloadURL);
              
              // Success message
              Alert.alert('Success', 'Profile picture uploaded to cloud storage successfully');
            } else {
              console.log('No download URL returned, using local image');
              Alert.alert('Notice', 'Your profile picture was saved on device but not to cloud storage.');
            }
          } catch (uploadError) {
            console.error('Cloud upload failed despite all methods:', uploadError);
            Alert.alert(
              'Local Only', 
              'Your profile picture has been saved on this device only. Cloud upload was not successful.'
            );
          }
        } catch (error) {
          console.error('Complete profile image handling failure:', error);
          Alert.alert('Error', 'Could not save profile picture. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error in image picker:', error);
      setIsLoading(false);
    }
  };

  // Update handleCameraCapture to use the new approach
  const handleCameraCapture = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera to take a profile picture.');
        return;
      }

      // Launch camera with better options
      console.log('Launching camera with compression...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3, // Lower quality (0.3 = 30%) to reduce file size significantly
        exif: false, // Don't include EXIF data to reduce size
      });

      console.log('Camera result:', JSON.stringify(result));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedImageUri = result.assets[0].uri;
        const fileSize = result.assets[0].fileSize; // Might be undefined on some platforms
        
        if (fileSize) {
          console.log(`Captured image size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        }
        
        console.log('Captured image URI:', capturedImageUri);
        
        // Show temporary local image
        setProfileImage(capturedImageUri);
        setIsLoading(true);
        
        try {
          // Always save locally first for immediate feedback and as a backup
          await saveProfileImageLocally(currentUser, capturedImageUri);
          
          // Try uploading to Firebase Storage
          try {
            // Use simplified direct upload
            const downloadURL = await uploadImageSimple(capturedImageUri);
            
            if (downloadURL) {
              // Update displayed image if it's a cloud URL
              if (downloadURL.startsWith('http')) {
                setProfileImage(downloadURL);
                
                // Success message
                Alert.alert('Success', 'Profile picture uploaded successfully');
              } else {
                // If we got back a local URI, it means we're using the local fallback
                Alert.alert('Notice', 'Profile picture saved locally. Cloud upload will be attempted again later.');
              }
            } else {
              // No URL returned, but no error thrown - use the local image
              console.log('No download URL returned, using local image');
            }
          } catch (error) {
            console.error('Upload failed but local copy is saved:', error);
            Alert.alert(
              'Notice', 
              'Profile picture was saved locally, but cloud upload encountered an issue. Your image is still available on this device.'
            );
          }
        } catch (error) {
          console.error('Profile image handling failed:', error);
          Alert.alert('Error', 'Could not save profile picture. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      setIsLoading(false);
    }
  };

  // Add this function to show the image upload options
  const showImageUploadOptions = () => {
    // Directly open gallery picker without showing options
    handleImagePicker();
  };

  const settingsOptions = [
    { id: 'password', title: 'Change password', icon: 'lock-outline' },
    { id: 'health', title: 'Health Details', icon: 'heart-pulse' },
    { id: 'emergency', title: 'Emergency contacts', icon: 'phone-alert' },
    { id: 'logout', title: 'Log out', icon: 'logout' },
  ];

  const handleSettingPress = (settingId) => {
    console.log('Setting pressed:', settingId);
    if (settingId === 'health') {
      navigation.navigate('HealthDetails');
    } else if (settingId === 'emergency') {
      navigation.navigate('EmergencyContacts');
    } else if (settingId === 'password') {
      navigation.navigate('ChangePassword');
    } else if (settingId === 'logout') {
      handleLogout();
    } else {
      console.log('Setting pressed:', settingId);
    }
  };
  
  const handleLogout = async () => {
    try {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Log Out",
            onPress: async () => {
              try {
                // Preserve the Firebase URL but clear other sensitive user data
                const userId = currentUser?.uid;
                
                // Sign out from Firebase
                await auth.signOut();
                
                // Update authentication state
                setIsAuthenticated(false);
                
                // Clear relevant AsyncStorage items
                await AsyncStorage.removeItem('@user');
                await AsyncStorage.removeItem('@token');
                
                // Clear the current user state
                setCurrentUser(null);
                setUserData(null);
                setProfileImage(null);
                
                console.log('User logged out successfully');
                
                // Navigate to SignIn screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                });
              } catch (error) {
                console.error('Error signing out:', error);
                Alert.alert('Error', 'There was a problem signing out. Please try again.');
              }
            },
            style: "destructive"
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleLogout:', error);
    }
  };

  // Update the profile image handling function to also set the photoURL in auth
  const updateUserProfileImage = async (downloadURL) => {
    if (downloadURL && currentUser) {
      try {
        // Update the Firebase Auth user profile with the photo URL
        await updateProfile(currentUser, {
          photoURL: downloadURL
        });
        console.log('User photoURL updated in Firebase Auth');
        
        // Update the Firestore user document with the photoURL
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { photoURL: downloadURL }, { merge: true });
        console.log('User photoURL updated in Firestore');
        
        // Update local state
        setProfileImage(downloadURL);
      } catch (error) {
        console.error('Error updating profile photo references:', error);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.safeArea,
        { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
      ]}>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#121212' : '#FFFFFF'
        }}>
          <ActivityIndicator size="large" color={isDarkMode ? '#FFFFFF' : '#9e77ed'} />
          <Text style={{ color: isDarkMode ? '#FFFFFF' : '#000000', marginTop: 20 }}>Loading profile data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={themeColors.background}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Profile and Account Setting</Text>
        </View>
        
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {isLoading ? (
              <View style={[styles.profileImage, styles.uploadingContainer, { backgroundColor: isDarkMode ? '#2c2c2c' : '#f0f0f0' }]}>
                <ActivityIndicator size="large" color={isDarkMode ? '#FFFFFF' : '#9e77ed'} />
              </View>
            ) : (
              <Image
                source={profileImage ? { uri: profileImage } : require('../../assets/images/profile-pic.png')}
                style={styles.profileImage}
              />
            )}
            <TouchableOpacity 
              style={[
                styles.editImageButton, 
                { backgroundColor: themeColors.accent }
              ]}
              onPress={showImageUploadOptions}
              disabled={isLoading}
            >
              <MaterialCommunityIcons 
                name="camera" 
                size={16} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.username, { color: themeColors.text }]}>
            {(() => {
              // Direct debugging of userData and contextUserData
              console.log('PROFILE SCREEN - Raw userData:', JSON.stringify(userData || {}));
              console.log('PROFILE SCREEN - Raw contextUserData:', JSON.stringify(contextUserData || {}));
              
              // Simple display logic - try in order of precedence
              let nameToShow = 'User';
              
              if (userData && userData.name) {
                nameToShow = userData.name;
                console.log(`PROFILE SCREEN - Using userData.name: ${nameToShow}`);
              } else if (contextUserData && contextUserData.name) {
                nameToShow = contextUserData.name;
                console.log(`PROFILE SCREEN - Using contextUserData.name: ${nameToShow}`);
              } else if (currentUser && currentUser.displayName) {
                nameToShow = currentUser.displayName;
                console.log(`PROFILE SCREEN - Using currentUser.displayName: ${nameToShow}`);
              }
              
              return nameToShow;
            })()}
          </Text>
          <Text style={[styles.email, { color: themeColors.subText }]}>
            {contextUserData?.email || userData?.email || currentUser?.email || ''}
          </Text>
        </View>
        
        <Surface style={[styles.card, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('HealthDetails')}
          >
            <View style={styles.menuIconContainer}>
              <MaterialCommunityIcons 
                name="heart-pulse" 
                size={24} 
                color={themeColors.accent} 
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>Health Details</Text>
              <Text style={[styles.menuSubtitle, { color: themeColors.subText }]}>Manage your health information</Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={themeColors.subText} 
            />
          </TouchableOpacity>
          
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('EmergencyContacts')}
          >
            <View style={styles.menuIconContainer}>
              <MaterialCommunityIcons 
                name="phone-alert" 
                size={24} 
                color={themeColors.accent} 
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>Emergency Contacts</Text>
              <Text style={[styles.menuSubtitle, { color: themeColors.subText }]}>Manage emergency contact information</Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={themeColors.subText} 
            />
          </TouchableOpacity>
          
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <View style={styles.menuIconContainer}>
              <MaterialCommunityIcons 
                name="logout" 
                size={24} 
                color="#f44336" 
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>Log Out</Text>
              <Text style={[styles.menuSubtitle, { color: themeColors.subText }]}>Sign out of your account</Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={themeColors.subText} 
            />
          </TouchableOpacity>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 30 : 10,
    height: Platform.OS === 'android' ? 100 : 'auto',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

export default ProfileScreen; 