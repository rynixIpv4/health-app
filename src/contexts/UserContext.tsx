import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Define the user data interface
interface UserData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  bloodType?: string;
  height?: number;
  weight?: number;
  healthData?: {
    heartRate: number;
    cycling: number;
    steps: number;
    sleep: number;
  };
  emergencyContacts?: Array<{
    id: string;
    name: string;
    relationship: string;
    countryCode: string;
    phone: string;
    isDefault: boolean;
  }>;
  createdAt?: Date;
}

// Default user data
const defaultUserData: UserData = {
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
    sleep: 8,
  }
};

interface UserContextProps {
  userData: UserData;
  setUserData: (data: UserData) => void;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  currentUser: any; // Firebase Auth user
  isLoading: boolean;
}

const UserContext = createContext<UserContextProps>({
  userData: defaultUserData,
  setUserData: () => {},
  isOnboarded: false,
  setIsOnboarded: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  currentUser: null,
  isLoading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userData, setUserDataState] = useState<UserData>(defaultUserData);
  const [isOnboarded, setIsOnboardedState] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthenticatedState(!!user);
      
      if (user) {
        // User is signed in, fetch their data from Firestore
        console.log(`UserContext: Auth state changed - user logged in: ${user.uid}, displayName: ${user.displayName || 'none'}, email: ${user.email}`);
        
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userFirestoreData = userDoc.data() as UserData;
            console.log('UserContext: Loaded existing user data:', JSON.stringify(userFirestoreData));
            
            // Make sure there's a name even if the document exists
            if (!userFirestoreData.name && user.displayName) {
              userFirestoreData.name = user.displayName;
              // Update Firestore with the name
              await setDoc(userDocRef, { name: user.displayName }, { merge: true });
              console.log('UserContext: Updated missing name field with:', user.displayName);
            }
            
            setUserDataState(userFirestoreData);
            
            // Update AsyncStorage cache
            await AsyncStorage.setItem('@userData', JSON.stringify(userFirestoreData));
            await AsyncStorage.setItem('@isAuthenticated', 'true');
            
            // Check if this is a new user (based on createdAt timestamp)
            const createdAt = userFirestoreData.createdAt;
            const now = new Date();
            
            // If user was created in the last 5 minutes, reset onboarding
            // This ensures new users always see onboarding
            if (createdAt && 
                ((now.getTime() - new Date(createdAt).getTime()) < 5 * 60 * 1000)) {
              console.log("New user detected, showing onboarding");
              await AsyncStorage.setItem('@isOnboarded', 'false');
              setIsOnboardedState(false);
            }
          } else {
            // No user document exists, create a default one
            console.log('UserContext: No user document found. Creating default user data.');
            const defaultUserData = {
              name: user.displayName || `User-${user.uid.substring(0, 4)}`,
              email: user.email || '',
              firstName: user.displayName ? user.displayName.split(' ')[0] : '',
              lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
              createdAt: new Date(),
              healthData: {
                heartRate: 78,
                cycling: 24,
                steps: 15000,
                sleep: 8,
              }
            };
            
            // Save to Firestore
            await setDoc(userDocRef, defaultUserData);
            console.log('UserContext: Default user data created and saved:', JSON.stringify(defaultUserData));
            
            // Update state and AsyncStorage
            setUserDataState(defaultUserData);
            await AsyncStorage.setItem('@userData', JSON.stringify(defaultUserData));
            await AsyncStorage.setItem('@isAuthenticated', 'true');
          }
        } catch (error) {
          console.error('Error in UserContext handling user data:', error);
        }
      } else {
        // User is signed out
        setUserDataState(defaultUserData);
        
        // Clear user data but don't clear onboarding status
        await AsyncStorage.removeItem('@userData');
        await AsyncStorage.setItem('@isAuthenticated', 'false');
      }
      
      setIsLoading(false);
    });
    
    // Load onboarding status separately
    const loadOnboardingStatus = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('@isOnboarded');
        if (onboardingStatus) {
          setIsOnboardedState(JSON.parse(onboardingStatus));
        }
      } catch (error) {
        console.log('Error loading onboarding status', error);
      }
    };
    
    loadOnboardingStatus();
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  // Save user data when it changes - now updates Firestore if user is logged in
  const setUserData = async (data: UserData) => {
    setUserDataState(data);
    
    // Save to AsyncStorage cache
    try {
      await AsyncStorage.setItem('@userData', JSON.stringify(data));
      
      // If user is authenticated, update Firestore
      if (auth.currentUser) {
        // Implementation of Firestore update will need to be added in proper screens
        // where user data is modified, as we need more specifics on what's being updated
      }
    } catch (error) {
      console.log('Error saving user data', error);
    }
  };
  
  // Save onboarding status when it changes
  const setIsOnboarded = (value: boolean) => {
    setIsOnboardedState(value);
    
    // Save to AsyncStorage
    const saveOnboardingStatus = async () => {
      try {
        await AsyncStorage.setItem('@isOnboarded', JSON.stringify(value));
      } catch (error) {
        console.log('Error saving onboarding status', error);
      }
    };
    
    saveOnboardingStatus();
  };
  
  // Save authentication status when it changes
  const setIsAuthenticated = (value: boolean) => {
    setIsAuthenticatedState(value);
    
    // Save to AsyncStorage
    const saveAuthStatus = async () => {
      try {
        await AsyncStorage.setItem('@isAuthenticated', JSON.stringify(value));
      } catch (error) {
        console.log('Error saving authentication status', error);
      }
    };
    
    saveAuthStatus();
  };
  
  return (
    <UserContext.Provider 
      value={{ 
        userData, 
        setUserData,
        isOnboarded,
        setIsOnboarded,
        isAuthenticated,
        setIsAuthenticated,
        currentUser,
        isLoading
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 