import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db, sendVerificationEmail } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

// Create a simplified dropdown for country codes
const COUNTRY_CODES = [
  { code: 'AU', name: 'Australia', callingCode: '61' },
  { code: 'US', name: 'United States', callingCode: '1' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44' },
  { code: 'IN', name: 'India', callingCode: '91' },
  { code: 'CA', name: 'Canada', callingCode: '1' },
];

const { height } = Dimensions.get('window');

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { setIsAuthenticated, setUserData } = useUser();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Country picker state - simplified
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^\+[1-9]\d{1,14}$/;

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (format: +1234567890)';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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
              borderColor: errors.phoneNumber ? themeColors.error : themeColors.inputBorder 
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

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Input validation
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
        setError('Please fill out all required fields.');
        setIsLoading(false);
        return;
      }

      // Phone number validation (now required)
      if (!phoneNumber.trim()) {
        setError('Phone number is required for account verification.');
        setIsLoading(false);
        return;
      }

      // Format the phone number with country code
      const formattedPhoneNumber = `+${selectedCountry.callingCode}${phoneNumber.replace(/[\s()-]/g, '')}`;

      // Password validation
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setIsLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Set display name (firstName + lastName)
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(user, { displayName });
      console.log(`SignUp: Set display name to: ${displayName} for user: ${user.uid}`);

      // Send email verification
      const emailVerificationResult = await sendVerificationEmail(user);
      if (!emailVerificationResult.success) {
        console.error('Failed to send verification email:', emailVerificationResult.error);
      }

      // Create user data object
      const userData = {
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: formattedPhoneNumber,
        phoneVerified: false,
        emailVerified: false,
        createdAt: new Date(),
        dateOfBirth: new Date(),
        gender: 'male',
        bloodType: 'A+',
        height: parseInt(height) || 180,
        weight: 80,
        medicalConditions: 'None',
        medications: 'None',
        allergies: 'None',
        isPregnant: false,
        pregnancyNotes: '',
        healthData: {
          heartRate: 78,
          cycling: 24,
          steps: 15000,
          sleep: 8
        }
      };

      // Save user data to Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userData);
      console.log(`SignUp: Saved user data to Firestore with name: ${displayName} for user: ${user.uid}`);

      // Set user data in context
      setUserData(userData);

      // Log success
      console.log('User signed up and data saved successfully:', JSON.stringify(userData));

      // Show success message
      Alert.alert(
        'Account Created', 
        'Your account has been created! You need to verify your email and phone number before you can use the app.', 
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to verification screen
              navigation.navigate('PhoneSetup', { 
                phoneNumber: formattedPhoneNumber, 
                fromSettings: false,
                isNewAccount: true,
                userEmail: email
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error during sign up:', error);
      
      // Handle different error codes
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInNavigation = () => {
    navigation.navigate('SignIn');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.background}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Header with back button */}
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={[
                  styles.backButton, 
                  { backgroundColor: themeColors.inputBg }
                ]}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={themeColors.text}
                />
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: themeColors.text }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.subText }]}>
                Sign up to get started with Health Tracker
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* First Name Input */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                    First Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: themeColors.inputBg,
                        color: themeColors.inputText,
                        borderColor: errors.firstName ? themeColors.error : themeColors.inputBorder,
                      }
                    ]}
                    placeholder="First name"
                    placeholderTextColor={themeColors.placeholderText}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                  {errors.firstName && (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  )}
                </View>

                {/* Last Name Input */}
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                    Last Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: themeColors.inputBg,
                        color: themeColors.inputText,
                        borderColor: errors.lastName ? themeColors.error : themeColors.inputBorder,
                      }
                    ]}
                    placeholder="Last name"
                    placeholderTextColor={themeColors.placeholderText}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                  {errors.lastName && (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  )}
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                  Email
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: themeColors.inputBg,
                      color: themeColors.inputText,
                      borderColor: errors.email ? themeColors.error : themeColors.inputBorder,
                    }
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={themeColors.placeholderText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                  Phone
                </Text>
                <View style={styles.phoneInputContainer}>
                  {renderCountryPicker()}
                  
                  {/* Phone Number Input */}
                  <TextInput
                    style={[
                      styles.phoneInput,
                      { 
                        backgroundColor: themeColors.inputBg,
                        color: themeColors.inputText,
                        borderColor: errors.phoneNumber ? themeColors.error : themeColors.inputBorder,
                      }
                    ]}
                    placeholder="Phone number (digits only)"
                    placeholderTextColor={themeColors.placeholderText}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phoneNumber && (
                  <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                  Password
                </Text>
                <View style={[
                  styles.passwordInputWrapper,
                  { 
                    backgroundColor: themeColors.inputBg,
                    borderColor: errors.password ? themeColors.error : themeColors.inputBorder,
                  }
                ]}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      { color: themeColors.inputText }
                    ]}
                    placeholder="Create a password"
                    placeholderTextColor={themeColors.placeholderText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    style={styles.visibilityToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIconText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                  Confirm Password
                </Text>
                <View style={[
                  styles.passwordInputWrapper,
                  { 
                    backgroundColor: themeColors.inputBg,
                    borderColor: errors.confirmPassword ? themeColors.error : themeColors.inputBorder,
                  }
                ]}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      { color: themeColors.inputText }
                    ]}
                    placeholder="Confirm your password"
                    placeholderTextColor={themeColors.placeholderText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity 
                    style={styles.visibilityToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeIconText}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signUpButton, 
                  { backgroundColor: themeColors.primary },
                  isLoading && styles.disabledButton
                ]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={[styles.signInText, { color: themeColors.subText }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={handleSignInNavigation}>
                <Text style={[styles.signInLink, { color: themeColors.primary }]}>
                  {' Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  headerContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    width: '48%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  visibilityToggle: {
    padding: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  signUpButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 16,
  },
  signInLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  eyeIconText: {
    fontSize: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
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
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  flagButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default SignUpScreen; 