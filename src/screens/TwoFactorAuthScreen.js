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
import { auth, db, verify2FA, complete2FASignIn } from '../firebase';
import CustomRecaptcha from '../components/CustomRecaptcha';
import { app } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const TwoFactorAuthScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { setIsAuthenticated, setUserData } = useUser();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const recaptchaVerifier = useRef(null);
  
  // Get parameters from route
  const { resolver, email } = route.params || {};

  useEffect(() => {
    // Send verification code as soon as screen loads
    sendVerificationCode();
    
    // Start countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

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

  const sendVerificationCode = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (!resolver || !recaptchaVerifier.current) {
        setError('Authentication session expired. Please try logging in again.');
        setIsLoading(false);
        return;
      }

      // Get the first hint (should be the phone)
      const hint = resolver.hints[0];
      const phoneHint = hint.phoneNumber;
      setPhoneNumber(phoneHint);
      
      // Send verification code
      const result = await verify2FA(
        phoneHint,
        resolver,
        recaptchaVerifier.current
      );
      
      if (!result.success) {
        setError(result.error || 'Failed to send verification code');
        return;
      }
      
      setVerificationId(result.verificationId);
      
    } catch (error) {
      console.error('2FA verification error:', error);
      setError('Failed to start two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    // Reset countdown and resend flag
    setCountdown(60);
    setCanResend(false);
    // Resend verification code
    await sendVerificationCode();
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await complete2FASignIn(resolver, verificationId, verificationCode);
      
      if (!result.success) {
        setError(result.error || 'Failed to complete authentication');
        return;
      }
      
      const user = result.user;
      
      // Get user data from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      // Set user as authenticated
      setUserData(userData);
      setIsAuthenticated(true);
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code. Please try again.');
      } else {
        setError('Failed to verify code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
            Two-Factor Authentication
          </Text>
        </View>

        <View style={styles.content}>
          <MaterialCommunityIcons
            name="shield-check"
            size={60}
            color={themeColors.primary}
            style={styles.icon}
          />

          <Text style={[styles.description, { color: themeColors.text }]}>
            For your security, we need to verify your identity
          </Text>
          
          <Text style={[styles.emailText, { color: themeColors.primary }]}>
            {email}
          </Text>

          <Text style={[styles.verificationText, { color: themeColors.text }]}>
            Enter the 6-digit code sent to
          </Text>
          <Text style={[styles.phoneNumber, { color: themeColors.primary }]}>
            {phoneNumber}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.inputText,
                  borderColor: error ? themeColors.error : themeColors.inputBorder,
                }
              ]}
              placeholder="6-digit verification code"
              placeholderTextColor={themeColors.placeholderText}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={[styles.timerText, { color: themeColors.subText }]}>
              {canResend
                ? 'Didn\'t receive the code?'
                : `Resend code in ${countdown} seconds`}
            </Text>
          )}

          {canResend && (
            <TouchableOpacity onPress={handleResendCode}>
              <Text style={[styles.resendText, { color: themeColors.primary }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.verifyButton,
              { backgroundColor: themeColors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleVerifyCode}
            disabled={isLoading || !verificationCode}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify and Sign In</Text>
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
    marginBottom: 10,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  verificationText: {
    fontSize: 16,
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 8,
  },
  timerText: {
    fontSize: 14,
    marginBottom: 10,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default TwoFactorAuthScreen; 