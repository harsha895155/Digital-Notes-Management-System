export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const formatShortDate = (dateString?: string | null): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

export const formatTodayISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getGreeting = (name?: string): string => {
  const hour = new Date().getHours();
  let timeGreeting = 'Good Morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good Afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good Evening';
  }
  return name ? `${timeGreeting}, ${name}` : timeGreeting;
};

export const isDeadlineSoon = (deadline?: string | null): boolean => {
  if (!deadline) return false;
  try {
    const d = new Date(deadline).getTime();
    const now = Date.now();
    const diffDays = (d - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  } catch {
    return false;
  }
};

export const isOverdue = (deadline?: string | null): boolean => {
  if (!deadline) return false;
  try {
    const d = new Date(deadline).getTime();
    const now = Date.now();
    return d < now;
  } catch {
    return false;
  }
};
