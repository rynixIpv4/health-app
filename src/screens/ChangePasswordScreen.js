import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const ChangePasswordScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        setError('');
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          setError('You must be logged in to change your password');
          return;
        }
        
        // Email might be null for some auth providers, handle that case
        const email = user.email;
        if (!email) {
          setError('Your account does not have an email associated with it');
          return;
        }
        
        // Create credential with email and current password
        const credential = EmailAuthProvider.credential(email, currentPassword);
        
        // Re-authenticate user with current password
        await reauthenticateWithCredential(user, credential);
        
        // Change password
        await updatePassword(user, newPassword);
        
        // Show success message and navigate back
        Alert.alert(
          'Success',
          'Your password has been updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (err) {
        // Handle specific authentication errors
        switch (err.code) {
          case 'auth/wrong-password':
            setError('The current password is incorrect');
            break;
          case 'auth/weak-password':
            setError('The new password is too weak. Please use at least 6 characters');
            break;
          case 'auth/requires-recent-login':
            setError('This operation is sensitive and requires recent authentication. Please sign in again before retrying');
            break;
          default:
            setError('Failed to update password. Please try again');
        }
        console.log('Password change error (not visible to users)');
      } finally {
        setIsLoading(false);
      }
    }
  };

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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={[
            styles.container,
            { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
          ]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={[
                styles.backButton,
                { backgroundColor: isDarkMode ? '#2c2c2c' : '#f0f0f0' }
              ]} 
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="chevron-left" 
                size={30} 
                color={isDarkMode ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
            <Text style={[
              styles.headerTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>Change Password</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.formContainer}>
            <Text style={[
              styles.sectionTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              Update your password
            </Text>
            
            <Text style={[
              styles.description,
              { color: isDarkMode ? '#AAAAAA' : '#666666' }
            ]}>
              Your password must be at least 8 characters long and include a mix of letters, numbers, and symbols for better security.
            </Text>

            {/* Current Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>Current Password</Text>
              <View style={[
                styles.passwordInputWrapper,
                { 
                  backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
                  borderColor: errors.currentPassword ? '#FF5252' : (isDarkMode ? '#3C3C3C' : '#E0E0E0')
                }
              ]}>
                <TextInput
                  style={[
                    styles.textInput,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={isDarkMode ? '#AAAAAA' : '#999999'}
                  secureTextEntry={!currentPasswordVisible}
                />
                <TouchableOpacity onPress={() => setCurrentPasswordVisible(!currentPasswordVisible)}>
                  <MaterialCommunityIcons 
                    name={currentPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color={isDarkMode ? '#AAAAAA' : '#999999'} 
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && (
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              )}
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>New Password</Text>
              <View style={[
                styles.passwordInputWrapper,
                { 
                  backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
                  borderColor: errors.newPassword ? '#FF5252' : (isDarkMode ? '#3C3C3C' : '#E0E0E0')
                }
              ]}>
                <TextInput
                  style={[
                    styles.textInput,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={isDarkMode ? '#AAAAAA' : '#999999'}
                  secureTextEntry={!newPasswordVisible}
                />
                <TouchableOpacity onPress={() => setNewPasswordVisible(!newPasswordVisible)}>
                  <MaterialCommunityIcons 
                    name={newPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color={isDarkMode ? '#AAAAAA' : '#999999'} 
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword && (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>Confirm New Password</Text>
              <View style={[
                styles.passwordInputWrapper,
                { 
                  backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
                  borderColor: errors.confirmPassword ? '#FF5252' : (isDarkMode ? '#3C3C3C' : '#E0E0E0')
                }
              ]}>
                <TextInput
                  style={[
                    styles.textInput,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={isDarkMode ? '#AAAAAA' : '#999999'}
                  secureTextEntry={!confirmPasswordVisible}
                />
                <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
                  <MaterialCommunityIcons 
                    name={confirmPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color={isDarkMode ? '#AAAAAA' : '#999999'} 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessageText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                { backgroundColor: '#9E77ED' },
                isLoading && styles.disabledButton
              ]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Add extra padding at the bottom for scrolling
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  formContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorMessageText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  }
});

export default ChangePasswordScreen; 