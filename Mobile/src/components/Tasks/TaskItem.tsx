import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Todo } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface TaskItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  todo,
  onToggle,
  onDelete,
}) => {
  return (
    <View style={[styles.container, todo.completed && styles.containerCompleted]}>
      <TouchableOpacity
        style={styles.checkboxTouch}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        accessibilityLabel={todo.task}
      >
        <View style={[styles.checkbox, todo.completed && styles.checkboxChecked]}>
          {todo.completed && <Ionicons name="checkmark" size={16} color={Colors.card} />}
        </View>

        <Text
          style={[styles.taskText, todo.completed && styles.taskTextCompleted]}
          numberOfLines={2}
        >
          {todo.task}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete task"
      >
        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  containerCompleted: {
    backgroundColor: '#FAF5EE',
    opacity: 0.85,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  taskText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark,
    flex: 1,
    lineHeight: 20,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
  },
});
