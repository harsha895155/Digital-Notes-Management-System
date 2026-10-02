import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Note, Todo } from '../types';
import { noteService } from '../services/noteService';
import { todoService } from '../services/todoService';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { TaskItem } from '../components/Tasks/TaskItem';
import { Ionicons } from '@expo/vector-icons';
import { formatShortDate } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export const CalendarScreen: React.FC = () => {
  const { user } = useAuth();
  const rootNav = useNavigation<RootNavProp>();

  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user?.email) {
      Promise.all([
        noteService.getNotes(user.email),
        todoService.getTodos(user.email),
      ]).then(([notesRes, todosRes]) => {
        setNotes(notesRes);
        setTodos(todosRes);
      }).catch(console.warn);
    }
  }, [user?.email]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  // Find if a day has deadlines or tasks
  const hasEvent = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasDeadline = notes.some(
      (n) => n.deadline && n.deadline.split('T')[0] === dateStr
    );
    const hasTodo = todos.some((t) => t.taskDate === dateStr);
    return { hasDeadline, hasTodo };
  };

  // Selected date ISO string (YYYY-MM-DD)
  const selectedDateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Items for selected date
  const selectedDeadlines = useMemo(() => {
    return notes.filter((n) => n.deadline && n.deadline.split('T')[0] === selectedDateStr);
  }, [notes, selectedDateStr]);

  const selectedTodos = useMemo(() => {
    return todos.filter((t) => t.taskDate === selectedDateStr);
  }, [todos, selectedDateStr]);

  const handleToggleTodo = async (id: string) => {
    try {
      setTodos((prev) =>
        prev.map((t) => (t._id === id ? { ...t, completed: !t.completed } : t))
      );
      await todoService.toggleTodo(id);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      setTodos((prev) => prev.filter((t) => t._id !== id));
      await todoService.deleteTodo(id);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Calendar"
        subtitle="Manage deadlines & schedule tasks"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation Card */}
        <View style={[styles.calendarCard, Shadows.small]}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.navArrow} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color={Colors.dark} />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {monthNames[month]} {year}
            </Text>

            <TouchableOpacity style={styles.navArrow} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.weekDaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.dayCell} />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const { hasDeadline, hasTodo } = hasEvent(day);
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    today && styles.dayToday,
                    selected && styles.daySelected,
                  ]}
                  onPress={() => setSelectedDate(new Date(year, month, day))}
                >
                  <Text
                    style={[
                      styles.dayText,
                      today && styles.dayTextToday,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>

                  {/* Indicator dots */}
                  <View style={styles.dotsRow}>
                    {hasDeadline ? <View style={styles.deadlineDot} /> : null}
                    {hasTodo ? <View style={styles.todoDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Summary Header */}
        <View style={styles.dateSummaryHeader}>
          <View>
            <Text style={styles.selectedDateTitle}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.selectedDateSubtitle}>
              {selectedDeadlines.length} deadline(s) • {selectedTodos.length} task(s)
            </Text>
          </View>
        </View>

        {/* Deadlines for selected date */}
        {selectedDeadlines.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Deadlines</Text>
            {selectedDeadlines.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.eventCard, Shadows.small]}
                onPress={() => rootNav.navigate('NoteDetail', { note: item })}
              >
                <View style={styles.eventLeft}>
                  <View style={styles.deadlineIndicator} />
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventCategory}>{item.category}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Tasks for selected date */}
        {selectedTodos.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Tasks</Text>
            {selectedTodos.map((todo) => (
              <TaskItem
                key={todo._id}
                todo={todo}
                onToggle={() => handleToggleTodo(todo._id)}
                onDelete={() => handleDeleteTodo(todo._id)}
              />
            ))}
          </View>
        ) : null}

        {selectedDeadlines.length === 0 && selectedTodos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sunny-outline" size={36} color={Colors.accent} />
            <Text style={styles.emptyTitle}>Nothing scheduled for this day</Text>
            <Text style={styles.emptySubtitle}>Enjoy your free time or add new notes & tasks.</Text>
          </View>
        ) : null}
      </ScrollView>
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
  calendarCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  dayToday: {
    backgroundColor: Colors.secondary,
  },
  daySelected: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  dayTextToday: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: Colors.textLight,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 5,
  },
  deadlineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.danger,
  },
  todoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.success,
  },
  dateSummaryHeader: {
    marginBottom: 14,
  },
  selectedDateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.dark,
  },
  selectedDateSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginBottom: 8,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deadlineIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: Colors.danger,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  eventCategory: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
