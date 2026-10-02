import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { MindDeskInput } from '../components/Common/MindDeskInput';
import { MindDeskButton } from '../components/Common/MindDeskButton';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const ChangePasswordScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please provide your account email.');
      return;
    }
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as your current password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.changePassword(email.trim(), currentPassword, newPassword);

      Alert.alert(
        'Password Updated! 🔒',
        'Your password has been changed successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Change Password"
        subtitle="Secure your MindDesk account"
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.cardTitle}>Update Credentials</Text>
            <Text style={styles.cardSubtitle}>
              Ensure your new password has at least 6 characters with a combination of letters & numbers.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email (pre-filled if logged in) */}
            {!user ? (
              <MindDeskInput
                label="Account Email *"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError('');
                }}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : null}

            <MindDeskInput
              label="Current Password *"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(t) => {
                setCurrentPassword(t);
                if (error) setError('');
              }}
              leftIcon="lock-closed-outline"
              isPassword
            />

            <MindDeskInput
              label="New Password *"
              placeholder="Create strong new password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (error) setError('');
              }}
              leftIcon="key-outline"
              isPassword
            />

            <MindDeskInput
              label="Confirm New Password *"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (error) setError('');
              }}
              leftIcon="shield-checkmark-outline"
              isPassword
            />

            <MindDeskButton
              title={loading ? 'Updating Password...' : 'Save New Password'}
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              variant="primary"
              icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textLight} />}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 22,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 10,
  },
});
