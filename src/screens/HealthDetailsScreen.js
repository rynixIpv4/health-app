import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  Image,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Text, Surface, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import Slider from '@react-native-community/slider';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { loadProfileImage } from '../utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const HealthDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { userData, setUserData, currentUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(null);

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
    inputBg: isDarkMode ? '#2c2c2c' : '#f1f3f5',
    inputBorder: isDarkMode ? '#444444' : '#ced4da',
  };

  useEffect(() => {
    loadUserData();
    if (currentUser) {
      loadProfileImage(storage, currentUser.uid, setProfileImage);
    }
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      if (!currentUser) {
        console.log('No user is signed in');
        setLoading(false);
        return;
      }

      // Try to load from AsyncStorage first (faster)
      const cachedData = await AsyncStorage.getItem(`userData_${currentUser.uid}`);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Convert dateOfBirth to Date object if it exists
        if (parsedData.dateOfBirth) {
          parsedData.dateOfBirth = new Date(parsedData.dateOfBirth);
        }
        setEditData(parsedData);
        setUserData(parsedData);
      }

      // Then load from Firestore (source of truth)
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const firestoreData = userDoc.data();
        console.log('User data loaded from Firestore:', firestoreData);
        
        // Create a complete user data object with all required fields
        const fullUserData = {
          firstName: firestoreData.firstName || '',
          lastName: firestoreData.lastName || '',
          name: firestoreData.name || '',
          email: firestoreData.email || currentUser.email || '',
          dateOfBirth: firestoreData.dateOfBirth ? new Date(firestoreData.dateOfBirth.seconds * 1000) : new Date(),
          gender: firestoreData.gender || 'male',
          bloodType: firestoreData.bloodType || 'A+',
          height: firestoreData.height || 180,
          weight: firestoreData.weight || 80,
          medicalConditions: firestoreData.medicalConditions || 'None',
          medications: firestoreData.medications || 'None',
          allergies: firestoreData.allergies || 'None',
          isPregnant: firestoreData.isPregnant || false,
          pregnancyNotes: firestoreData.pregnancyNotes || '',
          lastUpdated: firestoreData.lastUpdated || new Date().toISOString(),
          healthData: {
            heartRate: firestoreData.healthData?.heartRate || 78,
            cycling: firestoreData.healthData?.cycling || 24,
            steps: firestoreData.healthData?.steps || 15000,
            sleep: firestoreData.healthData?.sleep || 8,
          }
        };
        
        console.log('Full user data prepared:', fullUserData);
        setEditData(fullUserData);
        setUserData(fullUserData);
        
        // Update AsyncStorage with the latest data
        await AsyncStorage.setItem(`userData_${currentUser.uid}`, JSON.stringify(fullUserData));
      } else {
        console.log('No user data found in Firestore');
        // Create default data if none exists
        const defaultData = {
          firstName: '',
          lastName: '',
          name: '',
          email: currentUser.email || '',
          dateOfBirth: new Date(),
          gender: 'male',
          bloodType: 'A+',
          height: 180,
          weight: 80,
          medicalConditions: 'None',
          medications: 'None',
          allergies: 'None',
          isPregnant: false,
          pregnancyNotes: '',
          lastUpdated: new Date().toISOString(),
          healthData: {
            heartRate: 78,
            cycling: 24,
            steps: 15000,
            sleep: 8,
          }
        };
        setEditData(defaultData);
        setUserData(defaultData);
        
        // Save default data to Firestore
        await setDoc(userRef, defaultData);
        await AsyncStorage.setItem(`userData_${currentUser.uid}`, JSON.stringify(defaultData));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (['heartRate', 'steps', 'sleep', 'cycling'].includes(field)) {
      // For health metrics, update the nested healthData object
      setEditData(prev => ({
        ...prev,
        healthData: {
          ...prev.healthData,
          [field]: value
        }
      }));
    } else {
      // For regular fields, update directly
      setEditData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleGenderSelect = (gender) => {
    setEditData({ ...editData, gender });
  };

  const handleSave = async () => {
    try {
      // Ensure we have a valid user
      if (!currentUser || !currentUser.uid) {
        Alert.alert('Error', 'User not found. Please sign in again.');
        return;
      }

      console.log('Saving health details with data:', JSON.stringify(editData));

      // Prepare the data to save
      const userDataToSave = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        name: `${editData.firstName} ${editData.lastName}`,
        email: currentUser.email,
        dateOfBirth: editData.dateOfBirth,
        gender: editData.gender,
        bloodType: editData.bloodType,
        height: parseInt(editData.height) || 180,
        weight: parseInt(editData.weight) || 80,
        medicalConditions: editData.medicalConditions || 'None',
        medications: editData.medications || 'None',
        allergies: editData.allergies || 'None',
        isPregnant: editData.isPregnant,
        pregnancyNotes: editData.pregnancyNotes || '',
        lastUpdated: new Date().toISOString(),
        healthData: {
          heartRate: parseInt(editData.healthData?.heartRate) || 78,
          cycling: parseInt(editData.healthData?.cycling) || 24,
          steps: parseInt(editData.healthData?.steps) || 15000,
          sleep: parseInt(editData.healthData?.sleep) || 8,
        }
      };

      // Update in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, userDataToSave);

      // Update local state
      setUserData(userDataToSave);
      
      // Save to AsyncStorage as backup
      await AsyncStorage.setItem(`userData_${currentUser.uid}`, JSON.stringify(userDataToSave));

      setIsEditing(false);
      Alert.alert('Success', 'Health details updated successfully!');
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    
    try {
      // Ensure it's a Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if valid date
      if (isNaN(dateObj.getTime())) return 'Not set';
      
      // Format: MM/DD/YYYY
      return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'Not set';
    }
  };

  const formatHeight = (cm) => {
    if (!cm) return '';
    const feet = Math.floor(cm / 30.48);
    const inches = Math.round((cm % 30.48) / 2.54);
    return `${feet}'${inches}"`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        handleInputChange('dateOfBirth', selectedDate);
      }
    } else {
      // On iOS, just update the temp date without closing the picker
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const confirmIOSDate = () => {
    if (tempDate) {
      handleInputChange('dateOfBirth', tempDate);
    }
    setShowDatePicker(false);
  };

  const cancelDateSelection = () => {
    setTempDate(null);
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    // Initialize tempDate with the current value
    setTempDate(ensureValidDate(editData?.dateOfBirth));
    setShowDatePicker(true);
  };

  // Helper to ensure we have a valid Date object
  const ensureValidDate = (dateValue) => {
    if (!dateValue) return new Date();
    
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // If it's a Firestore timestamp
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }
    
    return new Date();
  };

  const renderSection = (title, icon, children) => (
    <Surface style={[styles.section, { backgroundColor: themeColors.card }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(158, 119, 237, 0.1)' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={themeColors.accent} />
        </View>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{title}</Text>
      </View>
      {children}
    </Surface>
  );

  const renderDetailRow = (label, value, icon = null, field = null, type = 'text') => {
    // For health data metrics, we need to get the value from the healthData object
    const isHealthMetric = ['heartRate', 'steps', 'sleep', 'cycling'].includes(field);
    let inputValue = '';
    
    if (isHealthMetric && editData?.healthData) {
      inputValue = (editData.healthData[field] || '').toString();
    } else if (field && editData) {
      inputValue = (editData[field] || '').toString();
    }
    
    // Format the display value based on the field type
    let displayValue = value;
    if (isHealthMetric) {
      switch (field) {
        case 'heartRate':
          displayValue = `${editData?.healthData?.heartRate || 78} bpm`;
          break;
        case 'steps':
          displayValue = `${(editData?.healthData?.steps || 15000).toLocaleString()} steps`;
          break;
        case 'sleep':
          displayValue = `${editData?.healthData?.sleep || 8} hrs`;
          break;
        case 'cycling':
          displayValue = `${editData?.healthData?.cycling || 24} min`;
          break;
      }
    } else if (field === 'height') {
      displayValue = formatHeight(editData?.height || 180);
    } else if (field === 'weight') {
      displayValue = editData?.weight ? `${editData.weight} kg` : '80 kg';
    } else if (field === 'dateOfBirth') {
      displayValue = formatDate(editData?.dateOfBirth || new Date());
    }
    
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailLabelContainer}>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={16}
              color={themeColors.subText}
              style={styles.detailIcon}
            />
          )}
          <Text style={[styles.detailLabel, { color: themeColors.subText }]}>{label}</Text>
        </View>
        {isEditing ? (
          type === 'text' ? (
            <TextInput
              style={[styles.input, {
                backgroundColor: themeColors.inputBg,
                color: themeColors.text,
                borderColor: themeColors.inputBorder,
              }]}
              value={inputValue}
              onChangeText={(text) => handleInputChange(field, isHealthMetric ? text : text)}
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor={themeColors.subText}
              keyboardType={isHealthMetric || field === 'height' || field === 'weight' ? 'numeric' : 'default'}
            />
          ) : type === 'date' ? (
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: themeColors.inputBg }]}
              onPress={showDatePickerModal}
            >
              <Text style={[styles.dateButtonText, { color: themeColors.text }]}>
                {formatDate(editData?.dateOfBirth)}
              </Text>
            </TouchableOpacity>
          ) : type === 'gender' ? (
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  editData.gender === 'male' && styles.genderButtonSelected,
                  {
                    backgroundColor: editData.gender === 'male'
                      ? themeColors.accent + '30'
                      : themeColors.inputBg
                  }
                ]}
                onPress={() => handleGenderSelect('male')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    { color: editData.gender === 'male' ? themeColors.accent : themeColors.text }
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  editData.gender === 'female' && styles.genderButtonSelected,
                  {
                    backgroundColor: editData.gender === 'female'
                      ? themeColors.accent + '30'
                      : themeColors.inputBg
                  }
                ]}
                onPress={() => handleGenderSelect('female')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    { color: editData.gender === 'female' ? themeColors.accent : themeColors.text }
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  editData.gender === 'other' && styles.genderButtonSelected,
                  {
                    backgroundColor: editData.gender === 'other'
                      ? themeColors.accent + '30'
                      : themeColors.inputBg
                  }
                ]}
                onPress={() => handleGenderSelect('other')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    { color: editData.gender === 'other' ? themeColors.accent : themeColors.text }
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        ) : (
          <Text style={[styles.detailValue, { color: themeColors.text }]}>
            {displayValue || 'Not set'}
          </Text>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
      padding: 16,
      paddingTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
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
    editButton: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editButtonText: {
      fontWeight: '500',
      marginLeft: 4,
    },
    profileImageContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    detailsCard: {
      borderRadius: 12,
      padding: 16,
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
    divider: {
      height: 1,
      backgroundColor: '#e0e0e0',
    },
    editButtonsContainer: {
      flexDirection: 'row',
    },
    editActionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginLeft: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontWeight: '500',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    section: {
      borderRadius: 16,
      padding: 16,
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    detailLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailIcon: {
      marginRight: 8,
    },
    detailLabel: {
      fontSize: 14,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '500',
    },
    input: {
      width: 150,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    dateButton: {
      width: 150,
      height: 40,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    dateButtonText: {
      fontSize: 16,
    },
    genderContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    genderButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    genderButtonSelected: {
      backgroundColor: '#9e77ed',
      borderColor: '#9e77ed',
    },
    genderButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    datePickerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      padding: 10,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
    },
    datePickerCloseButton: {
      alignSelf: 'flex-end',
      marginBottom: 5,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={themeColors.background}
        />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themeColors.background
        }}>
          <ActivityIndicator size="large" color={themeColors.accent} />
          <Text style={{ color: themeColors.text, marginTop: 16 }}>Loading health details...</Text>
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
      
      <View style={{ flex: 1 }}>
        <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
          {/* Header with back button and edit/save buttons */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={[
                styles.backButton,
                { backgroundColor: themeColors.card }
              ]}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="chevron-left" 
                size={24} 
                color={themeColors.text} 
              />
            </TouchableOpacity>
            <Text style={[
              styles.headerTitle,
              { color: themeColors.text }
            ]}>Health Details</Text>
            {isEditing ? (
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.editActionButton,
                    { backgroundColor: themeColors.inputBg }
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={[
                    styles.cancelButtonText,
                    { color: themeColors.text }
                  ]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.editActionButton,
                    { backgroundColor: themeColors.accent }
                  ]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.editButton,
                  { backgroundColor: isDarkMode ? '#ffffff' : '#000000' }
                ]}
                onPress={() => setIsEditing(true)}
              >
                <MaterialCommunityIcons name="pencil" size={16} color={isDarkMode ? '#000000' : '#ffffff'} />
                <Text style={[styles.editButtonText, { color: isDarkMode ? '#000000' : '#ffffff' }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../assets/images/profile-pic.png')}
              style={styles.profileImage}
            />
          </View>
          
          {/* Basic Information Section */}
          {renderSection('Basic Information', 'account', (
            <>
              {renderDetailRow('Date of Birth', formatDate(editData?.dateOfBirth), 'calendar', 'dateOfBirth', 'date')}
              {renderDetailRow('Gender', editData?.gender === 'male' ? 'Male' : editData?.gender === 'female' ? 'Female' : 'Not set', 'gender-male-female', 'gender', 'gender')}
              {renderDetailRow('Height', formatHeight(editData?.height), 'human-male-height', 'height')}
              {renderDetailRow('Weight', editData?.weight ? `${editData.weight} kg` : 'Not set', 'scale', 'weight')}
              {renderDetailRow('Blood Type', editData?.bloodType || 'Not set', 'water', 'bloodType')}
            </>
          ))}

          {/* Medical Information Section */}
          {renderSection('Medical Information', 'medical-bag', (
            <>
              {renderDetailRow('Medical Conditions', editData?.medicalConditions || 'None', 'heart-pulse', 'medicalConditions')}
              {renderDetailRow('Medications', editData?.medications || 'None', 'pill', 'medications')}
              {renderDetailRow('Allergies', editData?.allergies || 'None', 'alert-circle', 'allergies')}
            </>
          ))}

          {/* Pregnancy Information Section */}
          {renderSection('Pregnancy Information', 'baby-face-outline', (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <MaterialCommunityIcons
                    name="baby-face-outline"
                    size={16}
                    color={themeColors.subText}
                    style={styles.detailIcon}
                  />
                  <Text style={[styles.detailLabel, { color: themeColors.subText }]}>Pregnant</Text>
                </View>
                <Switch
                  value={editData?.isPregnant || false}
                  onValueChange={(value) => handleInputChange('isPregnant', value)}
                  color={themeColors.accent}
                />
              </View>
              {editData?.isPregnant && (
                <>
                  {renderDetailRow('Pregnancy Notes', editData?.pregnancyNotes || 'None', 'note-text', 'pregnancyNotes')}
                </>
              )}
            </>
          ))}
        </ScrollView>

        {showDatePicker && (
          <View style={[
            styles.datePickerContainer,
            { 
              backgroundColor: themeColors.card,
              borderWidth: 1,
              borderColor: themeColors.divider,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }
          ]}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 10,
              borderBottomWidth: 1,
              borderBottomColor: themeColors.divider,
              paddingBottom: 10,
              marginBottom: 10
            }}>
              <TouchableOpacity 
                onPress={cancelDateSelection}
              >
                <Text style={{ color: themeColors.accent, fontWeight: 'bold', padding: 10 }}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 16 }}>Select Date</Text>
              
              <TouchableOpacity 
                style={styles.datePickerCloseButton}
                onPress={Platform.OS === 'ios' ? confirmIOSDate : () => setShowDatePicker(false)}
              >
                <Text style={{ color: themeColors.accent, fontWeight: 'bold', padding: 10 }}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {Platform.OS === 'android' ? (
              <DateTimePicker
                testID="datePicker"
                value={ensureValidDate(editData?.dateOfBirth)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
                themeVariant={isDarkMode ? 'dark' : 'light'}
              />
            ) : (
              <DateTimePicker
                testID="datePicker"
                value={tempDate || ensureValidDate(editData?.dateOfBirth)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={{ width: '100%' }}
                themeVariant={isDarkMode ? 'dark' : 'light'}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default HealthDetailsScreen; 