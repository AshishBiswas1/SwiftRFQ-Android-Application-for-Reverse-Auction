import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import BuyerDashboardScreen from './src/screens/BuyerDashboardScreen';
import CreateRfqScreen from './src/screens/CreateRfqScreen';
import SupplierPortalScreen from './src/screens/SupplierPortalScreen';
import LiveAuctionRoomScreen from './src/screens/LiveAuctionRoomScreen';
import AuctionClosedScreen from './src/screens/AuctionClosedScreen';
import SupplierDirectoryScreen from './src/screens/SupplierDirectoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BottomNavBar from './src/components/BottomNavBar';
import WavyBackground from './src/components/WavyBackground';
import { connectSocket, disconnectSocket } from './src/services/socket';
import { lightPalette, darkPalette } from './src/theme/tokens';

const THEME_STORAGE_KEY = 'swiftrfq_theme_mode';

export default function App() {
  const [theme, setTheme] = useState(lightPalette);
  const [role, setRole] = useState(null);
  const [screen, setScreen] = useState('SPLASH');
  const [activeRfq, setActiveRfq] = useState(null);

  const [rfqs, setRfqs] = useState([
    {
      id: 'RFQ-8821',
      commodity: 'Hydrogen Peroxide 50% IP Grade',
      quantity: 18000,
      unit: 'L',
      ceilingPrice: 38,
      minDecrement: 0.5,
      durationMinutes: 240,
      lowestBid: 36.4,
      bids: [
        { supplierName: 'Anveshan Chem',      amount: 36.4, timestamp: Date.now() - 360000 },
        { supplierName: 'Vardhan Industries', amount: 36.9, timestamp: Date.now() - 900000 },
        { supplierName: 'Kailash Oxides',     amount: 37.5, timestamp: Date.now() - 1500000 },
        { supplierName: 'Om Sai Chemicals',   amount: 38.2, timestamp: Date.now() - 2400000 },
      ],
    },
  ]);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'dark') setTheme(darkPalette);
        else if (savedMode === 'light') setTheme(lightPalette);
      } catch (e) {
        // Fallback remains lightPalette for first-time users
      }
    };
    loadSavedTheme();
    connectSocket();
    return () => disconnectSocket();
  }, []);

  const handleToggleTheme = async () => {
    const nextTheme = theme.mode === 'light' ? darkPalette : lightPalette;
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme.mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const handleSplashContinue = (nextTarget) => {
    if (nextTarget === 'INTRO') setScreen('INTRO');
    else if (nextTarget === 'BUYER_DASHBOARD') { setRole('BUYER'); setScreen('BUYER_DASHBOARD'); }
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setScreen(selectedRole === 'SUPPLIER' ? 'SUPPLIER_PORTAL' : 'BUYER_DASHBOARD');
  };

  const handleCreateRfq = (newRfqData) => {
    const rfqObj = {
      ...newRfqData,
      id: `RFQ-${Math.floor(1000 + Math.random() * 9000)}`,
      lowestBid: newRfqData.ceilingPrice,
      bids: [],
    };
    setRfqs([rfqObj, ...rfqs]);
    setActiveRfq(rfqObj);
    setScreen('LIVE_ROOM');
  };

  const handleOpenLiveRoom = (rfq) => {
    setActiveRfq(rfq);
    setScreen('LIVE_ROOM');
  };

  const renderCurrentScreen = () => {
    switch (screen) {
      case 'SPLASH':
        return <SplashScreen onContinue={handleSplashContinue} theme={theme} onToggleTheme={handleToggleTheme} />;
      case 'INTRO':
        return <OnboardingScreen onSelectRole={handleSelectRole} theme={theme} />;
      case 'BUYER_DASHBOARD':
        return (
          <BuyerDashboardScreen
            rfqs={rfqs}
            onCreateNew={() => setScreen('CREATE_RFQ')}
            onOpenLiveRoom={handleOpenLiveRoom}
            onOpenClosedRoom={() => setScreen('AUCTION_CLOSED')}
            onSelectTab={(tab) => setScreen(tab)}
            theme={theme}
          />
        );
      case 'CREATE_RFQ':
        return <CreateRfqScreen onCreateRfq={handleCreateRfq} onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} />;
      case 'SUPPLIER_PORTAL':
        return <SupplierPortalScreen rfq={activeRfq || rfqs[0]} onBack={() => setScreen('INTRO')} theme={theme} />;
      case 'LIVE_ROOM':
        return (
          <LiveAuctionRoomScreen
            rfq={activeRfq || rfqs[0]}
            role={role}
            onExit={() => setScreen('BUYER_DASHBOARD')}
            onShowWinner={() => setScreen('AUCTION_CLOSED')}
            theme={theme}
          />
        );
      case 'AUCTION_CLOSED':
        return <AuctionClosedScreen onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} />;
      case 'SUPPLIER_DIRECTORY':
        return <SupplierDirectoryScreen onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} />;
      case 'SETTINGS':
        return <SettingsScreen onBack={() => setScreen('BUYER_DASHBOARD')} theme={theme} onToggleTheme={handleToggleTheme} />;
      default:
        return <SplashScreen onContinue={handleSplashContinue} theme={theme} onToggleTheme={handleToggleTheme} />;
    }
  };

  const showNavBar = screen !== 'SPLASH' && screen !== 'INTRO';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

        {/*
         * WavyBackground wraps the screen content and navigation bar.
         * The wavy SVG is pinned to the absolute background with zero layout impact,
         * ensuring all components (screens, cards, inputs, buttons) render directly ON TOP.
         */}
        <WavyBackground theme={theme}>
          <View style={styles.screenLayer}>
            {renderCurrentScreen()}
          </View>

          {showNavBar && (
            <BottomNavBar
              activeTab={screen}
              onSelectTab={(tab) => setScreen(tab)}
              role={role}
              theme={theme}
            />
          )}
        </WavyBackground>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screenLayer: { flex: 1 },
});
