import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Note, Todo, Category, ProfileStats } from '../types';
import { noteService } from '../services/noteService';
import { todoService } from '../services/todoService';
import { categoryService } from '../services/categoryService';
import { profileService } from '../services/profileService';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { TaskItem } from '../components/Tasks/TaskItem';
import { EmptyState } from '../components/Common/EmptyState';
import { LoadingSkeleton } from '../components/Common/LoadingSkeleton';
import { CreateNoteModal } from '../components/Modals/CreateNoteModal';
import { AddTaskModal } from '../components/Modals/AddTaskModal';
import { Ionicons } from '@expo/vector-icons';
import { getGreeting, formatShortDate } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type TabNav = BottomTabNavigationProp<MainTabParamList>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const tabNav = useNavigation<TabNav>();
  const rootNav = useNavigation<RootNav>();

  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    totalNotes: 0,
    categories: 0,
    todayTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.email) return;

    try {
      const [notesRes, todosRes, categoriesRes, profileRes] = await Promise.allSettled([
        noteService.getNotes(user.email),
        todoService.getTodos(user.email),
        categoryService.getCategories(user.email),
        profileService.getProfile(),
      ]);

      if (notesRes.status === 'fulfilled') setNotes(notesRes.value);
      if (todosRes.status === 'fulfilled') setTodos(todosRes.value);
      if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value);
      if (profileRes.status === 'fulfilled') setStats(profileRes.value.stats);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Toggle todo task
  const handleToggleTodo = async (todoId: string) => {
    try {
      setTodos((prev) =>
        prev.map((t) => (t._id === todoId ? { ...t, completed: !t.completed } : t))
      );
      await todoService.toggleTodo(todoId);
    } catch (e) {
      loadData();
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      setTodos((prev) => prev.filter((t) => t._id !== todoId));
      await todoService.deleteTodo(todoId);
    } catch (e) {
      loadData();
    }
  };

  // Filter upcoming deadlines (next 7 days)
  const upcomingDeadlinesList = notes
    .filter((n) => {
      if (!n.deadline) return false;
      const d = new Date(n.deadline).getTime();
      const now = Date.now();
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
      return d >= now && d <= sevenDays;
    })
    .slice(0, 4);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title={getGreeting(user?.fullName?.split(' ')[0])}
        subtitle="Stay organized & productive today."
        userAvatar={user?.profileImage}
        onAvatarPress={() => tabNav.navigate('ProfileTab')}
      />

      {loading ? (
        <LoadingSkeleton message="Loading your dashboard..." count={3} />
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
          {/* Real Statistics Grid */}
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, Shadows.small]}
              activeOpacity={0.8}
              onPress={() => tabNav.navigate('NotesTab')}
            >
              <View style={[styles.statIconBadge, { backgroundColor: '#FBEEDC' }]}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statCount}>{notes.length}</Text>
              <Text style={styles.statLabel}>Total Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, Shadows.small]}
              activeOpacity={0.8}
              onPress={() => rootNav.navigate('Categories')}
            >
              <View style={[styles.statIconBadge, { backgroundColor: '#F0EAF5' }]}>
                <Ionicons name="folder-open" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.statCount}>{categories.length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, Shadows.small]}
              activeOpacity={0.8}
              onPress={() => tabNav.navigate('TasksTab')}
            >
              <View style={[styles.statIconBadge, { backgroundColor: '#EBF4EF' }]}>
                <Ionicons name="checkbox" size={20} color={Colors.success} />
              </View>
              <Text style={styles.statCount}>
                {todos.filter((t) => t.completed).length}/{todos.length}
              </Text>
              <Text style={styles.statLabel}>Today's Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, Shadows.small]}
              activeOpacity={0.8}
              onPress={() => tabNav.navigate('CalendarTab')}
            >
              <View style={[styles.statIconBadge, { backgroundColor: '#FBEBE8' }]}>
                <Ionicons name="alarm" size={20} color={Colors.danger} />
              </View>
              <Text style={styles.statCount}>{stats.upcomingDeadlines || upcomingDeadlinesList.length}</Text>
              <Text style={styles.statLabel}>Deadlines</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions Bar */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => setIsNoteModalOpen(true)}
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.quickActionText}>+ New Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => setIsTaskModalOpen(true)}
            >
              <Ionicons name="checkbox-outline" size={18} color={Colors.success} />
              <Text style={styles.quickActionText}>+ New Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => rootNav.navigate('Categories')}
            >
              <Ionicons name="pricetag-outline" size={18} color={Colors.accent} />
              <Text style={styles.quickActionText}>Categories</Text>
            </TouchableOpacity>
          </View>

          {/* Today's Tasks Card */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="today-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Today's Tasks</Text>
            </View>
            <TouchableOpacity onPress={() => tabNav.navigate('TasksTab')}>
              <Text style={styles.seeAllText}>View All ({todos.length})</Text>
            </TouchableOpacity>
          </View>

          {todos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No tasks for today 🎉</Text>
              <Text style={styles.emptySubtitle}>You're all caught up! Add a new task anytime.</Text>
              <TouchableOpacity
                style={styles.addInlineBtn}
                onPress={() => setIsTaskModalOpen(true)}
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addInlineText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.taskList}>
              {todos.slice(0, 5).map((todo) => (
                <TaskItem
                  key={todo._id}
                  todo={todo}
                  onToggle={() => handleToggleTodo(todo._id)}
                  onDelete={() => handleDeleteTodo(todo._id)}
                />
              ))}
            </View>
          )}

          {/* Upcoming Deadlines Card */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={20} color={Colors.danger} />
              <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            </View>
            <TouchableOpacity onPress={() => tabNav.navigate('CalendarTab')}>
              <Text style={styles.seeAllText}>Calendar View</Text>
            </TouchableOpacity>
          </View>

          {upcomingDeadlinesList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No upcoming deadlines</Text>
              <Text style={styles.emptySubtitle}>You have no pending deadlines scheduled for this week.</Text>
            </View>
          ) : (
            <View style={styles.deadlinesList}>
              {upcomingDeadlinesList.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.deadlineRow, Shadows.small]}
                  onPress={() => rootNav.navigate('NoteDetail', { note: item })}
                >
                  <View style={styles.deadlineInfo}>
                    <Text style={styles.deadlineNoteTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.deadlineCategory}>{item.category}</Text>
                  </View>
                  <View style={styles.deadlineDateBadge}>
                    <Ionicons name="time" size={12} color={Colors.danger} />
                    <Text style={styles.deadlineDateText}>
                      {formatShortDate(item.deadline)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Note Creation Modal */}
      <CreateNoteModal
        visible={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSuccess={(newNote) => {
          setNotes((prev) => [newNote, ...prev]);
          loadData();
        }}
        categories={categories}
        userEmail={user?.email || ''}
      />

      {/* Task Creation Modal */}
      <AddTaskModal
        visible={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={(newTask) => {
          setTodos((prev) => [newTask, ...prev]);
          loadData();
        }}
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  taskList: {
    marginBottom: 8,
  },
  deadlinesList: {
    gap: 8,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
  },
  deadlineInfo: {
    flex: 1,
    marginRight: 10,
  },
  deadlineNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 2,
  },
  deadlineCategory: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  deadlineDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deadlineDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
});
