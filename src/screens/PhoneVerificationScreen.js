import React, { useState, useEffect } from 'react';
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
import { 
  auth, 
  db, 
  verifyPhoneCode, 
  linkPhoneWithUser, 
  app, 
  sendVerificationEmail,
  enroll2FAFactor
} from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const PhoneVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { userData, setUserData, setIsAuthenticated } = useUser();
  
  const { 
    phoneNumber, 
    verificationId, 
    fromSettings = false, 
    isNewAccount = false,
    userEmail = '',
    enable2FA = false
  } = route.params || {};
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Check email verification status periodically if this is a new account
  useEffect(() => {
    if (isNewAccount) {
      const checkEmailVerification = async () => {
        // Reload user to get the latest verification status
        await auth.currentUser?.reload();
        const isVerified = auth.currentUser?.emailVerified || false;
        setEmailVerified(isVerified);
        
        if (isVerified) {
          // Update Firestore if email is verified
          const user = auth.currentUser;
          if (user) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { emailVerified: true });
            
            // Update local userData
            if (userData) {
              setUserData({
                ...userData,
                emailVerified: true
              });
            }
          }
        }
      };
      
      // Check immediately
      checkEmailVerification();
      
      // Then check every 10 seconds
      const interval = setInterval(checkEmailVerification, 10000);
      return () => clearInterval(interval);
    }
  }, [isNewAccount, userData, setUserData]);

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
    success: '#34C759', // Green for success states
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      
      // Verify the code
      const result = await verifyPhoneCode(verificationId, verificationCode);
      
      if (!result.success) {
        setError(result.error || 'Invalid verification code');
        setIsLoading(false);
        return;
      }
      
      // If verification is successful, update the user's profile
      if (user) {
        // If this is for 2FA enrollment
        if (enable2FA) {
          // Enroll the phone as a 2FA method
          console.log('Starting 2FA enrollment process with verification ID:', verificationId);
          
          try {
            const enrollResult = await enroll2FAFactor(user, verificationId, verificationCode);
            
            console.log('2FA enrollment result:', enrollResult);
            
            if (!enrollResult.success && !enrollResult.alreadyEnrolled) {
              console.error('2FA enrollment failed:', enrollResult.error);
              setError(enrollResult.error || 'Failed to set up 2FA');
              setIsLoading(false);
              return;
            }
            
            console.log('2FA enrollment successful or already enrolled, updating Firestore...');
          } catch (error) {
            console.log('Caught error during 2FA enrollment:', error);
            // If phone is already linked, continue with the flow
            if (error.code !== 'auth/provider-already-linked') {
              setError('Failed to set up 2FA: ' + error.message);
              setIsLoading(false);
              return;
            }
            console.log('Phone already linked, continuing with 2FA setup...');
          }
          
          // Update user data in Firestore regardless of enrollment path
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            phoneNumber: phoneNumber,
            phoneVerified: true,
            twoFactorEnabled: true
          });
          
          // Update local user data
          if (userData) {
            const updatedUserData = {
              ...userData,
              phoneNumber: phoneNumber,
              phoneVerified: true,
              twoFactorEnabled: true
            };
            setUserData(updatedUserData);
          }
          
          // Show success message
          Alert.alert(
            'Two-Factor Authentication Enabled',
            'Your phone number has been verified and two-factor authentication has been enabled for your account.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate('Security');
                },
              },
            ]
          );
          
          setIsLoading(false);
          return;
        }
        
        // Link phone with user for 2FA if requested
        if (fromSettings) {
          const linkResult = await linkPhoneWithUser(user, verificationId, verificationCode);
          if (!linkResult.success && !linkResult.treatAsSuccess) {
            setError(linkResult.error || 'Failed to set up 2FA');
            setIsLoading(false);
            return;
          }
        }
        
        // Update user data in Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          phoneNumber: phoneNumber,
          phoneVerified: true
        });
        
        // Update local user data
        if (userData) {
          const updatedUserData = {
            ...userData,
            phoneNumber: phoneNumber,
            phoneVerified: true
          };
          setUserData(updatedUserData);
        }
        
        // Show different success messages based on context
        if (isNewAccount) {
          // For new accounts, check if email is verified before allowing access
          if (emailVerified) {
            // Both phone and email are verified
            Alert.alert(
              'Verification Complete',
              'Your phone number and email have been verified. You can now use the app.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    setIsAuthenticated(true);
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainApp' }],
                    });
                  },
                },
              ]
            );
          } else {
            // Phone verified but email not verified
            Alert.alert(
              'Phone Verified',
              'Your phone number has been verified, but you still need to verify your email. Please check your inbox and click the verification link.',
              [
                {
                  text: 'Resend Email',
                  onPress: async () => {
                    if (user) {
                      await sendVerificationEmail(user);
                      Alert.alert('Email Sent', 'Verification email has been resent.');
                    }
                  },
                },
                {
                  text: 'OK',
                  onPress: () => {},
                },
              ]
            );
          }
        } else if (fromSettings) {
          // For settings screen verification
          Alert.alert(
            'Verification Successful',
            'Your phone number has been verified successfully.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate('Security');
                },
              },
            ]
          );
        } else {
          // For standalone verification
          Alert.alert(
            'Verification Successful',
            'Your phone number has been verified successfully.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainApp' }],
                  });
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      setError('Failed to verify phone number. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    // Navigate back to previous screen to request a new code
    navigation.goBack();
  };

  const handleResendEmail = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendVerificationEmail(user);
        Alert.alert('Email Sent', 'Verification email has been resent. Please check your inbox.');
      }
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
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
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.inputBg }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Verify Phone Number
          </Text>
        </View>

        <View style={styles.content}>
          <MaterialCommunityIcons
            name="cellphone-message"
            size={60}
            color={themeColors.primary}
            style={styles.icon}
          />

          <Text style={[styles.description, { color: themeColors.text }]}>
            Enter the 6-digit code sent to
          </Text>
          <Text style={[styles.phoneNumber, { color: themeColors.primary }]}>
            {phoneNumber}
          </Text>

          {isNewAccount && (
            <View style={styles.emailVerificationContainer}>
              <Text style={[styles.emailVerificationTitle, { color: themeColors.text }]}>
                Verification Status:
              </Text>
              <View style={styles.verificationStatusRow}>
                <MaterialCommunityIcons
                  name={emailVerified ? "check-circle" : "clock-outline"}
                  size={20}
                  color={emailVerified ? themeColors.success : themeColors.subText}
                />
                <Text 
                  style={[
                    styles.emailVerificationText, 
                    { 
                      color: emailVerified ? themeColors.success : themeColors.subText 
                    }
                  ]}
                >
                  Email Verification: {emailVerified ? 'Complete' : 'Pending'}
                </Text>
              </View>
              {!emailVerified && (
                <TouchableOpacity onPress={handleResendEmail}>
                  <Text style={[styles.resendEmailText, { color: themeColors.primary }]}>
                    Resend Verification Email
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.verificationStatusRow}>
                <MaterialCommunityIcons
                  name="progress-clock"
                  size={20}
                  color={themeColors.primary}
                />
                <Text style={[styles.emailVerificationText, { color: themeColors.primary }]}>
                  Phone Verification: In Progress
                </Text>
              </View>
            </View>
          )}

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
              <Text style={styles.verifyButtonText}>Verify</Text>
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
    marginBottom: 5,
    lineHeight: 22,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emailVerificationContainer: {
    width: '100%',
    backgroundColor: 'rgba(158, 119, 237, 0.08)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  emailVerificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  verificationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emailVerificationText: {
    fontSize: 14,
    marginLeft: 8,
  },
  resendEmailText: {
    fontSize: 14,
    marginTop: 5,
    marginBottom: 12,
    textDecorationLine: 'underline',
    fontWeight: '500',
    alignSelf: 'flex-start',
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

export default PhoneVerificationScreen; 