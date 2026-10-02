import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../../theme/colors';

interface LoadingSkeletonProps {
  message?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  message = 'Loading...',
  count = 3,
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.cardsContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={styles.cardSkeleton}>
            <View style={styles.titleLine} />
            <View style={styles.bodyLine} />
            <View style={[styles.bodyLine, { width: '60%' }]} />
            <View style={styles.badgeLine} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
    fontWeight: '500',
  },
  cardsContainer: {
    width: '100%',
  },
  cardSkeleton: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  titleLine: {
    height: 18,
    width: '45%',
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    marginBottom: 12,
  },
  bodyLine: {
    height: 12,
    width: '90%',
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeLine: {
    height: 22,
    width: '28%',
    backgroundColor: Colors.secondary,
    borderRadius: 11,
    marginTop: 6,
  },
});
