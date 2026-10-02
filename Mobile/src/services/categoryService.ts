import api from './api';
import { Category } from '../types';

export const categoryService = {
  async getCategories(userEmail: string): Promise<Category[]> {
    const res = await api.get<Category[]>(`/api/categories/${encodeURIComponent(userEmail)}`);
    return res.data;
  },

  async createCategory(name: string, userEmail: string): Promise<Category> {
    const res = await api.post<Category>('/api/categories', { name, userEmail });
    return res.data;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/api/categories/${id}`);
    return res.data;
  },

  async createFolder(categoryId: string, name: string): Promise<Category> {
    const res = await api.post<Category>(`/api/categories/${categoryId}/folders`, { name });
    return res.data;
  },

  async deleteFolder(categoryId: string, folderId: string): Promise<{ message: string; category: Category }> {
    const res = await api.delete<{ message: string; category: Category }>(
      `/api/categories/${categoryId}/folders/${folderId}`
    );
    return res.data;
  },
};
