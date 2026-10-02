import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, StatusBar } from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type SplashScreenProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const navigation = useNavigation<SplashScreenProp>();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          navigation.replace('Main', { screen: 'HomeTab' });
        } else {
          navigation.replace('Auth');
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.brandContainer}>
        {/* Book / Notebook Logo Icon */}
        <View style={styles.logoBadge}>
          <Ionicons name="book" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>MindDesk</Text>
        <Text style={styles.subtitle}>DIGITAL NOTES SYSTEM</Text>

        <View style={styles.taglineBox}>
          <Text style={styles.tagline}>Organize • Manage • Plan • Achieve</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Secure Cloud Workspace</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2.2,
    marginTop: 6,
  },
  taglineBox: {
    marginTop: 20,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
});
