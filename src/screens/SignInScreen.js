import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, sendVerificationEmail, getMultiFactorResolverFromError } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CustomRecaptcha from '../components/CustomRecaptcha';
import { app } from '../firebase';

const { height } = Dimensions.get('window');

const SignInScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { setIsAuthenticated, setUserData } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaVerifier = useRef(null);

  const themeColors = {
    primary: isDarkMode ? '#FFFFFF' : '#000000',
    background: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    inputBg: isDarkMode ? '#1E1E1E' : '#F7F7F7',
    inputText: isDarkMode ? '#FFFFFF' : '#000000',
    inputBorder: isDarkMode ? '#333333' : '#E5E5E5',
    placeholderText: isDarkMode ? '#8E8E93' : '#8E8E93',
    error: '#FF3B30',
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First try regular sign in
      console.log('Attempting sign in with email:', email);
      await signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          console.log('Sign in successful, checking if user has 2FA enabled');
          const user = userCredential.user;
          
          // Get user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          // Check if email is verified if required
          if (user.emailVerified || !userData?.requireEmailVerification) {
            // Set user as authenticated
            setUserData(userData);
            setIsAuthenticated(true);
            
            // Navigate to main app
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }],
            });
          } else {
            // Email verification required
            Alert.alert(
              'Email Verification Required',
              'Please verify your email before signing in. Would you like us to send another verification email?',
              [
                {
                  text: 'No',
                  style: 'cancel'
                },
                {
                  text: 'Yes, Send Again',
                  onPress: async () => {
                    await sendVerificationEmail(user);
                    Alert.alert(
                      'Verification Email Sent',
                      'Please check your email and follow the verification link.'
                    );
                  }
                }
              ]
            );
            
            // Sign out user since they need to verify email
            await auth.signOut();
          }
        })
        .catch((error) => {
          // If error is multi-factor auth required, it means 2FA is properly set up
          // This is expected and should be handled separately
          if (error.code === 'auth/multi-factor-auth-required') {
            throw error; // Rethrow to be caught by the outer catch block
          }
          
          throw error; // Rethrow other errors
        });
      
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Check for multi-factor authentication
      if (error.code === 'auth/multi-factor-auth-required') {
        console.log('Multi-factor authentication required');
        
        // Get resolver from the error
        const resolverResult = getMultiFactorResolverFromError(error);
        
        if (resolverResult.success) {
          console.log('MFA resolver obtained successfully, redirecting to 2FA screen');
          // Navigate to 2FA screen
          navigation.navigate('TwoFactorAuth', {
            resolver: resolverResult.resolver,
            email: email
          });
          setIsLoading(false);
          return;
        } else {
          console.error('Failed to get MFA resolver:', resolverResult.error);
          setError('Failed to start two-factor authentication');
        }
      }
      
      // Handle different error codes
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later');
          break;
        default:
          setError('Failed to sign in. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUpNavigation = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CustomRecaptcha
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.text }]}>
            Sign in to continue
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              Email
            </Text>
            <View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.inputBg,
                    color: themeColors.inputText,
                    borderColor: error ? themeColors.error : themeColors.inputBorder,
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={themeColors.placeholderText}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              Password
            </Text>
            <View>
              <View style={[
                styles.passwordInputContainer,
                { 
                  backgroundColor: themeColors.inputBg,
                  borderColor: error ? themeColors.error : themeColors.inputBorder,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: themeColors.inputText }]}
                  placeholder="Enter your password"
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
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={handleForgotPassword}
          >
            <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.signInButton, 
              { backgroundColor: themeColors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={themeColors.background} size="small" />
            ) : (
              <Text
                style={[
                  styles.signInButtonText,
                  { color: themeColors.background }
                ]}
              >
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.createAccountContainer}>
            <Text style={[styles.createAccountText, { color: themeColors.text }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={handleSignUpNavigation}>
              <Text style={[styles.createAccountLink, { color: themeColors.primary }]}>
                {' Create one now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginVertical: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.8,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordInputContainer: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  visibilityToggle: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  signInButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  createAccountText: {
    fontSize: 14,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  eyeIconText: {
    fontSize: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default SignInScreen; 