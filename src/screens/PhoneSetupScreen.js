import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { auth, db, sendPhoneVerificationCode, app } from '../firebase';
import CustomRecaptcha from '../components/CustomRecaptcha';

// Create a simplified dropdown for country codes
const COUNTRY_CODES = [
  { code: 'AU', name: 'Australia', callingCode: '61' },
  { code: 'US', name: 'United States', callingCode: '1' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44' },
  { code: 'IN', name: 'India', callingCode: '91' },
  { code: 'CA', name: 'Canada', callingCode: '1' },
];

const PhoneSetupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { userData } = useUser();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifier = useRef(null);
  
  // Country picker state - simplified
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  // Get parameters from route
  const { fromSettings = true, phoneNumber: routePhoneNumber } = route.params || {};
  
  // Set phone number from route params or user data on component mount
  useEffect(() => {
    if (routePhoneNumber) {
      // If a phone number is provided, try to extract country code
      if (routePhoneNumber.startsWith('+')) {
        // This is a simplified approach - in a real app you might want to use a library for more accurate parsing
        const matches = routePhoneNumber.match(/^\+(\d+)/);
        if (matches && matches[1]) {
          const code = matches[1];
          // Find country by calling code
          const foundCountry = COUNTRY_CODES.find(country => {
            if (code.startsWith(country.callingCode)) {
              return true;
            }
            return false;
          });
          
          if (foundCountry) {
            setSelectedCountry(foundCountry);
          }
          
          // Set the phone number without the country code
          setPhoneNumber(routePhoneNumber.replace(/^\+\d+/, ''));
        } else {
          setPhoneNumber(routePhoneNumber.replace(/^\+/, ''));
        }
      } else {
        setPhoneNumber(routePhoneNumber);
      }
    } else if (userData?.phoneNumber) {
      // Same logic for phone number from user data
      if (userData.phoneNumber.startsWith('+')) {
        const matches = userData.phoneNumber.match(/^\+(\d+)/);
        if (matches && matches[1]) {
          const code = matches[1];
          const foundCountry = COUNTRY_CODES.find(country => {
            if (code.startsWith(country.callingCode)) {
              return true;
            }
            return false;
          });
          
          if (foundCountry) {
            setSelectedCountry(foundCountry);
          }
          
          setPhoneNumber(userData.phoneNumber.replace(/^\+\d+/, ''));
        } else {
          setPhoneNumber(userData.phoneNumber.replace(/^\+/, ''));
        }
      } else {
        setPhoneNumber(userData.phoneNumber);
      }
    }
  }, [routePhoneNumber, userData]);

  const themeColors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    inputBg: isDarkMode ? '#1E1E1E' : '#F7F7F7',
    inputBorder: isDarkMode ? '#333333' : '#E5E5E5',
    inputText: isDarkMode ? '#FFFFFF' : '#000000',
    placeholderText: isDarkMode ? '#8E8E93' : '#8E8E93',
    primary: '#9E77ED', // Purple accent color
    error: '#FF3B30',
  };

  const validatePhoneNumber = (number) => {
    // Basic validation for phone number (without country code)
    const phoneRegex = /^\d{6,14}$/;
    return phoneRegex.test(number);
  };

  const handleSendVerification = async () => {
    // Format phone number - remove spaces, dashes, parentheses
    const cleanedNumber = phoneNumber.replace(/[\s()-]/g, '');
    
    // Add country code to phone number
    const fullPhoneNumber = `+${selectedCountry.callingCode}${cleanedNumber}`;
    
    // Validate phone number format
    if (!validatePhoneNumber(cleanedNumber)) {
      setError('Please enter a valid phone number (digits only)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!recaptchaVerifier.current) {
        setError('reCAPTCHA verification failed. Please try again.');
        return;
      }

      // Send verification code with formatted number
      const verificationResult = await sendPhoneVerificationCode(
        fullPhoneNumber,
        recaptchaVerifier.current
      );

      if (!verificationResult.success) {
        setError(verificationResult.error || 'Failed to send verification code. Please try again.');
        return;
      }

      // Navigate to verification screen with the verification ID
      navigation.navigate('PhoneVerification', {
        phoneNumber: fullPhoneNumber,
        verificationId: verificationResult.verificationId,
        fromSettings
      });
    } catch (error) {
      console.error('Phone verification error:', error);
      if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please check your country code and number.');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Replace country picker modal with this function
  const toggleCountryPicker = () => {
    setShowCountryPicker(!showCountryPicker);
  };

  // Replace country picker with a simple dropdown
  const renderCountryPicker = () => {
    return (
      <View>
        <TouchableOpacity 
          style={[
            styles.countryPickerButton, 
            { 
              backgroundColor: themeColors.inputBg,
              borderColor: error ? themeColors.error : themeColors.inputBorder 
            }
          ]}
          onPress={toggleCountryPicker}
        >
          <View style={styles.flagButtonContent}>
            <Text style={[styles.countryCodeText, { color: themeColors.text }]}>
              +{selectedCountry.callingCode}
            </Text>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={14} 
              color={themeColors.text} 
              style={{ marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>
        
        {showCountryPicker && (
          <View style={[
            styles.countryDropdown,
            { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }
          ]}>
            {COUNTRY_CODES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={styles.countryOption}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={{ color: themeColors.text }}>
                  {country.name} (+{country.callingCode})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <CustomRecaptcha
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.inputBg }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Phone Verification
          </Text>
        </View>

        <View style={styles.content}>
          <MaterialCommunityIcons
            name="cellphone"
            size={60}
            color={themeColors.primary}
            style={styles.icon}
          />

          <Text style={[styles.description, { color: themeColors.text }]}>
            Enter your phone number to enable two-factor authentication
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>
              Phone Number
            </Text>
            
            <View style={styles.phoneInputContainer}>
              {/* Replace CountryPicker with our custom dropdown */}
              {renderCountryPicker()}
              
              {/* Phone Number Input */}
              <TextInput
                style={[
                  styles.phoneInput,
                  {
                    backgroundColor: themeColors.inputBg,
                    color: themeColors.inputText,
                    borderColor: error ? themeColors.error : themeColors.inputBorder,
                  }
                ]}
                placeholder="Phone number (digits only)"
                placeholderTextColor={themeColors.placeholderText}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoFocus={!phoneNumber}
              />
            </View>
          </View>

          <Text style={[styles.hint, { color: themeColors.subText }]}>
            Select your country and enter your phone number without country code.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: themeColors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSendVerification}
            disabled={isLoading || !phoneNumber.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 25,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countryPickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginRight: 8,
  },
  countryPickerContainerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  flagButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  hint: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  countryDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: 200,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
    maxHeight: 200,
  },
  countryOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
});

export default PhoneSetupScreen; 