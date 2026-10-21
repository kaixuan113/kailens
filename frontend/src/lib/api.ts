export type Work = {
  id: number;
  title: string;
  category: string;
  location: string;
  year: string;
  image_url: string;
  gallery_urls: string[];
  description: string;
  featured: boolean;
  sort_order: number;
  deleted_at?: string | null;
};
export type WorkPageResult = {
  items: Work[];
  total: number;
  total_all: number;
  page: number;
  page_size: number;
  total_pages: number;
  categories: { category: string; count: number }[];
  featured: Work | null;
};
export type PortfolioSettings = {
  name: string;
  subtitle: string;
  title: string;
  description: string;
  contact: string;
  featured_work_id: number | null;
};
export const defaultSettings: PortfolioSettings = {
  name: "KAI LENS",
  subtitle: "个人摄影作品集",
  title: "目之所及，皆为故事。",
  description: "走过的地方，遇见的人，和不想遗忘的日常。",
  contact: "",
  featured_work_id: null,
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : response.status === 422
          ? "请检查输入内容是否完整、长度是否超出限制"
          : "请求失败，请稍后重试";
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}
export const api = {
  settings: () => request<PortfolioSettings>("/api/v1/portfolio-settings"),
  workPage: (page: number, category: string) => {
    const query = new URLSearchParams({ page: String(page), page_size: "12" });
    if (category !== "全部") query.set("category", category);
    return request<WorkPageResult>(`/api/v1/works/page?${query}`);
  },
  works: () => request<Work[]>("/api/v1/works"),
  work: (id: number) => request<Work>(`/api/v1/works/${id}`),
  adminLogin: (password: string) =>
    request<{ token: string }>("/api/v1/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};
export function adminRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  return request<T>(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
}
export async function adminUpload(
  file: File,
  token: string,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/v1/admin/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail || "图片上传失败", response.status);
  }
  return response.json();
}
export function photoUrls(work: Pick<Work, "image_url" | "gallery_urls">) {
  return [...new Set([...work.gallery_urls, work.image_url].filter(Boolean))];
}
// Legacy template images never enter the new public portfolio.
export function isPersonalWork(work: Work) {
  return !work.image_url.startsWith("/images/");
}
