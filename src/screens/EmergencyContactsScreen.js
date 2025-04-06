import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const EmergencyContactsScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { userData, setUserData } = useUser();

  // State for editing mode
  const [isEditing, setIsEditing] = useState(false);
  // State for contacts - initialize as empty array instead of default contacts
  const [contacts, setContacts] = useState([]);
  // State for loading
  const [isLoading, setIsLoading] = useState(true);
  // State for new contact form
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    countryCode: '+1',
    phone: '',
    isDefault: false,
  });
  // State for showing add contact form
  const [showAddForm, setShowAddForm] = useState(false);

  // Load emergency contacts from Firestore when the component mounts
  useEffect(() => {
    const loadEmergencyContacts = async () => {
      try {
        setIsLoading(true);
        if (!auth.currentUser) {
          console.log('EmergencyContactsScreen: No user logged in');
          setIsLoading(false);
          return;
        }

        // First check if there are emergency contacts in userData
        if (userData?.emergencyContacts) {
          console.log('EmergencyContactsScreen: Using emergency contacts from userData');
          setContacts(userData.emergencyContacts);
          setIsLoading(false);
          return;
        }

        // If not in userData, check Firestore
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.emergencyContacts && userData.emergencyContacts.length > 0) {
            console.log('EmergencyContactsScreen: Loaded emergency contacts from Firestore');
            setContacts(userData.emergencyContacts);
            // Update local userData as well to keep it in sync
            setUserData({ ...userData, emergencyContacts: userData.emergencyContacts });
          } else {
            console.log('EmergencyContactsScreen: No emergency contacts found, initializing empty array');
            // Initialize with empty array for new users
            setContacts([]);
          }
        } else {
          console.log('EmergencyContactsScreen: User document not found');
          setContacts([]);
        }
      } catch (error) {
        console.error('Error loading emergency contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmergencyContacts();
  }, [userData, setUserData]);

  // Update Firestore with the new contacts list
  const saveContactsToFirestore = async (updatedContacts) => {
    try {
      if (!auth.currentUser) return;
      
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      
      // Update Firestore document with the new contacts
      await updateDoc(userDocRef, {
        emergencyContacts: updatedContacts
      });
      
      console.log('Emergency contacts saved to Firestore');
    } catch (error) {
      console.error('Error saving emergency contacts to Firestore:', error);
      Alert.alert(
        'Error',
        'Failed to save emergency contacts to the cloud. Please try again later.'
      );
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.relationship || !newContact.countryCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Generate a unique ID for the new contact
    const newId = Date.now().toString();
    
    // Format the contact object with proper phone structure
    const formattedContact = {
      ...newContact,
      id: newId,
      // Store country code and phone separately but also create a full display format
      phone: newContact.phone,
      countryCode: newContact.countryCode,
      phoneDisplay: `${newContact.countryCode} ${newContact.phone}`,
      // Make the contact default if it's the first one
      isDefault: contacts.length === 0 ? true : newContact.isDefault
    };
    
    // Update state with the new contact
    const updatedContacts = [...contacts, formattedContact];
    setContacts(updatedContacts);
    
    // Update local userData
    setUserData({ ...userData, emergencyContacts: updatedContacts });
    
    // Save to Firestore
    await saveContactsToFirestore(updatedContacts);
    
    // Reset the form
    setNewContact({ name: '', relationship: '', countryCode: '+1', phone: '', isDefault: false });
    setShowAddForm(false);
  };

  const handleDeleteContact = async (id) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedContacts = contacts.filter((contact) => contact.id !== id);
            
            // If we deleted the default contact, make the first remaining contact default
            if (updatedContacts.length > 0 && !updatedContacts.some(c => c.isDefault)) {
              updatedContacts[0].isDefault = true;
            }
            
            setContacts(updatedContacts);
            setUserData({ ...userData, emergencyContacts: updatedContacts });
            
            // Save to Firestore
            await saveContactsToFirestore(updatedContacts);
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id) => {
    const updatedContacts = contacts.map((contact) => ({
      ...contact,
      isDefault: contact.id === id,
    }));
    
    setContacts(updatedContacts);
    setUserData({ ...userData, emergencyContacts: updatedContacts });
    
    // Save to Firestore
    await saveContactsToFirestore(updatedContacts);
  };

  const handleEditContact = (id, field, value) => {
    const updatedContacts = contacts.map((contact) =>
      contact.id === id ? { ...contact, [field]: value } : contact
    );
    setContacts(updatedContacts);
  };

  const handleSaveChanges = async () => {
    // Update local state
    setUserData({ ...userData, emergencyContacts: contacts });
    
    // Save to Firestore
    await saveContactsToFirestore(contacts);
    
    setIsEditing(false);
  };

  const themeColors = {
    background: isDarkMode ? '#121212' : '#f8f9fa',
    card: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#212529',
    subText: isDarkMode ? '#adb5bd' : '#6c757d',
    accent: '#9e77ed',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    divider: isDarkMode ? '#2c2c2c' : '#e9ecef',
    inputBg: isDarkMode ? '#2c2c2c' : '#f1f3f5',
    inputBorder: isDarkMode ? '#444444' : '#ced4da',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.background}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.card }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={themeColors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            Emergency Contacts
          </Text>
          {isEditing ? (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.editActionButton,
                  { backgroundColor: themeColors.inputBg }
                ]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={[
                  styles.cancelButtonText,
                  { color: themeColors.text }
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editActionButton,
                  { backgroundColor: themeColors.accent }
                ]}
                onPress={handleSaveChanges}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: '#000000' }
              ]}
              onPress={() => setIsEditing(true)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#ffffff" />
              <Text style={[styles.editButtonText, { color: '#ffffff' }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Contact Button */}
        {!showAddForm && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors.card }]}
            onPress={() => setShowAddForm(true)}
          >
            <View style={styles.addButtonContent}>
              <View style={[styles.addIconContainer, { backgroundColor: 'rgba(158, 119, 237, 0.1)' }]}>
                <MaterialCommunityIcons name="plus" size={24} color={themeColors.accent} />
              </View>
              <Text style={[styles.addButtonText, { color: themeColors.text }]}>
                Add Emergency Contact
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={themeColors.subText}
            />
          </TouchableOpacity>
        )}

        {/* Add Contact Form */}
        {showAddForm && (
          <Surface style={[styles.formCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.formTitle, { color: themeColors.text }]}>
              Add New Contact
            </Text>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: themeColors.subText }]}>Name</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.text,
                  borderColor: themeColors.inputBorder,
                }]}
                value={newContact.name}
                onChangeText={(text) => setNewContact({ ...newContact, name: text })}
                placeholder="Contact Name"
                placeholderTextColor={themeColors.subText}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: themeColors.subText }]}>Relationship</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: themeColors.inputBg,
                  color: themeColors.text,
                  borderColor: themeColors.inputBorder,
                }]}
                value={newContact.relationship}
                onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
                placeholder="e.g. Parent, Sibling, Friend"
                placeholderTextColor={themeColors.subText}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: themeColors.subText }]}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={[styles.countryCodeInput, {
                    backgroundColor: themeColors.inputBg,
                    color: themeColors.text,
                    borderColor: themeColors.inputBorder,
                  }]}
                  value={newContact.countryCode}
                  onChangeText={(text) => setNewContact({ ...newContact, countryCode: text.startsWith('+') ? text : `+${text}` })}
                  placeholder="+1"
                  placeholderTextColor={themeColors.subText}
                  keyboardType="phone-pad"
                  maxLength={4}
                />
                <TextInput
                  style={[styles.phoneNumberInput, {
                    backgroundColor: themeColors.inputBg,
                    color: themeColors.text,
                    borderColor: themeColors.inputBorder,
                  }]}
                  value={newContact.phone}
                  onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={themeColors.subText}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, { backgroundColor: themeColors.inputBg }]}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={[styles.formButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, { backgroundColor: themeColors.accent }]}
                onPress={handleAddContact}
              >
                <Text style={[styles.formButtonText, { color: '#ffffff' }]}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}

        {/* Empty State Message */}
        {!isLoading && contacts.length === 0 && !showAddForm && (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={60}
              color={themeColors.subText}
              style={styles.emptyStateIcon}
            />
            <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
              No Emergency Contacts
            </Text>
            <Text style={[styles.emptyStateMessage, { color: themeColors.subText }]}>
              Add emergency contacts who should be notified in case of a medical emergency.
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Loading contacts...
            </Text>
          </View>
        )}

        {/* Contacts List */}
        {!isLoading && contacts.length > 0 && (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <Surface
                key={contact.id}
                style={[styles.contactCard, { backgroundColor: themeColors.card }]}
              >
                <View style={styles.contactHeader}>
                  <View style={styles.contactInfo}>
                    <View style={[styles.contactIconContainer, { backgroundColor: 'rgba(158, 119, 237, 0.1)' }]}>
                      <MaterialCommunityIcons
                        name="account"
                        size={24}
                        color={themeColors.accent}
                      />
                    </View>
                    {isEditing ? (
                      <View style={styles.contactEditFields}>
                        <TextInput
                          style={[styles.contactInput, {
                            backgroundColor: themeColors.inputBg,
                            color: themeColors.text,
                            borderColor: themeColors.inputBorder,
                          }]}
                          value={contact.name}
                          onChangeText={(text) => handleEditContact(contact.id, 'name', text)}
                        />
                        <TextInput
                          style={[styles.contactInput, {
                            backgroundColor: themeColors.inputBg,
                            color: themeColors.text,
                            borderColor: themeColors.inputBorder,
                          }]}
                          value={contact.relationship}
                          onChangeText={(text) => handleEditContact(contact.id, 'relationship', text)}
                        />
                      </View>
                    ) : (
                      <View style={styles.contactText}>
                        <Text style={[styles.contactName, { color: themeColors.text }]}>
                          {contact.name}
                        </Text>
                        <Text style={[styles.contactRelationship, { color: themeColors.subText }]}>
                          {contact.relationship}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isEditing ? (
                    <TouchableOpacity
                      style={[styles.deleteButton, { backgroundColor: themeColors.danger + '20' }]}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={themeColors.danger}
                      />
                    </TouchableOpacity>
                  ) : contact.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: themeColors.accent + '20' }]}>
                      <MaterialCommunityIcons
                        name="star"
                        size={12}
                        color={themeColors.accent}
                      />
                      <Text style={[styles.defaultText, { color: themeColors.accent }]}>
                        Primary
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.contactDetails}>
                  <View style={styles.phoneContainer}>
                    <MaterialCommunityIcons
                      name="phone"
                      size={16}
                      color={themeColors.subText}
                    />
                    {isEditing ? (
                      <View style={styles.phoneInputContainer}>
                        <TextInput
                          style={[styles.countryCodeInput, {
                            backgroundColor: themeColors.inputBg,
                            color: themeColors.text,
                            borderColor: themeColors.inputBorder,
                          }]}
                          value={contact.countryCode}
                          onChangeText={(text) => handleEditContact(contact.id, 'countryCode', text.startsWith('+') ? text : `+${text}`)}
                          keyboardType="phone-pad"
                          maxLength={4}
                        />
                        <TextInput
                          style={[styles.phoneNumberInput, {
                            backgroundColor: themeColors.inputBg,
                            color: themeColors.text,
                            borderColor: themeColors.inputBorder,
                          }]}
                          value={contact.phone}
                          onChangeText={(text) => handleEditContact(contact.id, 'phone', text)}
                          keyboardType="phone-pad"
                        />
                      </View>
                    ) : (
                      <Text style={[styles.phoneText, { color: themeColors.text }]}>
                        {`${contact.countryCode} ${contact.phone}`}
                      </Text>
                    )}
                  </View>
                  {isEditing && !contact.isDefault && (
                    <TouchableOpacity
                      style={[styles.setDefaultButton, { backgroundColor: themeColors.accent + '20' }]}
                      onPress={() => handleSetDefault(contact.id)}
                    >
                      <MaterialCommunityIcons
                        name="star-outline"
                        size={16}
                        color={themeColors.accent}
                      />
                      <Text style={[styles.setDefaultText, { color: themeColors.accent }]}>
                        Set as Primary
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Surface>
            ))}
          </View>
        )}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  editButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    minWidth: 70,
  },
  editButtonText: {
    fontWeight: '500',
    marginLeft: 4,
    color: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  formButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  formButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactsList: {
    marginTop: 8,
  },
  contactCard: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
  },
  contactEditFields: {
    flex: 1,
  },
  contactInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  contactDetails: {
    marginTop: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 16,
    marginLeft: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeInput: {
    width: 70,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  phoneNumberInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  setDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 160,
  },
  editActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
});

export default EmergencyContactsScreen; 