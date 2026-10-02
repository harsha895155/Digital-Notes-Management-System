import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Todo } from '../types';
import { todoService } from '../services/todoService';
import { TaskItem } from '../components/Tasks/TaskItem';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { EmptyState } from '../components/Common/EmptyState';
import { LoadingSkeleton } from '../components/Common/LoadingSkeleton';
import { AddTaskModal } from '../components/Modals/AddTaskModal';
import { Ionicons } from '@expo/vector-icons';
import { formatTodayISO } from '../utils/formatters';

export const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [quickInput, setQuickInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!user?.email) return;
    try {
      const data = await todoService.getTodos(user.email);
      setTodos(data);
    } catch (e) {
      console.warn('Failed to fetch todos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodos();
  };

  const handleQuickAdd = async () => {
    if (!quickInput.trim() || !user?.email) return;
    const taskText = quickInput.trim();
    setQuickInput('');

    try {
      const created = await todoService.createTodo({
        task: taskText,
        userEmail: user.email,
        taskDate: formatTodayISO(),
      });
      setTodos((prev) => [created, ...prev]);
    } catch (e) {
      console.warn(e);
      fetchTodos();
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setTodos((prev) =>
        prev.map((t) => (t._id === id ? { ...t, completed: !t.completed } : t))
      );
      await todoService.toggleTodo(id);
    } catch (e) {
      fetchTodos();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setTodos((prev) => prev.filter((t) => t._id !== id));
      await todoService.deleteTodo(id);
    } catch (e) {
      fetchTodos();
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;

  const filteredTodos = useMemo(() => {
    if (filter === 'pending') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Today's Tasks"
        subtitle={`${completedCount} of ${todos.length} completed`}
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsModalOpen(true)}
            accessibilityLabel="Add Task"
          >
            <Ionicons name="add" size={20} color={Colors.textLight} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {/* Quick Add Bar */}
      <View style={styles.quickAddContainer}>
        <View style={styles.quickAddBar}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <TextInput
            placeholder="Quick add task..."
            placeholderTextColor={Colors.textMuted + '80'}
            value={quickInput}
            onChangeText={setQuickInput}
            onSubmitEditing={handleQuickAdd}
            style={styles.quickAddInput}
            returnKeyType="done"
          />
          {quickInput ? (
            <TouchableOpacity onPress={handleQuickAdd} style={styles.quickAddSubmit}>
              <Ionicons name="arrow-up-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({todos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
            Pending ({todos.length - completedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>
            Done ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {loading ? (
        <LoadingSkeleton message="Loading tasks..." count={4} />
      ) : (
        <FlatList
          data={filteredTodos}
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
            <TaskItem
              todo={item}
              onToggle={() => handleToggle(item._id)}
              onDelete={() => handleDelete(item._id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="checkbox-outline"
              title={filter === 'completed' ? 'No Completed Tasks' : 'All Clear! 🎉'}
              message={
                filter === 'completed'
                  ? 'Complete tasks by clicking the checkbox.'
                  : "You have no tasks pending for today. Add one above!"
              }
              actionTitle="+ Add Task"
              onAction={() => setIsModalOpen(true)}
            />
          }
        />
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newTask) => setTodos((prev) => [newTask, ...prev])}
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
  quickAddContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    marginLeft: 8,
  },
  quickAddSubmit: {
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  filterTabTextActive: {
    color: Colors.textLight,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
});
