import React, { forwardRef } from 'react';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

// Custom wrapper to avoid defaultProps warning
const CustomRecaptcha = forwardRef((props, ref) => {
  // Spread props but set defaults directly instead of using defaultProps
  const {
    firebaseConfig,
    appVerificationDisabledForTesting = false,
    languageCode = 'en',
    onVerify = () => {},
    onLoad = () => {},
    onError = () => {},
    onFullChallenge = () => {},
    visible = true,
    cancelLabel = 'Cancel',
    attemptInvisible = true,
    ...otherProps
  } = props;

  return (
    <FirebaseRecaptchaVerifierModal
      ref={ref}
      firebaseConfig={firebaseConfig}
      appVerificationDisabledForTesting={appVerificationDisabledForTesting}
      languageCode={languageCode}
      onVerify={onVerify}
      onLoad={onLoad}
      onError={onError}
      onFullChallenge={onFullChallenge}
      visible={visible}
      cancelLabel={cancelLabel}
      {...otherProps}
    />
  );
});

export default CustomRecaptcha; 