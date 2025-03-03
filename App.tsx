import React from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from './app/store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ExpoRoot } from 'expo-router';

export default function App() {
return (
<Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
    <SafeAreaProvider>
        <ExpoRoot />
    </SafeAreaProvider>
    </PersistGate>
</Provider>
);
}
