import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar, Animated, Easing, Modal, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

// IMPORTANT: This is a simulated Bluetooth screen
// No actual Bluetooth functionality is implemented
// For real device connectivity, you would need to integrate
// with a compatible Bluetooth library or use Expo dev build

const BluetoothScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const [currentScreen, setCurrentScreen] = useState('initial'); // 'initial', 'scanning', 'selection'
  const [devices, setDevices] = useState([]);
  const [animation] = useState(new Animated.Value(0));
  const [initialAnimation] = useState(new Animated.Value(0));
  const [showHelp, setShowHelp] = useState(false);

  // Simulated devices
  const simulatedDevices = [
    { id: '1', name: 'R02_A5AE', mac: '56:40:00:f9:a5:ae' },
    { id: '2', name: 'R02_A5AF', mac: '56:40:11:f6:a5:aa' },
  ];

  useEffect(() => {
    // Start the initial screen animation
    Animated.loop(
      Animated.timing(initialAnimation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    if (currentScreen === 'scanning') {
      // Start circle animation
      Animated.loop(
        Animated.timing(animation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Simulate device discovery
      const timer = setTimeout(() => {
        setDevices(simulatedDevices);
        setCurrentScreen('selection');
      }, 3000);

      return () => {
        animation.setValue(0);
        clearTimeout(timer);
      };
    }
  }, [currentScreen]);

  const handleDeviceSelect = (device) => {
    // Simulating connection process
    setTimeout(() => {
      navigation.navigate('Home');
    }, 1500);
  };

  const startScan = () => {
    setCurrentScreen('scanning');
    setDevices([]);
  };

  const cancelScan = () => {
    setCurrentScreen('initial');
  };

  const searchAgain = () => {
    setCurrentScreen('initial');
  };

  const toggleHelpModal = () => {
    setShowHelp(!showHelp);
  };

  // Help screen modal component
  const HelpModal = () => (
    <Modal
      visible={showHelp}
      animationType="slide"
      transparent={true}
      onRequestClose={toggleHelpModal}
    >
      <View style={[
        styles.modalOverlay,
        { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }
      ]}>
        <Surface style={[
          styles.helpModalContent,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }
        ]}>
          <View style={styles.helpModalHeader}>
            <Text style={[
              styles.helpModalTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              Bluetooth Connection Help
            </Text>
            <TouchableOpacity onPress={toggleHelpModal} style={styles.closeButton}>
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={isDarkMode ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.helpScrollView}>
            <View style={styles.helpSection}>
              <Text style={[
                styles.helpSectionTitle,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                How to Connect Your Ring
              </Text>
              <View style={styles.helpStep}>
                <View style={[
                  styles.helpStepNumber,
                  { backgroundColor: '#9e77ed' }
                ]}>
                  <Text style={styles.helpStepNumberText}>1</Text>
                </View>
                <Text style={[
                  styles.helpStepText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Make sure your ring is charged and powered on. The LED indicator should be blinking.
                </Text>
              </View>
              <View style={styles.helpStep}>
                <View style={[
                  styles.helpStepNumber,
                  { backgroundColor: '#9e77ed' }
                ]}>
                  <Text style={styles.helpStepNumberText}>2</Text>
                </View>
                <Text style={[
                  styles.helpStepText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Tap the "scan" button to search for nearby devices.
                </Text>
              </View>
              <View style={styles.helpStep}>
                <View style={[
                  styles.helpStepNumber,
                  { backgroundColor: '#9e77ed' }
                ]}>
                  <Text style={styles.helpStepNumberText}>3</Text>
                </View>
                <Text style={[
                  styles.helpStepText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Select your ring from the list of available devices. The name should start with "R02_".
                </Text>
              </View>
              <View style={styles.helpStep}>
                <View style={[
                  styles.helpStepNumber,
                  { backgroundColor: '#9e77ed' }
                ]}>
                  <Text style={styles.helpStepNumberText}>4</Text>
                </View>
                <Text style={[
                  styles.helpStepText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Wait for the connection to complete. This may take a few seconds.
                </Text>
              </View>
            </View>

            <View style={styles.helpSection}>
              <Text style={[
                styles.helpSectionTitle,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                Troubleshooting
              </Text>
              <View style={styles.troubleshootingItem}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={20} 
                  color="#9e77ed" 
                  style={styles.troubleshootingIcon}
                />
                <Text style={[
                  styles.troubleshootingText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  If your ring doesn't appear in the list, make sure it's in pairing mode and try scanning again.
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={20} 
                  color="#9e77ed" 
                  style={styles.troubleshootingIcon}
                />
                <Text style={[
                  styles.troubleshootingText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Ensure Bluetooth is enabled on your phone in the system settings.
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={20} 
                  color="#9e77ed" 
                  style={styles.troubleshootingIcon}
                />
                <Text style={[
                  styles.troubleshootingText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  If connection fails, try restarting your ring and your phone's Bluetooth.
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <MaterialCommunityIcons 
                  name="alert-circle-outline" 
                  size={20} 
                  color="#9e77ed" 
                  style={styles.troubleshootingIcon}
                />
                <Text style={[
                  styles.troubleshootingText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Make sure your ring is within 30 feet (10 meters) of your phone.
                </Text>
              </View>
            </View>

            <View style={styles.helpSection}>
              <Text style={[
                styles.helpSectionTitle,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                Battery Tips
              </Text>
              <View style={styles.batteryTip}>
                <MaterialCommunityIcons 
                  name="battery-positive" 
                  size={20} 
                  color="#4CAF50" 
                  style={styles.batteryTipIcon}
                />
                <Text style={[
                  styles.batteryTipText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Fully charge your ring before first use.
                </Text>
              </View>
              <View style={styles.batteryTip}>
                <MaterialCommunityIcons 
                  name="battery-positive" 
                  size={20} 
                  color="#4CAF50" 
                  style={styles.batteryTipIcon}
                />
                <Text style={[
                  styles.batteryTipText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  A full charge typically lasts 3-5 days depending on usage.
                </Text>
              </View>
              <View style={styles.batteryTip}>
                <MaterialCommunityIcons 
                  name="battery-positive" 
                  size={20} 
                  color="#4CAF50" 
                  style={styles.batteryTipIcon}
                />
                <Text style={[
                  styles.batteryTipText,
                  { color: isDarkMode ? '#DDDDDD' : '#333333' }
                ]}>
                  Low battery may cause connection issues.
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.closeHelpButton,
                { backgroundColor: '#9e77ed' }
              ]}
              onPress={toggleHelpModal}
            >
              <Text style={styles.closeHelpButtonText}>Got It</Text>
            </TouchableOpacity>
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );

  const renderInitialScreen = () => {
    // Animation for ripple effect
    const rippleScale = initialAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2]
    });

    return (
      <View style={styles.screenContainer}>
        <Text style={[
          styles.instructionText,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>Lets connect your vehicle</Text>
          
        <View style={[styles.centerContainer, { position: 'relative', marginTop: -50 }]}>
          <Animated.View 
            style={[
              styles.circlePulse,
              {
                transform: [{ scale: rippleScale }],
                opacity: initialAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0]
                }),
                backgroundColor: isDarkMode ? 'rgba(158, 119, 237, 0.3)' : 'rgba(158, 119, 237, 0.5)'
              }
            ]} 
          />
          <TouchableOpacity 
            style={[
              styles.circleButton, 
              { 
                backgroundColor: '#9e77ed'
              }
            ]}
            onPress={startScan}
          >
            <MaterialCommunityIcons name="plus" size={40} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.modernScanButton, { backgroundColor: isDarkMode ? '#333333' : '#000000' }]} 
          onPress={startScan}
        >
          <Text style={styles.scanButtonText}>scan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScanningScreen = () => {
    // Animation for ripple effect
    const rippleScale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2]
    });

    return (
      <View style={styles.screenContainer}>
        <Text style={[
          styles.instructionText,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>Scanning Device</Text>
        
        <View style={[styles.centerContainer, { position: 'relative' }]}>
          <Animated.View 
            style={[
              styles.circlePulse,
              {
                transform: [{ scale: rippleScale }],
                opacity: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0]
                }),
                backgroundColor: isDarkMode ? 'rgba(158, 119, 237, 0.3)' : 'rgba(158, 119, 237, 0.5)'
              }
            ]} 
          />
          <View style={[styles.circleButton, { backgroundColor: '#9e77ed' }]} />
        </View>
        
        <TouchableOpacity
          style={[styles.modernCancelButton, { backgroundColor: '#000000' }]}
          onPress={cancelScan}
        >
          <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectionScreen = () => (
    <View style={styles.screenContainer}>
      <Text style={[
        styles.instructionText,
        { color: isDarkMode ? '#FFFFFF' : '#000000' }
      ]}>Choose your ring from the list</Text>
      
      <View style={styles.deviceList}>
        {devices.map((device, index) => (
          <React.Fragment key={device.id}>
            <TouchableOpacity
              style={[
                styles.deviceItem,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'transparent' }
              ]}
              onPress={() => handleDeviceSelect(device)}
            >
              <View>
                <Text style={[
                  styles.deviceName,
                  { color: isDarkMode ? '#FFFFFF' : '#000000' }
                ]}>{device.name}</Text>
                <Text style={[
                  styles.deviceMac,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>{device.mac}</Text>
              </View>
            </TouchableOpacity>
            
            {index < devices.length - 1 && (
              <View style={[
                styles.divider,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.modernActionButton, { 
          backgroundColor: '#000000',
          position: 'absolute',
          bottom: 100,
          alignSelf: 'center'
        }]}
        onPress={searchAgain}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.modernActionButtonText}>Scan Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render the appropriate screen based on current state
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'initial':
        return renderInitialScreen();
      case 'scanning':
        return renderScanningScreen();
      case 'selection':
        return renderSelectionScreen();
      default:
        return renderInitialScreen();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#121212" : "#FFFFFF"}
        translucent={Platform.OS === 'android'}
      />
      <View style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
      ]}>
        <View style={[
          styles.header,
          { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
        ]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons 
              name="chevron-left" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>Connect Ring</Text>
          <TouchableOpacity onPress={toggleHelpModal}>
            <Text style={[
              styles.helpText,
              { color: isDarkMode ? '#9e77ed' : '#000000' }
            ]}>Help</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[
          styles.content,
          { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
        ]}>
          {renderCurrentScreen()}
        </View>
        
        {/* Help Modal */}
        <HelpModal />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingBottom: 10,
    marginTop: Platform.OS === 'android' ? 10 : 0,
    height: Platform.OS === 'android' ? 60 : 'auto',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingBottom: 60, // Ensure content doesn't hide behind navigation bar
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  circlePulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1,
  },
  modernScanButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    width: 160, 
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  modernCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    backgroundColor: '#000000',
    marginBottom: 200,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modernActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  actionButton: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  deviceList: {
    width: '100%',
    flex: 1,
    marginVertical: 20,
  },
  deviceItem: {
    paddingVertical: 12,
    width: '100%',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  deviceMac: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
  },
  // Help Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpScrollView: {
    padding: 20,
  },
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  helpStep: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  helpStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  helpStepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpStepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  troubleshootingIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  troubleshootingText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  batteryTip: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  batteryTipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  batteryTipText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  closeHelpButton: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  closeHelpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default BluetoothScreen; 