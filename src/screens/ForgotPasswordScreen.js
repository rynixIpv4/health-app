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
  Alert
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const themeColors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    inputBg: isDarkMode ? '#2C2C2C' : '#F5F5F5',
    inputBorder: isDarkMode ? '#3C3C3C' : '#E0E0E0',
    inputText: isDarkMode ? '#FFFFFF' : '#000000',
    placeholderText: isDarkMode ? '#AAAAAA' : '#999999',
    primary: '#9E77ED', // Purple accent color
    success: '#4CAF50',
    error: '#FF5252',
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Handle password reset logic here
      console.log('Sending password reset to:', email);
      
      // Show success message and update UI
      setIsSubmitted(true);
      
      // In a real app, you'd want to show the success state after the API call completes
      // For demo purposes, we're just setting it immediately
    }
  };

  const handleBackToSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleTryDifferentEmail = () => {
    setIsSubmitted(false);
    setEmail('');
  };

  // Initial state (email input form)
  const renderEmailForm = () => (
    <View style={styles.form}>
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
          placeholder="Enter your email address"
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

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: themeColors.primary }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );

  // Success state
  const renderSuccessMessage = () => (
    <View style={styles.successContainer}>
      <View style={[styles.iconContainer, { backgroundColor: `${themeColors.success}20` }]}>
        <MaterialCommunityIcons 
          name="email-check" 
          size={40} 
          color={themeColors.success} 
        />
      </View>
      
      <Text style={[styles.successTitle, { color: themeColors.text }]}>
        Check your email
      </Text>
      
      <Text style={[styles.successMessage, { color: themeColors.subText }]}>
        We have sent a password recovery link to {email}
      </Text>
      
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: themeColors.primary }]}
        onPress={handleBackToSignIn}
      >
        <Text style={styles.backButtonText}>Back to Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.tryAgainContainer}
        onPress={handleTryDifferentEmail}
      >
        <Text style={[styles.tryAgainText, { color: themeColors.primary }]}>
          Try a different email
        </Text>
      </TouchableOpacity>
    </View>
  );

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
                  styles.backButtonRound, 
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
                {isSubmitted ? 'Email Sent' : 'Forgot Password'}
              </Text>
              {!isSubmitted && (
                <Text style={[styles.subtitle, { color: themeColors.subText }]}>
                  Enter your email address to receive a password reset link
                </Text>
              )}
            </View>

            {/* Form or Success Message */}
            {isSubmitted ? renderSuccessMessage() : renderEmailForm()}
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
  backButtonRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
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
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
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
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success state styles
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tryAgainContainer: {
    padding: 8,
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen; 