export interface User {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  status?: string;
  createdAt?: string;
}

export interface Attachment {
  _id: string;
  originalName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  storageProvider: string;
  resourceType: string;
  userEmail: string;
}

export interface Note {
  _id: string;
  title: string;
  description: string;
  category: string;
  folder?: string;
  deadline?: string | null;
  userEmail: string;
  status?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Folder {
  _id: string;
  name: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  userEmail: string;
  folders: Folder[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Todo {
  _id: string;
  task: string;
  completed: boolean;
  userEmail: string;
  taskDate: string; // YYYY-MM-DD
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileStats {
  totalNotes: number;
  categories: number;
  todayTasks: number;
  completedTasks: number;
  upcomingDeadlines: number;
}

export interface ProfileData {
  user: User;
  stats: ProfileStats;
}
