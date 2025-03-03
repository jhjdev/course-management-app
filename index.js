// index.js
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <ExpoRoot />
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
