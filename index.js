import { registerRootComponent } from 'expo';
import App from './App';
import { LogBox } from 'react-native';

// Suppress specific React warnings
LogBox.ignoreLogs([
  'Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.'
]);

// Register the main component
registerRootComponent(App); 