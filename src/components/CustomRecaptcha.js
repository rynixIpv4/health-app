import React, { forwardRef, useEffect } from 'react';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';

// Custom wrapper to avoid defaultProps warning and add better error handling
const CustomRecaptcha = forwardRef((props, ref) => {
  // Determine if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  
  // Spread props but set defaults directly instead of using defaultProps
  const {
    firebaseConfig,
    // Force real verification by setting this to false regardless of what's passed in
    appVerificationDisabledForTesting = false,
    languageCode = 'en',
    onVerify = () => {},
    onLoad = () => {
      console.log('reCAPTCHA loaded successfully');
    },
    onError = (error) => {
      console.error('reCAPTCHA error:', error);
    },
    onFullChallenge = () => {},
    visible = true,
    cancelLabel = 'Cancel',
    attemptInvisible = false, // Set to false to always show the reCAPTCHA challenge
    ...otherProps
  } = props;

  useEffect(() => {
    // Log verification setup
    console.log('Setting up reCAPTCHA verification with REAL verification mode');
    console.log('Running in Expo Go:', isExpoGo);
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up reCAPTCHA verifier');
    };
  }, []);

  // On some platforms, we might need special handling
  if (Platform.OS === 'web') {
    // Web implementation might be different
    console.log('Using web implementation of reCAPTCHA');
  }

  return (
    <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
      <FirebaseRecaptchaVerifierModal
        ref={ref}
        firebaseConfig={firebaseConfig}
        appVerificationDisabledForTesting={false} // Always use real verification
        languageCode={languageCode}
        onVerify={onVerify}
        onLoad={onLoad}
        onError={onError}
        onFullChallenge={onFullChallenge}
        visible={visible}
        cancelLabel={cancelLabel}
        attemptInvisible={attemptInvisible}
        {...otherProps}
      />
    </View>
  );
});

export default CustomRecaptcha; 