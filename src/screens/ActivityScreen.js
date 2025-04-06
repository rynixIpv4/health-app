import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, StatusBar, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Rect, Line } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

const ActivityScreen = () => {
  const navigation = useNavigation();
  const [timeRange, setTimeRange] = useState('daily');
  const { isDarkMode } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));

  // Chart width constant
  const chartWidth = screenWidth - 80;

  // Animated values for each card
  const [cardAnimations] = useState({
    steps: new Animated.Value(0),
    heart: new Animated.Value(0),
    cycling: new Animated.Value(0),
    sleep: new Animated.Value(0)
  });

  // Animate cards when the component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const animations = Object.keys(cardAnimations).map((key, index) => {
      return Animated.timing(cardAnimations[key], {
        toValue: 1,
        duration: 500,
        delay: 300 + (index * 100),
        useNativeDriver: true,
      });
    });

    Animated.stagger(100, animations).start();
  }, []);

  // Navigation handler
  const navigateToStats = (type) => {
    navigation.navigate('Stats', { type });
  };

  // Activity data by category and time range
  const activityData = {
    steps: {
      daily: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
        data: [200, 450, 800, 1200, 1500, 2000],
      },
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [6500, 7200, 8400, 7800, 8432, 9100, 8200],
      },
      monthly: {
        labels: ['W1', 'W2', 'W3', 'W4'],
        data: [45000, 52000, 49000, 58000],
      },
      color: '#9e77ed',
      title: 'Steps Overview',
      icon: 'shoe-print',
      unit: 'steps',
      goal: 10000,
    },
    heart: {
      daily: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
        data: [68, 72, 75, 70, 73, 71],
      },
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [68, 72, 75, 70, 73, 71, 69],
      },
      monthly: {
        labels: ['W1', 'W2', 'W3', 'W4'],
        data: [70, 72, 71, 69],
      },
      color: '#FF5252',
      title: 'Heart Rate',
      icon: 'heart-pulse',
      unit: 'bpm',
      goal: 72,
    },
    cycling: {
      daily: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [3, 4, 5, 6, 7, 5, 3],
      },
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [3, 4, 5, 6, 7, 5, 3],
      },
      monthly: {
        labels: ['W1', 'W2', 'W3', 'W4'],
        data: [20, 28, 18, 30],
      },
      color: '#2196F3',
      title: 'Cycling',
      icon: 'bike',
      unit: 'km',
      goal: 30,
    },
    sleep: {
      daily: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [6, 6.5, 7, 7.5, 8, 7.5, 7],
      },
      weekly: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [6, 6.5, 7, 7.5, 8, 7.5, 7],
      },
      monthly: {
        labels: ['W1', 'W2', 'W3', 'W4'],
        data: [6.8, 7.2, 7.5, 6.9],
      },
      color: '#4CAF50',
      title: 'Sleep',
      icon: 'power-sleep',
      unit: 'hrs',
      goal: 8,
    },
  };

  // Get the current value of a specific metric
  const getCurrentValue = (type) => {
    const data = activityData[type][timeRange].data;
    return data[data.length - 1];
  };

  // Calculate progress percentage
  const getProgressPercentage = (type) => {
    const current = getCurrentValue(type);
    const goal = activityData[type].goal;
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  // Simple bar chart component for all metrics
  const SimpleBarChart = ({ data, labels, colors }) => {
    // Find the max value for scaling
    const maxValue = Math.max(...data) * 1.1; // Add 10% padding
    const chartHeight = 150;
    const barWidth = 12;
    const barSpacing = (chartWidth - (barWidth * data.length)) / (data.length + 1);
    
    return (
      <View style={styles.chartContainer}>
        {/* Grid lines */}
        <View style={styles.gridLines}>
          <View style={[
            styles.gridLine,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]} />
          <View style={[
            styles.gridLine,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]} />
          <View style={[
            styles.gridLine,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]} />
        </View>
        
        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const startX = barSpacing + (index * (barWidth + barSpacing));
            
            return (
              <View key={index} style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: colors,
                      width: barWidth,
                    }
                  ]}
                />
                <Text style={[
                  styles.barLabel,
                  { color: isDarkMode ? '#AAAAAA' : '#666666' }
                ]}>
                  {labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Activity card component to reduce repetition
  const ActivityCard = ({ type, index }) => {
    const data = activityData[type];
    const currentData = data[timeRange];
    const progress = getProgressPercentage(type);
    const currentValue = getCurrentValue(type);
    
    return (
      <Animated.View
        style={{
          opacity: cardAnimations[type],
          transform: [
            { 
              translateY: cardAnimations[type].interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => navigateToStats(type)}
        >
          <Surface style={[
            styles.activityCard,
            { backgroundColor: isDarkMode ? '#2c2c2c' : '#FFFFFF' }
          ]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <View style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: isDarkMode 
                      ? 'rgba(255,255,255,0.1)' 
                      : `${data.color}20`
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name={data.icon} 
                    size={24} 
                    color={data.color} 
                  />
                </View>
                <View>
                  <Text style={[
                    styles.cardTitle,
                    { color: isDarkMode ? '#FFFFFF' : '#000000' }
                  ]}>{data.title}</Text>
                  <Text style={[
                    styles.cardSubtitle,
                    { color: isDarkMode ? '#BBBBBB' : '#666666' }
                  ]}>
                    {currentValue} {data.unit}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => navigateToStats(type)}
              >
                <Text style={{ color: data.color }}>Details</Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={18} 
                  color={data.color} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={[
                styles.progressBar,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
              ]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progress}%`, 
                      backgroundColor: data.color 
                    }
                  ]} 
                />
              </View>
              <Text style={[
                styles.progressText,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>{progress}% of daily goal</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <SimpleBarChart 
                data={currentData.data} 
                labels={currentData.labels}
                colors={data.color} 
              />
            </View>
            
            <View style={styles.tapHintContainer}>
              <Text style={[
                styles.tapHintText,
                { color: isDarkMode ? '#AAAAAA' : '#666666' }
              ]}>
                Tap for detailed view
              </Text>
            </View>
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[
      styles.safeArea,
      { backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#121212" : "#F8F9FA"}
        translucent={Platform.OS === 'android'} 
      />
      
      <Animated.View style={[
        styles.container,
        { 
          backgroundColor: isDarkMode ? '#121212' : '#F8F9FA',
          opacity: fadeAnim 
        }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>Activity</Text>
          
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons 
              name="bell-outline" 
              size={24} 
              color={isDarkMode ? "#FFFFFF" : "#000000"} 
            />
          </TouchableOpacity>
        </View>

        {/* Time Range Filter */}
        <View style={[
          styles.timeFilterContainer,
          { backgroundColor: isDarkMode ? '#2c2c2c' : '#FFFFFF' }
        ]}>
          <TouchableOpacity
            style={[
              styles.timeFilterButton,
              timeRange === 'daily' && [
                styles.activeTimeFilter,
                { backgroundColor: isDarkMode ? '#3c3c3c' : '#F0F0F0' }
              ]
            ]}
            onPress={() => setTimeRange('daily')}
          >
            <Text style={[
              styles.timeFilterText,
              { color: isDarkMode ? '#AAAAAA' : '#666666' },
              timeRange === 'daily' && { 
                color: isDarkMode ? '#FFFFFF' : '#000000',
                fontWeight: '600'
              }
            ]}>Daily</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeFilterButton,
              timeRange === 'weekly' && [
                styles.activeTimeFilter,
                { backgroundColor: isDarkMode ? '#3c3c3c' : '#F0F0F0' }
              ]
            ]}
            onPress={() => setTimeRange('weekly')}
          >
            <Text style={[
              styles.timeFilterText,
              { color: isDarkMode ? '#AAAAAA' : '#666666' },
              timeRange === 'weekly' && { 
                color: isDarkMode ? '#FFFFFF' : '#000000',
                fontWeight: '600'
              }
            ]}>Weekly</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeFilterButton,
              timeRange === 'monthly' && [
                styles.activeTimeFilter,
                { backgroundColor: isDarkMode ? '#3c3c3c' : '#F0F0F0' }
              ]
            ]}
            onPress={() => setTimeRange('monthly')}
          >
            <Text style={[
              styles.timeFilterText,
              { color: isDarkMode ? '#AAAAAA' : '#666666' },
              timeRange === 'monthly' && { 
                color: isDarkMode ? '#FFFFFF' : '#000000',
                fontWeight: '600'
              }
            ]}>Monthly</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <ActivityCard type="steps" index={0} />
          <ActivityCard type="heart" index={1} />
          <ActivityCard type="cycling" index={2} />
          <ActivityCard type="sleep" index={3} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 8,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom tab bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: Platform.OS === 'android' ? 10 : 0,
    height: Platform.OS === 'android' ? 60 : 'auto',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeFilterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
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
  timeFilterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTimeFilter: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timeFilterText: {
    fontSize: 14,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    marginLeft: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  chartContainer: {
    marginTop: 8,
    height: 180,
    width: '100%',
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'space-between',
  },
  gridLine: {
    width: '100%',
    height: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingBottom: 30, // Space for labels
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  tapHintContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  tapHintText: {
    fontSize: 12,
    fontStyle: 'italic',
  }
});

export default ActivityScreen; 