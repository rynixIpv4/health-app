import { Alert } from 'react-native';
import { ref, uploadBytes, getDownloadURL, listAll, uploadString } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createDataURLFromURI } from '../firebase';

/**
 * Uploads an image to Firebase Storage with proper error handling
 * @param {Object} storage - Firebase storage reference
 * @param {Object} user - Firebase auth reference
 * @param {string} uri - Image URI to upload
 * @param {Function} progressCallback - Callback for upload progress
 * @returns {Promise<string|null>} - Download URL or null on failure
 */
export const uploadImageToFirebase = async (storage, user, uri, progressCallback = null) => {
  try {
    if (!user) throw new Error('No user is logged in');
    if (!uri) throw new Error('No image URI provided');
    
    console.log('Starting upload process for user:', user.uid);
    
    // Create a fixed file name for the user's profile image
    const imagePath = `profileImages/profile_${user.uid}.jpg`;
    console.log('Target image path:', imagePath);
    const storageRef = ref(storage, imagePath);
    
    // Try the new approach with fetch and blob first
    try {
      console.log('Attempting primary upload method with fetch and blob...');
      
      // Get image as a blob using fetch API
      console.log('Fetching image from URI:', uri);
      const response = await fetch(uri);
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob created, size:', blob.size, 'bytes');
      if (blob.size === 0) {
        throw new Error('Created blob has zero size');
      }
      
      // Upload to Firebase Storage with metadata
      console.log('Uploading blob to Firebase...');
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          'userId': user.uid,
          'uploadedAt': new Date().toISOString()
        }
      });
      console.log('Blob upload successful!');
    } catch (primaryMethodError) {
      console.error('Primary upload method failed:', primaryMethodError);
      console.log('Attempting fallback upload method...');
        
      // Fallback method: Use data URL approach
      // Read the file as base64
      if (uri.startsWith('file://')) {
        try {
          console.log('Reading image file as base64...');
          // For images from local file system (like camera)
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('Image read as base64, length:', base64Data.length);
          
          // Convert to Blob
          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const fallbackBlob = new Blob([ab], { type: 'image/jpeg' });
          console.log('Created fallback blob, size:', fallbackBlob.size);
          
          // Upload the data
          await uploadBytes(storageRef, fallbackBlob, {
            contentType: 'image/jpeg',
            customMetadata: {
              'userId': user.uid,
              'uploadedAt': new Date().toISOString(),
              'uploadMethod': 'base64Fallback'
            }
          });
          
          console.log('Fallback upload successful!');
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          throw new Error(`Both upload methods failed: ${fallbackError.message}`);
        }
      } else {
        throw primaryMethodError; // Re-throw if we can't use the fallback
      }
    }
    
    // Get the download URL
    console.log('Getting download URL...');
    let downloadURL;
    try {
      downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL retrieved:', downloadURL);
    } catch (urlError) {
      console.error('Failed to get download URL:', urlError);
      throw new Error(`Failed to get download URL: ${urlError.message || 'Unknown error'}`);
    }
    
    // Store only the download URL in AsyncStorage
    try {
      await AsyncStorage.setItem(`profileImageURL_${user.uid}`, downloadURL);
      console.log('URL saved to AsyncStorage');
    } catch (storageError) {
      console.warn('Failed to save URL to AsyncStorage:', storageError);
      // Non-critical error, continue anyway
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error.message || error);
    
    // Check for specific error types and provide better error messages
    if (error.code === 'storage/unauthorized') {
      console.error('Storage rules are preventing the upload. Please check Firebase Console > Storage > Rules');
      Alert.alert(
        'Permission Error',
        'You do not have permission to upload images. Please contact the app administrator.'
      );
    } else if (error.code === 'storage/quota-exceeded') {
      console.error('Storage quota exceeded. Consider upgrading your Firebase plan.');
      Alert.alert(
        'Storage Full',
        'The storage quota has been exceeded. Please contact the app administrator.'
      );
    } else if (error.code?.includes('network') || error.message?.includes('network')) {
      Alert.alert(
        'Network Error',
        'Please check your internet connection and try again.'
      );
    } else {
      // Generic error alert
      Alert.alert(
        'Upload Error',
        `Could not upload image: ${error.message || 'Unknown error'}`
      );
    }
    
    throw error;
  }
};

/**
 * Loads a profile image from cache or Firebase Storage
 * @param {Object} storage - Firebase storage reference
 * @param {string} userId - User ID to load image for
 * @param {Function} setImageCallback - State setter for profile image
 * @returns {Promise<string|null>} - Download URL or null on failure
 */
export const loadProfileImage = async (storage, userId, setImageCallback) => {
  if (!userId) {
    console.log('No user ID provided for loading profile image');
    return null;
  }
  
  try {
    // Check for locally stored image first (direct URI from camera/gallery)
    const localImageUri = await AsyncStorage.getItem(`localProfileImage_${userId}`);
    
    if (localImageUri) {
      console.log('Using locally stored image URI');
      setImageCallback(localImageUri);
      return localImageUri;
    }
    
    // Check for cached download URL next
    const cachedURL = await AsyncStorage.getItem(`profileImageURL_${userId}`);
    
    if (cachedURL) {
      console.log('Using cached Firebase URL');
      setImageCallback(cachedURL);
      return cachedURL;
    }
    
    // If no cached URL, try to fetch from Firebase directly
    try {
      const imagePath = `profileImages/profile_${userId}.jpg`;
      console.log('Looking for Firebase image at path:', imagePath);
      
      const imageRef = ref(storage, imagePath);
      const downloadURL = await getDownloadURL(imageRef);
      
      console.log('Found image in Firebase Storage, URL:', downloadURL);
      
      // Cache the URL for future use
      await AsyncStorage.setItem(`profileImageURL_${userId}`, downloadURL);
      
      setImageCallback(downloadURL);
      return downloadURL;
    } catch (error) {
      // Silently handle expected error when profile image doesn't exist yet
      if (error.code === 'storage/object-not-found') {
        console.log('No profile image found in Firebase - this is normal for new users');
      } else {
        console.log('Error loading profile image from Firebase:', error);
      }
      // Just return null and use default image
      return null;
    }
  } catch (error) {
    console.error('Error in loadProfileImage:', error);
    return null;
  }
};

export const clearImageCache = async (userId) => {
  try {
    if (userId) {
      // Only clear the URL, since we're not storing local URIs
      await AsyncStorage.removeItem(`profileImageURL_${userId}`);
      console.log('Image cache cleared for user:', userId);
    } else {
      console.log('No user ID provided to clear image cache');
    }
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
};

// New function to try alternative upload methods
export const uploadImageAlternative = async (storage, user, uri) => {
  try {
    if (!user) throw new Error('No user is logged in');
    if (!uri) throw new Error('No image URI provided');
    
    console.log('Starting alternative upload method for user:', user.uid);
    
    // Create a fixed file name for the user's profile image
    const imagePath = `profileImages/profile_${user.uid}.jpg`;
    console.log('Target image path:', imagePath);
    const storageRef = ref(storage, imagePath);
    
    // For Expo, try to use Expo FileSystem to read the image file
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      // Read file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist at path: ' + uri);
      }
      
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Upload as string
      const uploadTask = await uploadBytes(
        storageRef,
        Buffer.from(base64, 'base64'),
        {
          contentType: 'image/jpeg',
        }
      );
      
      console.log('Upload completed successfully via Expo FileSystem');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL retrieved:', downloadURL);
      
      // Cache the URL
      await AsyncStorage.setItem(`profileImageURL_${user.uid}`, downloadURL);
      
      return downloadURL;
    } else {
      throw new Error('URI format not supported for alternative upload: ' + uri);
    }
  } catch (error) {
    console.error('Alternative upload failed:', error);
    throw error;
  }
};

// Update uploadDirectFromUri for better iOS compatibility
export const uploadDirectFromUri = async (storage, user, uri) => {
  try {
    if (!user) throw new Error('No user is logged in');
    if (!uri) throw new Error('No image URI provided');
    
    console.log('Starting direct iOS-compatible upload for user:', user.uid);
    
    // Create unique filename with timestamp
    const timestamp = new Date().getTime();
    const filename = `profile_${user.uid}_${timestamp}.jpg`;
    const imagePath = `profileImages/${filename}`;
    console.log('Target storage path:', imagePath);
    
    // iOS-specific implementation to work around Expo Go limitations
    if (Platform.OS === 'ios') {
      try {
        // Create the storage reference
        const storageRef = ref(storage, imagePath);
        
        // Use our dedicated function to create a data URL
        console.log('Creating data URL for iOS upload...');
        const dataUrl = await createDataURLFromURI(uri);
        console.log('Data URL created successfully, length:', dataUrl.length);
        
        // Upload as a string with data URL format
        console.log('Uploading with uploadString method...');
        await uploadString(storageRef, dataUrl, 'data_url');
        
        console.log('Upload successful with data URL method');
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Download URL retrieved:', downloadURL);
        
        // Cache the URL
        await AsyncStorage.setItem(`profileImageURL_${user.uid}`, downloadURL);
        
        return downloadURL;
      } catch (iosError) {
        console.error('iOS-specific method failed:', iosError);
        throw iosError;
      }
    } else {
      // For non-iOS devices, use standard blob approach
      try {
        const storageRef = ref(storage, imagePath);
        
        console.log('Creating blob from URI for non-iOS platform');
        const response = await fetch(uri);
        const blob = await response.blob();
        
        console.log(`Blob size: ${blob.size / 1024} KB, uploading...`);
        await uploadBytes(storageRef, blob);
        
        console.log('Blob upload successful!');
        
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Download URL:', downloadURL);
        
        await AsyncStorage.setItem(`profileImageURL_${user.uid}`, downloadURL);
        
        return downloadURL;
      } catch (error) {
        console.error('Standard upload failed:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Direct URI upload failed completely:', error);
    throw error;
  }
};

// Add a function to save profile image locally without Firebase
export const saveProfileImageLocally = async (user, uri) => {
  try {
    if (!user) throw new Error('No user is logged in');
    if (!uri) throw new Error('No image URI provided');
    
    console.log('Saving profile image locally for user:', user.uid);
    
    // Save the direct URI to AsyncStorage
    await AsyncStorage.setItem(`localProfileImage_${user.uid}`, uri);
    console.log('Profile image URI saved locally:', uri);
    
    // Also save it in the standard location for compatibility
    await AsyncStorage.setItem(`profileImageURL_${user.uid}`, uri);
    
    return uri;
  } catch (error) {
    console.error('Error saving profile image locally:', error);
    throw error;
  }
};

/**
 * Optimized function to upload profile images to Firebase Storage on Blaze plan
 * @param {Object} storage - Firebase storage reference
 * @param {Object} user - Firebase auth current user
 * @param {string} uri - Image URI to upload
 * @returns {Promise<string>} - Download URL
 */
export const uploadProfileImage = async (storage, user, uri) => {
  if (!user) throw new Error('No user is logged in');
  if (!uri) throw new Error('No image URI provided');
  
  console.log('Starting cloud upload process for user:', user.uid);
  
  // Create a reference to the profile image with timestamp to avoid caching issues
  const timestamp = new Date().getTime();
  const imagePath = `profileImages/profile_${user.uid}_${timestamp}.jpg`;
  console.log('Target image path:', imagePath);
  const storageRef = ref(storage, imagePath);
  
  try {
    // Get file info
    console.log('Checking file at URI:', uri);
    let fileInfo = null;
    try {
      fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist at path: ' + uri);
      }
    } catch (error) {
      // Some URI schemes might not be compatible with getInfoAsync 
      console.log('Could not get file info, continuing anyway:', error);
    }
    
    // Try direct blob creation first
    let uploadResult;
    try {
      console.log('Attempting blob upload...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Blob has zero size');
      }
      
      console.log(`Created blob with size: ${blob.size} bytes`);
      uploadResult = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          'userId': user.uid,
          'uploadedAt': new Date().toISOString()
        }
      });
      console.log('Blob upload successful');
    } catch (blobError) {
      console.log('Blob upload failed, trying base64 method:', blobError);
      
      // Fallback: Try reading as base64 and uploading
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      console.log(`Read file as base64, length: ${base64Data.length}`);
      
      // Create the full data URL
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;
      
      // Upload using uploadString
      uploadResult = await uploadBytes(storageRef, Buffer.from(base64Data, 'base64'), {
        contentType: 'image/jpeg'
      });
      console.log('Base64 upload successful');
    }
    
    // Get the download URL for the uploaded image
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Download URL:', downloadURL);
    
    // Store the profile image URL in AsyncStorage for quick access
    await AsyncStorage.setItem(`profileImageURL_${user.uid}`, downloadURL);
    
    // Update the user's profile record in Firestore
    await updateUserProfileStorage(user.uid, downloadURL, imagePath);
    
    // Return the download URL
    return downloadURL;
  } catch (error) {
    console.error('Profile image upload failed:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'storage/unauthorized') {
      Alert.alert(
        'Permission Error',
        'You do not have permission to upload images. Please check Firebase Storage rules.'
      );
    } else if (error.code === 'storage/quota-exceeded') {
      Alert.alert(
        'Storage Limit Reached',
        'Your Firebase Storage quota has been exceeded.'
      );
    } else {
      Alert.alert(
        'Upload Failed',
        'Could not upload image. Please try again later.'
      );
    }
    
    throw error;
  }
};

/**
 * Update user profile image references in Firestore
 */
const updateUserProfileStorage = async (userId, imageUrl, imagePath) => {
  try {
    // Add record to Firestore
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      photoURL: imageUrl,
      photoPath: imagePath,
      photoUpdatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('User profile image references updated in Firestore');
    return true;
  } catch (error) {
    console.error('Failed to update profile image references:', error);
    return false;
  }
}; 