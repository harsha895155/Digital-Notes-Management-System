import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { ProfileData, User } from '../types';
import { profileService } from '../services/profileService';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { MindDeskButton } from '../components/Common/MindDeskButton';
import { EditProfileModal } from '../components/Modals/EditProfileModal';
import { LoadingSkeleton } from '../components/Common/LoadingSkeleton';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/formatters';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const { user, logout, updateUserContext } = useAuth();
  const navigation = useNavigation<RootNavProp>();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      setProfileData(data);
      updateUserContext(data.user);
    } catch (e: any) {
      console.warn('Profile fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUserContext]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selected = result.assets[0];
        setUploadingAvatar(true);
        const res = await profileService.uploadAvatar(selected.uri, selected.mimeType || 'image/jpeg');
        updateUserContext({ profileImage: res.profileImage });
        setProfileData((prev) => (prev ? { ...prev, user: res.user } : null));
        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not update profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingAvatar(true);
              const res = await profileService.removeAvatar();
              updateUserContext({ profileImage: '' });
              setProfileData((prev) => (prev ? { ...prev, user: res.user } : null));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove profile photo.');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of MindDesk?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const currentUser = profileData?.user || user;
  const stats = profileData?.stats;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Profile"
        subtitle="Manage your personal info & security"
      />

      {loading ? (
        <LoadingSkeleton message="Loading profile..." count={3} />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Avatar and Identity Card */}
          <View style={[styles.profileCard, Shadows.small]}>
            <View style={styles.avatarWrapper}>
              {currentUser?.profileImage ? (
                <Image source={{ uri: currentUser.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={44} color={Colors.primary} />
                </View>
              )}

              {uploadingAvatar ? (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={Colors.card} />
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handlePickAvatar}
                accessibilityLabel="Change profile picture"
              >
                <Ionicons name="camera" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{currentUser?.fullName}</Text>
            <Text style={styles.userEmail}>{currentUser?.email}</Text>

            {currentUser?.username ? (
              <View style={styles.usernamePill}>
                <Text style={styles.usernameText}>@{currentUser.username}</Text>
              </View>
            ) : null}

            {currentUser?.bio ? (
              <Text style={styles.bioText}>{currentUser.bio}</Text>
            ) : null}

            {currentUser?.profileImage ? (
              <TouchableOpacity onPress={handleRemoveAvatar} style={styles.removePhotoBtn}>
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Activity Statistics */}
          {stats ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Your Activity</Text>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, Shadows.small]}>
                  <Text style={styles.statVal}>{stats.totalNotes}</Text>
                  <Text style={styles.statName}>Notes</Text>
                </View>
                <View style={[styles.statBox, Shadows.small]}>
                  <Text style={styles.statVal}>{stats.categories}</Text>
                  <Text style={styles.statName}>Categories</Text>
                </View>
                <View style={[styles.statBox, Shadows.small]}>
                  <Text style={styles.statVal}>{stats.completedTasks}/{stats.todayTasks}</Text>
                  <Text style={styles.statName}>Tasks Done</Text>
                </View>
                <View style={[styles.statBox, Shadows.small]}>
                  <Text style={styles.statVal}>{stats.upcomingDeadlines}</Text>
                  <Text style={styles.statName}>Deadlines</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Personal Information Card */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Personal Information</Text>
            <View style={[styles.infoCard, Shadows.small]}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{currentUser?.fullName || 'Not set'}</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{currentUser?.email || 'Not set'}</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{currentUser?.phone || 'Not added yet'}</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Account Status</Text>
                  <Text style={[styles.infoValue, { color: Colors.success, textTransform: 'capitalize' }]}>
                    {currentUser?.status || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>{formatDate(currentUser?.createdAt)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions & Security */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Account & Security</Text>

            <TouchableOpacity
              style={[styles.menuItem, Shadows.small]}
              onPress={() => setIsEditModalOpen(true)}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#FBEEDC' }]}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.menuTitle}>Edit Profile Information</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, Shadows.small]}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#EBF4EF' }]}>
                  <Ionicons name="key-outline" size={18} color={Colors.success} />
                </View>
                <Text style={styles.menuTitle}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, Shadows.small, { marginTop: 10 }]}
              onPress={handleLogout}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconCircle, { backgroundColor: Colors.dangerLight }]}>
                  <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
                </View>
                <Text style={[styles.menuTitle, { color: Colors.danger }]}>Sign Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={currentUser || null}
        onSuccess={(updatedUser: User) => {
          updateUserContext(updatedUser);
          setProfileData((prev) => (prev ? { ...prev, user: updatedUser } : null));
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.border,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 22, 15, 0.5)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  usernamePill: {
    marginTop: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  usernameText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  bioText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  removePhotoBtn: {
    marginTop: 10,
    padding: 4,
  },
  removePhotoText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 12,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  statName: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '600',
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
});
