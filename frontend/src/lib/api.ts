export type Work = {
  id: number;
  title: string;
  category: string;
  location: string;
  year: string;
  image_url: string;
  description: string;
  featured: boolean;
  sort_order: number;
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  tags: string[];
  status: 'draft' | 'published';
  published_at: string;
};

export type Skill = {
  id: number;
  name: string;
  description: string;
  instructions?: string;
  enabled: boolean;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(payload.detail ?? '请求失败');
  }
  return response.json() as Promise<T>;
}

export const api = {
  works: () => request<Work[]>('/api/v1/works'),
  posts: () => request<Post[]>('/api/v1/posts'),
  post: (slug: string) => request<Post>(`/api/v1/posts/${slug}`),
  skills: () => request<Skill[]>('/api/v1/skills'),
  chat: (message: string, skillId?: number) =>
    request<{ answer: string; mode: string }>('/api/v1/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, skill_id: skillId }),
    }),
  adminLogin: (password: string) =>
    request<{ token: string }>('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

export async function adminRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

export async function adminUpload(file: File, token: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/v1/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(payload.detail ?? '上传失败');
  }
  return response.json() as Promise<{ url: string }>;
}
