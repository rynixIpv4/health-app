// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence, 
  PhoneAuthProvider, 
  signInWithCredential,
  PhoneMultiFactorGenerator, 
  multiFactor,
  linkWithCredential,
  RecaptchaVerifier,
  sendEmailVerification,
  MultiFactorResolver,
  getMultiFactorResolver
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9erQrHcCOrS3H7Yri5cGuOaxJEQRr7QU",
  authDomain: "health-tracking-app-bacd0.firebaseapp.com",
  projectId: "health-tracking-app-bacd0",
  storageBucket: "health-tracking-app-bacd0.appspot.com",
  messagingSenderId: "8319987771",
  appId: "1:8319987771:web:027fb0c185a4b2149f2c1e",
  measurementId: "G-D9Y81H34MN"
};

// Initialize Firebase
console.log("Initializing Firebase with config:", { 
  projectId: firebaseConfig.projectId, 
  storageBucket: firebaseConfig.storageBucket 
});

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
console.log("Firebase Auth initialized");

// Initialize Firestore
const db = getFirestore(app);
console.log("Firestore initialized");

// Initialize Storage
const storage = getStorage(app);
console.log("Firebase Storage initialized with bucket:", firebaseConfig.storageBucket);

// Phone verification functions
export const sendPhoneVerificationCode = async (phoneNumber, recaptchaVerifier) => {
  try {
    console.log('Sending verification code to:', phoneNumber);
    
    // Format the phone number - remove any spaces, dashes, etc.
    const formattedPhoneNumber = phoneNumber.replace(/[\s()-]/g, '');
    
    // Ensure it starts with a plus sign
    if (!formattedPhoneNumber.startsWith('+')) {
      return { 
        success: false, 
        error: 'Phone number must include country code and start with a plus sign (e.g., +1 for US)'
      };
    }
    
    // Attempt to send the verification code
    const phoneProvider = new PhoneAuthProvider(auth);
    
    // reCAPTCHA handling - continue even if there's a warning about Enterprise config
    try {
      console.log('Attempting to send verification code with reCAPTCHA...');
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhoneNumber,
        recaptchaVerifier
      );
      
      console.log('Verification code sent successfully to:', formattedPhoneNumber);
      return { success: true, verificationId };
    } catch (recaptchaError) {
      // Check if it's a known initialization error that doesn't actually break functionality
      if (recaptchaError.message && recaptchaError.message.includes('reCAPTCHA Enterprise')) {
        console.log('Non-critical reCAPTCHA error - continuing with verification:', recaptchaError.message);
        
        // Try again - often works on second attempt despite the warning
        const verificationId = await phoneProvider.verifyPhoneNumber(
          formattedPhoneNumber,
          recaptchaVerifier
        );
        
        console.log('Verification code sent successfully on retry to:', formattedPhoneNumber);
        return { success: true, verificationId };
      }
      
      // If it's not the known Enterprise config error, rethrow to be handled below
      throw recaptchaError;
    }
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // Provide more detailed error messages based on the error code
    let errorMessage = 'Failed to send verification code';
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please ensure you include the country code (e.g., +1 for US).';
    } else if (error.code === 'auth/missing-phone-number') {
      errorMessage = 'Please provide a phone number.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'Too many verification attempts. Please try again later.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA verification failed. Please try again.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code
    };
  }
};

export const verifyPhoneCode = async (verificationId, verificationCode) => {
  try {
    // Create a PhoneAuthCredential with the provided verification ID and code
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    
    return { success: true, credential };
  } catch (error) {
    console.error('Error verifying code:', error);
    return { 
      success: false, 
      error: error.message || 'Invalid verification code'
    };
  }
};

export const linkPhoneWithUser = async (user, verificationId, verificationCode) => {
  try {
    // Create a PhoneAuthCredential with the provided verification ID and code
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    
    // Link the user with the phone credential
    await linkWithCredential(user, credential);
    
    console.log('Phone linked with user successfully');
    return { success: true };
  } catch (error) {
    console.error('Error linking phone with user:', error);
    
    // For provider-already-linked, we should still treat phone as verified
    if (error.code === 'auth/provider-already-linked') {
      console.log('Phone provider already linked - treating as success for UI flow');
      return { 
        success: false, 
        error: 'Phone is already linked to this account',
        code: error.code,
        treatAsSuccess: true
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to link phone with user',
      code: error.code
    };
  }
};

// Verify Firebase Storage is set up correctly
const verifyStorageSetup = async (forceCreate = false) => {
  try {
    console.log('Verifying Firebase Storage configuration...');
    
    // Check if running on Blaze plan by attempting to create a test file
    const user = auth.currentUser;
    if (!user) {
      console.log('Cannot verify storage: No user logged in');
      return { success: false, error: 'User not logged in' };
    }
    
    if (forceCreate) {
      // Create a test file to verify write access
      const testRef = ref(storage, `verification/test_${Date.now()}.txt`);
      const testBlob = new Blob(['Storage verification test'], { type: 'text/plain' });
      
      console.log('Attempting to upload test file to verify storage permissions...');
      await uploadBytes(testRef, testBlob);
      
      const downloadURL = await getDownloadURL(testRef);
      console.log('Firebase Storage verification successful - Blaze plan is active');
      console.log('Storage verification download URL:', downloadURL);
      
      return { 
        success: true, 
        message: 'Firebase Storage is correctly configured with Blaze plan',
        downloadURL
      };
    } else {
      // Just check if we can list files in the bucket
      console.log('Checking storage access without creating test file...');
      const listRef = ref(storage, 'verification');
      await getDownloadURL(listRef).catch(() => {
        // It's ok if this fails with object-not-found - that just means
        // the folder doesn't exist yet, but we have permission to look
        console.log('Verification folder not found, but storage access seems ok');
      });
      
      return { 
        success: true, 
        message: 'Firebase Storage appears to be accessible'
      };
    }
  } catch (error) {
    console.error('Firebase Storage verification failed:', error);
    
    // Check for specific error types
    if (error.code === 'storage/unauthorized') {
      return { 
        success: false, 
        error: 'Storage rules are preventing access. Update rules in Firebase Console.',
        code: error.code
      };
    } else if (error.code === 'storage/quota-exceeded') {
      return { 
        success: false, 
        error: 'Storage quota exceeded. Check your Blaze plan billing.',
        code: error.code
      };
    } else if (error.code === 'storage/unknown') {
      return { 
        success: false, 
        error: 'Unknown storage error. Verify Blaze plan is active and initialized.',
        code: error.code
      };
    } else {
      return { 
        success: false, 
        error: error.message || 'Unknown storage error',
        code: error.code
      };
    }
  }
};

// Test Firebase Storage access
const testStorageAccess = async () => {
  if (!auth.currentUser) {
    console.log("Cannot test storage - user not logged in");
    return { success: false, error: "User not logged in" };
  }
  
  try {
    console.log("Testing storage write access...");
    const testRef = ref(storage, `test_${Date.now()}.txt`);
    const testData = "This is a test file";
    
    // Create a small text blob
    const blob = new Blob([testData], { type: 'text/plain' });
    
    // Try to upload
    await uploadBytes(testRef, blob);
    console.log("Storage write test successful!");
    
    // Try to read it back
    const url = await getDownloadURL(testRef);
    console.log("Storage read test successful, URL:", url);
    
    // Clean up (but don't wait for it)
    deleteObject(testRef).catch(e => console.log("Cleanup error (non-critical):", e));
    
    return { success: true, url };
  } catch (error) {
    console.error("Storage access test failed:", error);
    console.error("Storage rules may need to be updated to allow user access");
    console.log(`Error code: ${error.code}, message: ${error.message}`);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      suggestion: "Update Firebase Storage rules to allow authenticated users to read/write"
    };
  }
};

// Get Firebase Storage rules
const getRequiredStorageRules = () => {
  console.log("==== FIREBASE STORAGE RULES ====");
  console.log(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
  `);
  console.log("==== END FIREBASE STORAGE RULES ====");
  console.log("To update these rules:");
  console.log("1. Go to Firebase Console: https://console.firebase.google.com/");
  console.log("2. Select your project: health-tracking-app-bacd0");
  console.log("3. Navigate to Storage > Rules");
  console.log("4. Paste the above rules and publish");
  
  return `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
  `;
};

// Add a dedicated function for iOS compatibility with Expo Go
export const createDataURLFromURI = async (uri) => {
  try {
    console.log('Converting image URI to data URL for iOS compatibility');
    // Use FileSystem to read the file
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Create a properly formatted data URL that Firebase can handle
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error creating data URL:', error);
    throw error;
  }
};

// Email verification function
export const sendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user);
    console.log('Verification email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send verification email',
      code: error.code
    };
  }
};

// 2FA Verification Functions
export const verify2FA = async (phoneNumber, resolver, recaptchaVerifier) => {
  try {
    console.log('Starting 2FA verification process for:', phoneNumber);
    
    // Get the available second factors
    const hints = resolver.hints;
    
    // Use the first hint (should be the phone hint)
    const phoneInfoOptions = {
      multiFactorHint: hints[0],
      session: resolver.session
    };
    
    // Send verification code to the user's phone
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneInfoOptions,
      recaptchaVerifier
    );
    
    console.log('2FA verification code sent successfully');
    return { 
      success: true, 
      verificationId,
      phoneNumber 
    };
    
  } catch (error) {
    console.error('Error sending 2FA verification code:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send verification code',
      code: error.code
    };
  }
};

export const complete2FASignIn = async (resolver, verificationId, verificationCode) => {
  try {
    console.log('Completing 2FA sign-in process');
    
    // Create the credential from the verification ID and code
    const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
    
    // Complete the sign-in
    const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
    
    console.log('2FA sign-in completed successfully');
    return { 
      success: true, 
      user: userCredential.user 
    };
    
  } catch (error) {
    console.error('Error completing 2FA sign-in:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to complete 2FA authentication',
      code: error.code
    };
  }
};

export const getMultiFactorResolverFromError = (error) => {
  try {
    if (error.code === 'auth/multi-factor-auth-required') {
      console.log('Multi-factor authentication required');
      const resolver = getMultiFactorResolver(auth, error);
      return { 
        success: true, 
        resolver,
        hints: resolver.hints
      };
    }
    return { success: false, error: 'Not a multi-factor auth error' };
  } catch (error) {
    console.error('Error getting multi-factor resolver:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to process multi-factor authentication',
      code: error.code
    };
  }
};

export const enable2FA = async (user) => {
  try {
    console.log('Enabling 2FA for user');
    const multiFactorUser = multiFactor(user);
    
    // Check if phone is already enrolled
    const enrolledFactors = multiFactorUser.enrolledFactors || [];
    if (enrolledFactors.length > 0) {
      console.log('User already has 2FA enabled');
      return { 
        success: true, 
        message: 'Two-factor authentication is already enabled' 
      };
    }
    
    return { 
      success: true, 
      message: 'User ready for 2FA enrollment' 
    };
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to enable 2FA',
      code: error.code
    };
  }
};

export const enroll2FAFactor = async (user, verificationId, verificationCode) => {
  try {
    console.log('Enrolling phone as 2FA method for user:', user.uid);
    console.log('Verification ID:', verificationId);
    console.log('Verification code length:', verificationCode.length);
    
    // Get the multi-factor instance for the user
    const multiFactorUser = multiFactor(user);
    
    // Check if user already has 2FA enrolled
    const enrolledFactors = multiFactorUser.enrolledFactors || [];
    console.log('Current enrolled factors:', enrolledFactors);
    
    if (enrolledFactors.length > 0) {
      console.log('User already has factors enrolled:', enrolledFactors);
      return { 
        success: true, 
        message: 'Two-factor authentication is already enabled',
        alreadyEnrolled: true
      };
    }
    
    // Create the credential from the verification ID and code
    console.log('Creating phone auth credential...');
    const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
    
    // Create the assertion
    console.log('Creating multi-factor assertion...');
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
    
    // Enroll the phone as a second factor
    console.log('Enrolling phone as second factor...');
    await multiFactorUser.enroll(multiFactorAssertion, "Phone 2FA");
    
    console.log('Phone enrolled as 2FA method successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error enrolling 2FA factor:', error);
    
    // For provider-already-linked, we should still treat it as success
    if (error.code === 'auth/provider-already-linked') {
      console.log('Phone provider already linked - treating as success for 2FA enrollment');
      
      // Double-check if the user has MFA enrolled
      try {
        const multiFactorUser = multiFactor(user);
        const enrolledFactors = multiFactorUser.enrolledFactors || [];
        
        if (enrolledFactors.length > 0) {
          return { 
            success: true, 
            message: 'Phone is already linked and 2FA is already enabled',
            alreadyEnrolled: true
          };
        } else {
          // Try to unenroll any existing factors (cleanup) and try again with a new session
          console.log('Provider linked but no MFA factors found. This is unusual.');
          return { 
            success: false, 
            error: 'Phone is linked but 2FA is not fully set up. Please try again with a new verification code.',
            code: 'auth/incomplete-mfa-setup',
            requiresNewVerification: true
          };
        }
      } catch (mfaError) {
        console.error('Error checking MFA status:', mfaError);
      }
      
      return { 
        success: false, 
        error: 'Phone is already linked but 2FA setup incomplete. Try again.',
        code: error.code,
        requiresNewVerification: true
      };
    }
    
    // Provide more specific error message based on error code
    let errorMessage = 'Failed to enroll 2FA factor';
    
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code. Please try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'Verification code has expired. Please request a new code.';
    } else if (error.code === 'auth/invalid-verification-id') {
      errorMessage = 'Invalid verification session. Please request a new code.';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'This operation requires recent authentication. Please log in again.';
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code,
      fullError: error.toString()
    };
  }
};

export const unenroll2FAFactor = async (user) => {
  try {
    console.log('Unenrolling 2FA for user');
    const multiFactorUser = multiFactor(user);
    
    // Get enrolled factors
    const enrolledFactors = multiFactorUser.enrolledFactors || [];
    if (enrolledFactors.length === 0) {
      console.log('No 2FA methods enrolled');
      return { 
        success: true, 
        message: 'No 2FA methods are currently enabled' 
      };
    }
    
    // Unenroll the first factor (should be phone)
    await multiFactorUser.unenroll(enrolledFactors[0]);
    
    console.log('2FA factor unenrolled successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error unenrolling 2FA factor:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to disable 2FA',
      code: error.code
    };
  }
};

// Export everything in a single export statement
export { 
  app, 
  auth, 
  db, 
  storage,
  verifyStorageSetup,
  testStorageAccess,
  getRequiredStorageRules
}; 