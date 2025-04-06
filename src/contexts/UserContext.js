import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default user data
const defaultUserData = {
  firstName: '',
  lastName: '',
  name: '',
  email: '',
  dateOfBirth: '',
  gender: 'male',
  bloodType: '',
  height: 180,
  weight: 80,
  healthData: {
    heartRate: 78,
    cycling: 24,
    steps: 15000,
    sleep: 8
  }
};

// Create context
export const UserContext = createContext();

// Context provider component
export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(defaultUserData);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        setIsOnboarded(onboardingCompleted === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log(`UserContext: Auth state changed - user logged in: ${user.uid}, displayName: ${user.displayName || 'none'}, email: ${user.email}`);
          
          // Reload user to get latest email verification status
          await user.reload();
          
          // Get user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            // We have a user document
            const userDataFromFirestore = userDoc.data();
            setUserData(userDataFromFirestore);
            
            // Check if both email and phone are verified
            const isEmailVerified = user.emailVerified;
            const isPhoneVerified = userDataFromFirestore.phoneVerified || false;
            
            // Only set authenticated if both verifications are complete
            // Or if there's a special flag set for phone-only verification (legacy users)
            const isFullyVerified = isEmailVerified && isPhoneVerified;
            const bypassPhoneVerification = userDataFromFirestore.bypassPhoneVerification || false;
            
            if (isFullyVerified || (isEmailVerified && bypassPhoneVerification)) {
              setIsAuthenticated(true);
            } else {
              // Not fully verified, don't set as authenticated
              setIsAuthenticated(false);
              
              // Check if this might be an old account without verification requirements
              if (!isEmailVerified && !userDataFromFirestore.emailVerificationRequired) {
                // Legacy account: update the document to include the new verification fields
                await updateDoc(userRef, {
                  emailVerificationRequired: true
                });
              }
            }
          } else {
            // No user document yet, create default data
            console.log('UserContext: No user document found. Creating default user data.');
            const defaultData = {
              name: `User-${user.uid.substring(0, 4)}`,
              email: user.email,
              firstName: '',
              lastName: '',
              createdAt: new Date().toISOString(),
              emailVerificationRequired: true,
              phoneVerificationRequired: true,
              emailVerified: false,
              phoneVerified: false,
              healthData: {
                heartRate: 78,
                cycling: 24,
                steps: 15000,
                sleep: 8
              }
            };
            
            // Save default data
            await setDoc(userRef, defaultData);
            console.log('UserContext: Default user data created and saved:', JSON.stringify(defaultData));
            
            // Set user data in state but not authenticated until verification
            setUserData(defaultData);
            setIsAuthenticated(false);
          }
        } else {
          // User is signed out
          console.log('UserContext: Auth state changed - user signed out');
          setUserData(defaultUserData);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        setUserData(defaultUserData);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Mark onboarding as completed
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setIsOnboarded(true);
    } catch (error) {
      console.error('Error setting onboarding status:', error);
    }
  };

  // Value to be provided to consumers
  const value = {
    isAuthenticated,
    setIsAuthenticated,
    userData,
    setUserData,
    isLoading,
    isOnboarded,
    completeOnboarding
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook for accessing the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 