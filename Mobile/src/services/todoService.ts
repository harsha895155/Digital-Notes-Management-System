import api from './api';
import { Todo, Attachment } from '../types';

export interface CreateTodoPayload {
  task: string;
  userEmail: string;
  taskDate: string; // YYYY-MM-DD
  attachments?: Attachment[];
}

export const todoService = {
  async getTodos(userEmail: string): Promise<Todo[]> {
    const res = await api.get<Todo[]>(`/api/todos/${encodeURIComponent(userEmail)}`);
    return res.data;
  },

  async createTodo(payload: CreateTodoPayload): Promise<Todo> {
    const res = await api.post<Todo>('/api/todos', payload);
    return res.data;
  },

  async toggleTodo(id: string): Promise<Todo> {
    const res = await api.put<Todo>(`/api/todos/${id}`);
    return res.data;
  },

  async deleteTodo(id: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/api/todos/${id}`);
    return res.data;
  },
};
