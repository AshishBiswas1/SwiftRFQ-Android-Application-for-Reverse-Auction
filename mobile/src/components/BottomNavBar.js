import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { lightPalette } from '../theme/tokens';

// Custom Vector SVG Icons matching Figma design
function RequirementsIcon({ color, size = 22, strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8L12 3L3 8V16L12 21L21 16V8Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 8L12 13L21 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SupplierPortalIcon({ color, size = 22, strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41L13.42 20.58C13.2343 20.766 13.0137 20.9135 12.7709 21.0141C12.5281 21.1148 12.2678 21.1666 12.005 21.1666C11.7422 21.1666 11.4819 21.1148 11.2391 21.0141C10.9963 20.9135 10.7757 20.766 10.59 20.58L2 12V2H12L20.59 10.59C20.9638 10.9647 21.1738 11.4716 21.1738 12C21.1738 12.5284 20.9638 13.0353 20.59 13.41Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
    </Svg>
  );
}

function SuppliersIcon({ color, size = 22, strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.4516 19 15.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11477 19.0078 7.001C19.0078 7.88723 18.7122 8.74808 18.1676 9.44968C17.623 10.1513 16.8604 10.6517 16 10.87"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SettingsIcon({ color, size = 22, strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 0 1 19.79 19.71A2 2 0 0 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 0 1 12.08 23A2 2 0 0 1 10.08 21V20.91A1.65 1.65 0 0 0 9.08 19.4A1.65 1.65 0 0 0 7.26 19.73L7.2 19.79A2 2 0 0 1 4.37 19.79A2 2 0 0 1 4.37 16.96L4.43 16.9A1.65 1.65 0 0 0 4.76 15.08A1.65 1.65 0 0 0 3.25 14.08H3A2 2 0 0 1 1 12.08A2 2 0 0 1 3 10.08H3.09A1.65 1.65 0 0 0 4.6 9.08A1.65 1.65 0 0 0 4.27 7.26L4.21 7.2A2 2 0 0 1 4.21 4.37A2 2 0 0 1 7.04 4.37L7.1 4.43A1.65 1.65 0 0 0 8.92 4.76A1.65 1.65 0 0 0 9.92 3.25V3A2 2 0 0 1 11.92 1A2 2 0 0 1 13.92 3V3.09A1.65 1.65 0 0 0 14.92 4.6A1.65 1.65 0 0 0 16.74 4.27L16.8 4.21A2 2 0 0 1 19.63 4.21A2 2 0 0 1 19.63 7.04L19.57 7.1A1.65 1.65 0 0 0 19.24 8.92A1.65 1.65 0 0 0 20.75 9.92H21A2 2 0 0 1 23 11.92A2 2 0 0 1 21 13.92H20.91A1.65 1.65 0 0 0 19.4 15Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SwitchRoleIcon({ color, size = 22, strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 3L21 8L16 13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 8H7C4.79086 8 3 9.79086 3 12V13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 21L3 16L8 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 16H17C19.2091 16 21 14.2091 21 12V11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BottomNavBar({ activeTab, onSelectTab, role = 'BUYER', theme = lightPalette }) {
  const isSupplier = role === 'SUPPLIER';

  const buyerTabs = [
    { key: 'BUYER_DASHBOARD', label: 'Requirements', Icon: RequirementsIcon },
    { key: 'SUPPLIER_DIRECTORY', label: 'Suppliers', Icon: SuppliersIcon },
    { key: 'SETTINGS', label: 'Settings', Icon: SettingsIcon },
  ];

  const supplierTabs = [
    { key: 'SUPPLIER_PORTAL', label: 'My Bids', Icon: SupplierPortalIcon },
    { key: 'SUPPLIER_DIRECTORY', label: 'Directory', Icon: SuppliersIcon },
    { key: 'SETTINGS', label: 'Settings', Icon: SettingsIcon },
  ];

  const tabs = isSupplier ? supplierTabs : buyerTabs;

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.line,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const { Icon } = tab;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.8}
            >
              {isActive ? (
                // Figma Elevated Floating Circle Badge for Active Tab
                <View style={styles.activeContainer}>
                  <View
                    style={[
                      styles.elevatedBadge,
                      {
                        backgroundColor: theme.brass,
                        shadowColor: theme.brass,
                      },
                    ]}
                  >
                    <Icon color={theme.primaryText} size={21} strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.activeNavLabel, { color: theme.brass }]}>
                    {tab.label}
                  </Text>
                </View>
              ) : (
                // Inactive Tab State
                <View style={styles.inactiveContainer}>
                  <Icon color={theme.inkDim} size={20} strokeWidth={1.8} />
                  <Text style={[styles.navLabel, { color: theme.inkDim }]}>
                    {tab.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  inactiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevatedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  activeNavLabel: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
});
