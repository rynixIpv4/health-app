import React from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  Platform, 
  StatusBar, 
  SafeAreaView, 
  Dimensions, 
  TouchableOpacity
} from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { setIsOnboarded } = useUser();

  // Handle get started button press
  const handleGetStarted = () => {
    setIsOnboarded(true);
    
    // Navigate to the SignIn screen
    // and reset the navigation stack to prevent going back to onboarding
    navigation.reset({
      index: 0,
      routes: [{ name: 'SignIn' }],
    });
  };

  return (
    <SafeAreaView style={[
      styles.safeArea,
      { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent 
      />
      
      <View style={styles.container}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/running-woman.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={[
            styles.title,
            { color: isDarkMode ? '#ffffff' : '#000000' }
          ]}>
            Let's Start Your Fitness Journey
          </Text>
          
          <Text style={[
            styles.subtitle,
            { color: isDarkMode ? '#aaaaaa' : '#666666' }
          ]}>
            We are here to keep your Health on track
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.button,
              { backgroundColor: '#000000', width: '80%' }
            ]} 
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 45,
    margin: 20,
    marginBottom: 5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666666',
  },
  button: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  }
});

export default OnboardingScreen; 