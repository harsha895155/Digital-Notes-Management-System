import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Note, Category } from '../types';
import { noteService } from '../services/noteService';
import { categoryService } from '../services/categoryService';
import { NoteCard } from '../components/Notes/NoteCard';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { EmptyState } from '../components/Common/EmptyState';
import { LoadingSkeleton } from '../components/Common/LoadingSkeleton';
import { CreateNoteModal } from '../components/Modals/CreateNoteModal';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export const NotesScreen: React.FC = () => {
  const { user } = useAuth();
  const rootNav = useNavigation<RootNavProp>();

  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchNotesAndCategories = useCallback(async () => {
    if (!user?.email) return;
    try {
      const [fetchedNotes, fetchedCategories] = await Promise.all([
        noteService.getNotes(user.email),
        categoryService.getCategories(user.email),
      ]);
      setNotes(fetchedNotes);
      setCategories(fetchedCategories);
    } catch (err) {
      console.warn('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchNotesAndCategories();
  }, [fetchNotesAndCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotesAndCategories();
  };

  const handleDelete = (note: Note) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to permanently delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setNotes((prev) => prev.filter((n) => n._id !== note._id));
              await noteService.deleteNote(note._id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete note');
              fetchNotesAndCategories();
            }
          },
        },
      ]
    );
  };

  // Filter notes by search & category
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || n.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, searchQuery, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Notes"
        subtitle={`${notes.length} total organized notes`}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => {
              setEditingNote(null);
              setIsModalOpen(true);
            }}
            accessibilityLabel="Create Note"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={Colors.textLight} />
            <Text style={styles.addHeaderBtnText}>Add Note</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            placeholder="Search notes by title or content..."
            placeholderTextColor={Colors.textMuted + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...categories.map((c) => c.name)]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Notes List (FlatList for 60fps mobile performance) */}
      {loading ? (
        <LoadingSkeleton message="Loading notes..." count={4} />
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => rootNav.navigate('NoteDetail', { note: item })}
              onEdit={() => {
                setEditingNote(item);
                setIsModalOpen(true);
              }}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={searchQuery ? 'No Matching Notes' : 'No Notes Yet'}
              message={
                searchQuery
                  ? 'Try searching with different keywords.'
                  : 'Start capturing your ideas and organizing your knowledge.'
              }
              actionTitle={searchQuery ? undefined : '+ Create First Note'}
              onAction={() => {
                setEditingNote(null);
                setIsModalOpen(true);
              }}
            />
          }
        />
      )}

      {/* Create / Edit Note Modal */}
      <CreateNoteModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSuccess={(savedNote) => {
          setNotes((prev) => {
            const exists = prev.some((n) => n._id === savedNote._id);
            if (exists) {
              return prev.map((n) => (n._id === savedNote._id ? savedNote : n));
            }
            return [savedNote, ...prev];
          });
          fetchNotesAndCategories();
        }}
        categories={categories}
        initialNote={editingNote}
        userEmail={user?.email || ''}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  addHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    marginLeft: 8,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  categoryChipTextActive: {
    color: Colors.textLight,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
});
