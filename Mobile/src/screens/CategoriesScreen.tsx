import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Category, Note } from '../types';
import { categoryService } from '../services/categoryService';
import { noteService } from '../services/noteService';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { EmptyState } from '../components/Common/EmptyState';
import { LoadingSkeleton } from '../components/Common/LoadingSkeleton';
import { CreateCategoryModal } from '../components/Modals/CreateCategoryModal';
import { Ionicons } from '@expo/vector-icons';

export const CategoriesScreen: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentForFolder, setParentForFolder] = useState<Category | null>(null);

  // Expanded categories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!user?.email) return;
    try {
      const [catsRes, notesRes] = await Promise.all([
        categoryService.getCategories(user.email),
        noteService.getNotes(user.email),
      ]);
      setCategories(catsRes);
      setNotes(notesRes);
    } catch (e) {
      console.warn('Failed to load categories:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleExpand = (catId: string) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDeleteCategory = (cat: Category) => {
    const count = notes.filter((n) => n.category === cat.name).length;
    Alert.alert(
      'Delete Category',
      `Deleting "${cat.name}" will also delete its ${count} associated note(s). Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setCategories((prev) => prev.filter((c) => c._id !== cat._id));
              await categoryService.deleteCategory(cat._id);
              fetchData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete category');
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleDeleteFolder = (cat: Category, folderId: string, folderName: string) => {
    Alert.alert(
      'Delete Folder',
      `Delete folder "${folderName}"? Notes in this folder will remain in "${cat.name}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await categoryService.deleteFolder(cat._id, folderId);
              setCategories((prev) =>
                prev.map((c) => (c._id === cat._id ? res.category : c))
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Categories"
        subtitle="Organize notes by folders & topics"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setParentForFolder(null);
              setIsModalOpen(true);
            }}
            accessibilityLabel="New Category"
          >
            <Ionicons name="add" size={20} color={Colors.textLight} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <LoadingSkeleton message="Loading categories..." count={4} />
      ) : (
        <FlatList
          data={categories}
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
          renderItem={({ item }) => {
            const noteCount = notes.filter((n) => n.category === item.name).length;
            const folders = item.folders || [];
            const isExpanded = !!expandedCats[item._id];

            return (
              <View style={[styles.categoryCard, Shadows.small]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(item._id)}
                >
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="folder" size={22} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryMeta}>
                        {noteCount} note{noteCount === 1 ? '' : 's'} • {folders.length} folder{folders.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDeleteCategory(item)}
                      accessibilityLabel="Delete category"
                    >
                      <Ionicons name="trash-outline" size={17} color={Colors.danger} />
                    </TouchableOpacity>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded folders section */}
                {isExpanded && (
                  <View style={styles.foldersSection}>
                    <View style={styles.foldersDivider} />
                    <View style={styles.foldersHeader}>
                      <Text style={styles.foldersTitle}>FOLDERS</Text>
                      <TouchableOpacity
                        style={styles.addFolderBtn}
                        onPress={() => {
                          setParentForFolder(item);
                          setIsModalOpen(true);
                        }}
                      >
                        <Ionicons name="add" size={14} color={Colors.primary} />
                        <Text style={styles.addFolderBtnText}>Add Folder</Text>
                      </TouchableOpacity>
                    </View>

                    {folders.length === 0 ? (
                      <Text style={styles.noFoldersText}>
                        No sub-folders in this category yet.
                      </Text>
                    ) : (
                      <View style={styles.foldersList}>
                        {folders.map((f) => (
                          <View key={f._id} style={styles.folderRow}>
                            <View style={styles.folderRowLeft}>
                              <Ionicons name="folder-outline" size={16} color={Colors.primaryDark} />
                              <Text style={styles.folderName}>{f.name}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleDeleteFolder(item, f._id, f.name)}
                            >
                              <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title="No Categories Yet"
              message="Create categories to organize your notes by projects, study topics, or personal ideas."
              actionTitle="+ Add Category"
              onAction={() => {
                setParentForFolder(null);
                setIsModalOpen(true);
              }}
            />
          }
        />
      )}

      {/* Category / Folder Modal */}
      <CreateCategoryModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setParentForFolder(null);
        }}
        onSuccess={() => fetchData()}
        userEmail={user?.email || ''}
        parentCategory={parentForFolder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  categoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 2,
  },
  categoryMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },
  foldersSection: {
    marginTop: 14,
  },
  foldersDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  foldersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foldersTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  addFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addFolderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  noFoldersText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  foldersList: {
    gap: 6,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  folderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  folderName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
});
