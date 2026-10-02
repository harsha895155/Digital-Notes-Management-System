import api from './api';
import { Note, Attachment } from '../types';

export interface CreateNotePayload {
  title: string;
  description: string;
  category: string;
  folder?: string;
  deadline?: string | null;
  userEmail: string;
  attachments?: Attachment[];
}

export interface UpdateNotePayload {
  title?: string;
  description?: string;
  category?: string;
  folder?: string;
  deadline?: string | null;
  status?: string;
  attachments?: Attachment[];
}

export const noteService = {
  async getNotes(userEmail: string): Promise<Note[]> {
    const res = await api.get<Note[]>(`/api/notes/${encodeURIComponent(userEmail)}`);
    return res.data;
  },

  async createNote(payload: CreateNotePayload): Promise<Note> {
    const res = await api.post<Note>('/api/notes', payload);
    return res.data;
  },

  async updateNote(id: string, payload: UpdateNotePayload): Promise<Note> {
    const res = await api.put<Note>(`/api/notes/${id}`, payload);
    return res.data;
  },

  async deleteNote(id: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/api/notes/${id}`);
    return res.data;
  },
};
