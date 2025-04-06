import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const barWidth = (width - 80) / 7; // 7 days in a week

const StatsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { type = 'steps' } = route.params || {};
  const { isDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState('W'); // D, W, M, 6M, Y
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Sample data for different metrics
  const data = {
    steps: {
      title: 'Steps',
      unit: 'steps',
      color: '#9e77ed',
      today: 10790,
      average: 2458,
      weeklyData: [4000, 5000, 7000, 9000, 10790, 9500, 6000],
      yAxisLabels: ['', '5000', '10000', '15000', '20000', '25000', '30000'],
      icon: 'shoe-print'
    },
    sleep: {
      title: 'Sleep',
      unit: 'hrs',
      color: '#9e77ed',
      today: 7.5,
      average: 6.8,
      weeklyData: [6, 6.5, 7, 7.5, 8, 7.5, 7],
      yAxisLabels: ['', '5 hr', '6 hr', '7 hr', '8 hr', '9 hr'],
      icon: 'power-sleep'
    },
    cycling: {
      title: 'Cycling',
      unit: 'KM',
      color: '#9e77ed',
      today: 5,
      average: 7,
      weeklyData: [3, 4, 5, 6, 7, 5, 3],
      yAxisLabels: ['', '2 KM', '4 KM', '6 KM', '8 KM', '10 KM'],
      icon: 'bike'
    },
    heart: {
      title: 'Heart',
      unit: 'BPM',
      color: '#9e77ed',
      today: 78,
      average: 72,
      weeklyData: [70, 75, 72, 78, 76, 72, 70],
      yAxisLabels: ['', '50', '100', '150', '200'],
      icon: 'heart-pulse'
    }
  };

  const currentMetric = data[type];
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const tabs = [
    { key: 'D', label: 'D' },
    { key: 'W', label: 'W' },
    { key: 'M', label: 'M' },
    { key: '6M', label: '6M' },
    { key: 'Y', label: 'Y' },
  ];

  // Format the current date as "Jan 1-7, 2023"
  const getFormattedDateRange = () => {
    const date = currentDate;
    const month = date.toLocaleString('default', { month: 'short' });
    const startDay = 1;
    const endDay = 7;
    const year = date.getFullYear();
    return `${month} ${startDay}-${endDay}, ${year}`;
  };

  // Get the maximum value for scaling the chart
  const getMaxValue = () => {
    return Math.max(...currentMetric.weeklyData) * 1.2;
  };

  // Calculate the height of each bar based on its value
  const getBarHeight = (value) => {
    const maxValue = getMaxValue();
    const maxHeight = 200; // Maximum height for bars in pixels
    return (value / maxValue) * maxHeight;
  };

  return (
    <SafeAreaView style={[
      styles.safeArea, 
      { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }
    ]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: isDarkMode ? '#2c2c2c' : '#f0f0f0' }
            ]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons 
              name="chevron-left" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>{currentMetric.title}</Text>
          <View style={{ width: 40 }} />
          {/* Empty view for balanced header - no text needed */}
        </View>

        {/* Tab Navigation */}
        <View style={[
          styles.tabContainer,
          { backgroundColor: isDarkMode ? '#2c2c2c' : '#f0f0f0' }
        ]}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab, 
                activeTab === tab.key && [
                  styles.activeTab,
                  { backgroundColor: isDarkMode ? '#3c3c3c' : '#FFFFFF' }
                ]
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText, 
                { color: isDarkMode ? '#999999' : '#666666' },
                activeTab === tab.key && { 
                  color: isDarkMode ? '#FFFFFF' : '#000000' 
                }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Range */}
        <Text style={[
          styles.dateRange,
          { color: isDarkMode ? '#999999' : '#666666' }
        ]}>{getFormattedDateRange()}</Text>

        <ScrollView>
          {/* Chart Y-Axis Labels */}
          <View style={styles.chartContainer}>
            <View style={styles.yAxisLabels}>
              {currentMetric.yAxisLabels.map((label, index) => (
                <Text key={index} style={[
                  styles.yAxisLabel,
                  { color: isDarkMode ? '#777777' : '#999999' }
                ]}>{label}</Text>
              ))}
            </View>

            {/* Chart Bars */}
            <View style={styles.barChartContainer}>
              {/* Horizontal grid lines */}
              {[...Array(6)].map((_, index) => (
                <View key={index} style={[
                  styles.gridLine, 
                  { 
                    top: (index) * (200 / 5),
                    backgroundColor: isDarkMode ? '#333333' : '#EEEEEE'
                  }
                ]} />
              ))}

              {/* Bars */}
              <View style={styles.barsContainer}>
                {currentMetric.weeklyData.map((value, index) => (
                  <View key={index} style={styles.barColumn}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: getBarHeight(value), 
                          backgroundColor: currentMetric.color
                        }
                      ]} 
                    />
                    <Text style={[
                      styles.barLabel,
                      { color: isDarkMode ? '#999999' : '#666666' }
                    ]}>{days[index]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Today & Average Stats */}
          <View style={styles.statsContainer}>
            <View style={[
              styles.statBox,
              { backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9' }
            ]}>
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#999999' : '#666666' }
              ]}>Today</Text>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#333333' }
              ]}>
                {currentMetric.today.toLocaleString()} 
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#999999' : '#666666' }
                ]}>{currentMetric.unit}</Text>
              </Text>
            </View>
            <View style={[
              styles.statBox,
              { backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9' }
            ]}>
              <Text style={[
                styles.statLabel,
                { color: isDarkMode ? '#999999' : '#666666' }
              ]}>Average</Text>
              <Text style={[
                styles.statValue,
                { color: isDarkMode ? '#FFFFFF' : '#333333' }
              ]}>
                {currentMetric.average.toLocaleString()} 
                <Text style={[
                  styles.statUnit,
                  { color: isDarkMode ? '#999999' : '#666666' }
                ]}>{currentMetric.unit}</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#000000',
  },
  dateRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 250,
    marginBottom: 24,
  },
  yAxisLabels: {
    width: 40,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
  },
  barChartContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 20, // Space for bar labels
  },
  barColumn: {
    alignItems: 'center',
    width: barWidth,
  },
  bar: {
    width: barWidth - 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    position: 'absolute',
    bottom: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
});

export default StatsScreen; 