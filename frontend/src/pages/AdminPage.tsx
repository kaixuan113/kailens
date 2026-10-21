import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Eye,
  ImagePlus,
  Images,
  KeyRound,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminRequest,
  adminUpload,
  api,
  ApiError,
  defaultSettings,
  isPersonalWork,
  photoUrls,
  type PortfolioSettings,
  type Work,
} from "../lib/api";

import { Pagination, PAGE_SIZE } from "../components/Pagination";

type WorkForm = Omit<Work, "id"> & { id?: number };
type Tab = "works" | "settings" | "trash" | "security";
const blankWork = (): WorkForm => ({
  title: "",
  category: "",
  location: "",
  year: String(new Date().getFullYear()),
  image_url: "",
  gallery_urls: [],
  description: "",
  featured: true,
  sort_order: 0,
});
export function AdminPage() {
  const [token, setToken] = useState(
    () => localStorage.getItem("kailens_admin_token") || "",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("works");
  const [works, setWorks] = useState<Work[]>([]);
  const [trash, setTrash] = useState<Work[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>(defaultSettings);
  const [search, setSearch] = useState("");
  const [workPage, setWorkPage] = useState(1);
  const [trashPage, setTrashPage] = useState(1);
  const [form, setForm] = useState<WorkForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Work | null>(null);
  const [credentials, setCredentials] = useState({
    current_password: "",
    new_password: "",
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef(false);
  const dialogClose = useRef<HTMLButtonElement>(null);
  const logout = useCallback(() => {
    localStorage.removeItem("kailens_admin_token");
    setToken("");
    setForm(null);
    setDirty(false);
  }, []);
  const fail = useCallback(
    (reason: unknown) => {
      if (reason instanceof ApiError && reason.status === 401) {
        logout();
        setError("登录已过期，请重新登录");
      } else
        setError(
          reason instanceof Error ? reason.message : "操作失败，请稍后重试",
        );
    },
    [logout],
  );
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [w, t, s] = await Promise.all([
        adminRequest<Work[]>("/api/v1/admin/works", token),
        adminRequest<Work[]>("/api/v1/admin/trash/works", token),
        adminRequest<PortfolioSettings>(
          "/api/v1/admin/portfolio-settings",
          token,
        ),
      ]);
      setWorks(w.filter(isPersonalWork));
      setTrash(t.filter(isPersonalWork));
      setSettings(s);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [token, fail]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty || uploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, uploading]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!confirmDelete) return;
    const previous = document.activeElement as HTMLElement;
    dialogClose.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setConfirmDelete(null);
      if (e.key === "Tab") {
        const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>(
            ".confirm-dialog button",
          ),
        ];
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [confirmDelete, busy]);
  const canLeave = () =>
    !uploading &&
    (!dirty || window.confirm("当前修改尚未保存，确定放弃修改吗？"));
  const navigate = (value: Tab) => {
    if (!canLeave()) return;
    setForm(null);
    setDirty(false);
    setTab(value);
    setError("");
  };
  const edit = (work: WorkForm) => {
    if (!canLeave()) return;
    setForm({ ...work, gallery_urls: photoUrls(work) });
    setDirty(false);
    setError("");
  };
  const update = (value: Partial<WorkForm>) => {
    setForm((current) => (current ? { ...current, ...value } : current));
    setDirty(true);
  };
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.adminLogin(password);
      localStorage.setItem("kailens_admin_token", result.token);
      setToken(result.token);
      setPassword("");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function saveWork(e: FormEvent) {
    e.preventDefault();
    if (!form || pendingUpload.current || busy) return;
    if (!form.image_url) {
      setError("请至少添加一张照片");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminRequest(
        `/api/v1/admin/works${form.id ? `/${form.id}` : ""}`,
        token,
        { method: form.id ? "PUT" : "POST", body: JSON.stringify(form) },
      );
      setDirty(false);
      setForm(null);
      setNotice("作品集已保存，前台立即生效");
      await load();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (!form || pendingUpload.current || !files.length) return;
    if (photoUrls(form).length + files.length > 100) {
      setError("每个作品集最多 100 张照片");
      return;
    }
    if (
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 12 * 1024 * 1024,
      )
    ) {
      setError("请选择 JPG、PNG 或 WebP 图片，每张不超过 12MB");
      return;
    }
    pendingUpload.current = true;
    setUploading(true);
    setError("");
    let completed = 0;
    try {
      for (const file of files) {
        setProgress(
          `正在上传 ${completed + 1} / ${files.length}：${file.name}`,
        );
        const { url } = await adminUpload(file, token);
        setForm((current) =>
          current
            ? {
                ...current,
                image_url: current.image_url || url,
                gallery_urls: [...new Set([...photoUrls(current), url])],
              }
            : current,
        );
        setDirty(true);
        completed++;
      }
      setNotice(`已添加 ${completed} 张照片，保存作品集后生效`);
    } catch (reason) {
      fail(reason);
      setProgress(`已成功添加 ${completed} 张，未完成的照片可重新选择上传`);
    } finally {
      pendingUpload.current = false;
      setUploading(false);
    }
  }
  function movePhoto(index: number, direction: number) {
    if (!form) return;
    const photos = photoUrls(form);
    const next = index + direction;
    if (next < 0 || next >= photos.length) return;
    [photos[index], photos[next]] = [photos[next], photos[index]];
    update({ gallery_urls: photos });
  }
  async function removeWork() {
    if (!confirmDelete || busy) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest(`/api/v1/admin/works/${confirmDelete.id}`, token, {
        method: "DELETE",
      });
      setConfirmDelete(null);
      setNotice("作品已移入回收站，随时可以恢复");
      await load();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: number) {
    setBusy(true);
    setError("");
    try {
      await adminRequest(`/api/v1/admin/trash/works/${id}/restore`, token, {
        method: "POST",
      });
      setNotice("作品已恢复");
      await load();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/v1/admin/portfolio-settings", token, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setDirty(false);
      setNotice("展厅设置已更新");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/v1/admin/password", token, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setCredentials({ current_password: "", new_password: "" });
      setDirty(false);
      setNotice("密码已修改");
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <div className="admin-login">
        <div className="login-story">
          <Link to="/" className="wordmark">
            <span className="brand-symbol">
              k<span>.</span>
            </span>
            <span>
              KAI LENS<small>摄影作品管理</small>
            </span>
          </Link>
          <div>
            <p className="eyebrow">幕后，也是创作的一部分。</p>
            <h1>
              整理影像，
              <br />
              让故事发生。
            </h1>
            <p>每一张照片，都值得一个恰当的位置。</p>
          </div>
          <span>你的私人摄影工作台</span>
        </div>
        <div className="login-panel">
          <form onSubmit={login}>
            <span className="login-icon">
              <KeyRound size={23} />
            </span>
            <p className="eyebrow">欢迎回来</p>
            <h2>打开你的摄影工作台</h2>
            <p>登录后管理作品与线上展厅。</p>
            <label>
              管理员密码
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </label>
            {error && (
              <div className="admin-alert error" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : null}
              登录工作台 <ArrowUpRight size={17} />
            </button>
            <Link to="/" className="back-link">
              <ArrowLeft size={14} /> 返回摄影作品
            </Link>
          </form>
        </div>
      </div>
    );
  const filtered = works.filter((w) =>
    `${w.title} ${w.category} ${w.location}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const photos = form ? photoUrls(form) : [];
  const currentWorkPage = Math.min(
    workPage,
    Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
  );
  const pagedWorks = filtered.slice(
    (currentWorkPage - 1) * PAGE_SIZE,
    currentWorkPage * PAGE_SIZE,
  );
  const currentTrashPage = Math.min(
    trashPage,
    Math.max(1, Math.ceil(trash.length / PAGE_SIZE)),
  );
  const pagedTrash = trash.slice(
    (currentTrashPage - 1) * PAGE_SIZE,
    currentTrashPage * PAGE_SIZE,
  );
  function turnPage(value: number, recycle = false) {
    if (recycle) setTrashPage(value);
    else setWorkPage(value);
    document
      .querySelector(".admin-list-bar, .admin-heading")
      ?.scrollIntoView({ block: "start" });
  }
  const titles = {
    works: "作品管理",
    settings: "展厅设置",
    trash: "回收站",
    security: "账号安全",
  };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="wordmark">
          <span className="brand-symbol">
            k<span>.</span>
          </span>
          <span>
            KAI LENS<small>摄影工作台</small>
          </span>
        </Link>
        <p className="sidebar-label">创作空间</p>
        <nav>
          {(
            [
              { id: "works", label: "作品管理", icon: LayoutGrid },
              { id: "settings", label: "展厅设置", icon: Settings2 },
              { id: "trash", label: "回收站", icon: Trash2 },
              { id: "security", label: "账号安全", icon: KeyRound },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "works" && <span>{works.length}</span>}
              {item.id === "trash" && trash.length > 0 && (
                <span>{trash.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" target="_blank">
            查看线上展厅 <ArrowUpRight size={16} />
          </Link>
          <button
            onClick={() => {
              if (canLeave()) logout();
            }}
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <span>
            摄影工作台 <ChevronRight size={13} /> {titles[tab]}
          </span>
          <span className="admin-status">
            <i />
            私人创作空间
          </span>
        </header>
        <main className="admin-content">
          {notice && (
            <div className="admin-alert success" role="status">
              <CheckCheck size={17} />
              {notice}
              <button onClick={() => setNotice("")} aria-label="关闭提示">
                <X size={15} />
              </button>
            </div>
          )}
          {error && (
            <div className="admin-alert error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="关闭错误">
                <X size={15} />
              </button>
            </div>
          )}
          {tab === "works" && !form && (
            <>
              <div className="admin-heading">
                <div>
                  <p className="eyebrow">你的影像档案</p>
                  <h1>
                    作品管理<span>让好的照片，好好被看见。</span>
                  </h1>
                </div>
                <button
                  className="primary-button"
                  onClick={() => edit(blankWork())}
                >
                  <Plus size={17} />
                  新建作品集
                </button>
              </div>
              <div className="admin-stats">
                <div>
                  <span>
                    <LayoutGrid size={17} />
                    作品集
                  </span>
                  <strong>
                    {String(works.length).padStart(2, "0")}
                    <small>个故事</small>
                  </strong>
                </div>
                <div>
                  <span>
                    <Images size={17} />
                    已收录影像
                  </span>
                  <strong>
                    {String(
                      works.reduce((n, w) => n + photoUrls(w).length, 0),
                    ).padStart(2, "0")}
                    <small>张照片</small>
                  </strong>
                </div>
                <div>
                  <span>
                    <Star size={17} />
                    精选作品集
                  </span>
                  <strong>
                    {String(works.filter((w) => w.featured).length).padStart(
                      2,
                      "0",
                    )}
                    <small>个精选</small>
                  </strong>
                </div>
              </div>
              <div className="admin-list-bar">
                <h2>
                  全部作品 <span>{works.length}</span>
                </h2>
                <label className="search-box">
                  <Search size={16} />
                  <input
                    aria-label="搜索作品"
                    placeholder="搜索名称、分类或地点"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setWorkPage(1);
                    }}
                  />
                </label>
              </div>
              {loading ? (
                <div className="empty-state">正在加载作品…</div>
              ) : (
                <div className="admin-work-grid">
                  {pagedWorks.map((w) => (
                    <article className="admin-work-card" key={w.id}>
                      <button
                        className="admin-card-image"
                        onClick={() => edit(w)}
                        aria-label={`编辑 ${w.title}`}
                      >
                        <img src={w.image_url} alt={w.title} />
                        <span>{photoUrls(w).length} 张照片</span>
                        {Boolean(w.featured) && (
                          <b>
                            <Star size={12} fill="currentColor" />
                            精选
                          </b>
                        )}
                      </button>
                      <div className="admin-card-info">
                        <div>
                          <button onClick={() => edit(w)}>
                            <h3>{w.title}</h3>
                          </button>
                          <p>
                            {w.category} · {w.location} · {w.year}
                          </p>
                        </div>
                        <button
                          className="icon-button delete"
                          onClick={() => setConfirmDelete(w)}
                          aria-label={`删除 ${w.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="admin-card-actions">
                        <button onClick={() => edit(w)}>
                          编辑作品 <ChevronRight size={14} />
                        </button>
                        <Link to={`/works/${w.id}`} target="_blank">
                          <Eye size={14} />
                          预览
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loading && (
                <Pagination
                  page={currentWorkPage}
                  total={filtered.length}
                  onChange={(n) => turnPage(n)}
                />
              )}
              {!loading && !filtered.length && (
                <div className="empty-state">
                  {search ? "没有找到匹配的作品集" : "从新建一个作品集开始。"}
                </div>
              )}
            </>
          )}
          {tab === "works" && form && (
            <>
              <button
                className="back-link"
                onClick={() => {
                  if (canLeave()) {
                    setForm(null);
                    setDirty(false);
                  }
                }}
                disabled={uploading}
              >
                <ArrowLeft size={15} />
                返回作品管理
              </button>
              <form onSubmit={saveWork}>
                <div className="admin-heading">
                  <div>
                    <p className="eyebrow">整理你的故事</p>
                    <h1>
                      {form.id ? "编辑作品集" : "新建作品集"}
                      <span>
                        {dirty ? "有尚未保存的修改" : "添加影像与作品信息"}
                      </span>
                    </h1>
                  </div>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={busy || uploading || !photos.length}
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    保存作品集
                  </button>
                </div>
                <div className="editor-layout">
                  <section className="admin-panel">
                    <div className="panel-heading">
                      <h2>
                        作品照片 <span>{photos.length} / 100</span>
                      </h2>
                      <p>选择封面，调整顺序，让影像自然展开。</p>
                    </div>
                    <div
                      className={`upload-zone ${dragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        void upload([...e.dataTransfer.files]);
                      }}
                    >
                      <input
                        ref={fileInput}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => {
                          void upload([...(e.target.files || [])]);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <LoaderCircle size={27} className="spin" />
                        ) : (
                          <Upload size={27} strokeWidth={1.5} />
                        )}
                        <strong>
                          {uploading ? progress : "拖入照片，或点击上传"}
                        </strong>
                        <span>
                          JPG、PNG、WebP · 单张不超过 12MB · 支持批量添加
                        </span>
                      </button>
                    </div>
                    {!uploading && progress && (
                      <p className="upload-progress">{progress}</p>
                    )}
                    <div className="editor-photos">
                      {photos.map((url, i) => (
                        <div
                          key={url}
                          className={`editor-photo ${form.image_url === url ? "is-cover" : ""}`}
                        >
                          <button
                            type="button"
                            className="photo-select"
                            disabled={uploading}
                            onClick={() => update({ image_url: url })}
                            aria-label={`将第 ${i + 1} 张设为封面`}
                          >
                            <img src={url} alt={`作品照片 ${i + 1}`} />
                            {form.image_url === url && (
                              <span>
                                <Check size={12} />
                                封面
                              </span>
                            )}
                          </button>
                          <div className="photo-tools">
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <button
                              type="button"
                              disabled={i === 0 || uploading}
                              onClick={() => movePhoto(i, -1)}
                              aria-label={`前移第 ${i + 1} 张`}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={i === photos.length - 1 || uploading}
                              onClick={() => movePhoto(i, 1)}
                              aria-label={`后移第 ${i + 1} 张`}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={uploading}
                              onClick={() => {
                                const rest = photos.filter((p) => p !== url);
                                update({
                                  gallery_urls: rest,
                                  image_url:
                                    form.image_url === url
                                      ? rest[0] || ""
                                      : form.image_url,
                                });
                              }}
                              aria-label={`移除第 ${i + 1} 张`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="admin-panel work-fields">
                    <div className="panel-heading">
                      <h2>作品信息</h2>
                      <p>简短的文字，留出更多想象。</p>
                    </div>
                    <label>
                      作品名称
                      <input
                        required
                        maxLength={120}
                        placeholder="给这段故事一个名字"
                        value={form.title}
                        onChange={(e) => update({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      作品分类
                      <input
                        maxLength={40}
                        list="category-options"
                        placeholder="例如：旅行、街头、人像"
                        value={form.category}
                        onChange={(e) => update({ category: e.target.value })}
                      />
                      <datalist id="category-options">
                        {[...new Set(works.map((w) => w.category))].map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </label>
                    <div className="field-row">
                      <label>
                        地点
                        <input
                          maxLength={80}
                          value={form.location}
                          onChange={(e) => update({ location: e.target.value })}
                        />
                      </label>
                      <label>
                        年份
                        <input
                          maxLength={12}
                          value={form.year}
                          onChange={(e) => update({ year: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      作品描述
                      <textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="记下拍摄时的故事…"
                        value={form.description}
                        onChange={(e) =>
                          update({ description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      展示顺序
                      <input
                        type="number"
                        min={-99999}
                        max={99999}
                        value={form.sort_order}
                        onChange={(e) =>
                          update({ sort_order: Number(e.target.value) })
                        }
                      />
                      <small>数字越小，作品越靠前。</small>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={Boolean(form.featured)}
                        onChange={(e) => update({ featured: e.target.checked })}
                      />
                      <span>
                        标记为精选作品<small>可作为首页精选影像。</small>
                      </span>
                    </label>
                  </section>
                </div>
              </form>
            </>
          )}
          {tab === "settings" && (
            <form onSubmit={saveSettings}>
              <div className="admin-heading">
                <div>
                  <p className="eyebrow">为影像留白</p>
                  <h1>
                    展厅设置<span>决定访客看到的第一眼。</span>
                  </h1>
                </div>
                <button disabled={busy} className="primary-button">
                  <Save size={16} />
                  保存设置
                </button>
              </div>
              <div className="settings-layout">
                <section className="admin-panel work-fields">
                  <div className="panel-heading">
                    <h2>品牌与首页</h2>
                    <p>不需要模板图片，首页大图始终来自你的作品。</p>
                  </div>
                  {(
                    [
                      { key: "name", label: "摄影品牌名称", max: 80 },
                      { key: "subtitle", label: "品牌副标题", max: 80 },
                      { key: "title", label: "首页标题", max: 80 },
                      { key: "description", label: "首页介绍", max: 500 },
                      { key: "contact", label: "联系邮箱（可不填）", max: 200 },
                    ] as const
                  ).map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        type={field.key === "contact" ? "email" : "text"}
                        required={field.key !== "contact"}
                        maxLength={field.max}
                        value={settings[field.key]}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            [field.key]: e.target.value,
                          });
                          setDirty(true);
                        }}
                      />
                    </label>
                  ))}
                  <label>
                    首页精选作品
                    <select
                      value={settings.featured_work_id || ""}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          featured_work_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        });
                        setDirty(true);
                      }}
                    >
                      <option value="">自动选择精选作品</option>
                      {works.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
                <aside className="settings-note">
                  <ImagePlus size={26} strokeWidth={1.3} />
                  <h2>你的作品，就是首页。</h2>
                  <p>
                    首页会展示所选作品集的封面。更换作品封面后，首页同步更新，不再需要额外上传装饰图片。
                  </p>
                  <Link to="/" target="_blank" className="text-link">
                    打开线上展厅 <ArrowUpRight size={15} />
                  </Link>
                </aside>
              </div>
            </form>
          )}
          {tab === "trash" && (
            <>
              <div className="admin-heading">
                <div>
                  <p className="eyebrow">给每一张照片留条归路</p>
                  <h1>
                    回收站<span>移除的作品暂存于此，随时可以恢复。</span>
                  </h1>
                </div>
                <span className="muted">{trash.length} 个作品集</span>
              </div>
              <section className="admin-panel">
                {trash.length ? (
                  pagedTrash.map((w) => (
                    <div className="trash-row" key={w.id}>
                      <img src={w.image_url} alt={w.title} />
                      <div>
                        <h3>{w.title}</h3>
                        <p>
                          {photoUrls(w).length} 张照片 · {w.category}
                        </p>
                        <small>
                          移除于 {w.deleted_at?.slice(0, 16).replace("T", " ")}
                        </small>
                      </div>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void restore(w.id)}
                      >
                        <RotateCcw size={15} />
                        恢复作品
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Trash2 size={30} strokeWidth={1} />
                    <p>回收站是空的</p>
                    <small>你移除的作品会保留在这里。</small>
                  </div>
                )}
              </section>
            </>
          )}
          {tab === "trash" && (
            <Pagination
              page={currentTrashPage}
              total={trash.length}
              onChange={(n) => turnPage(n, true)}
            />
          )}
          {tab === "security" && (
            <form onSubmit={changePassword}>
              <div className="admin-heading">
                <div>
                  <p className="eyebrow">私人空间，安心创作</p>
                  <h1>
                    账号安全<span>更新摄影工作台的管理员密码。</span>
                  </h1>
                </div>
              </div>
              <section className="admin-panel work-fields security-form">
                <label>
                  当前密码
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={credentials.current_password}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        current_password: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  新密码
                  <input
                    type="password"
                    required
                    minLength={10}
                    maxLength={200}
                    autoComplete="new-password"
                    value={credentials.new_password}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        new_password: e.target.value,
                      })
                    }
                  />
                  <small>至少 10 个字符。</small>
                </label>
                <button className="primary-button" disabled={busy}>
                  <KeyRound size={16} />
                  更新密码
                </button>
              </section>
            </form>
          )}
        </main>
        <footer className="admin-footer">
          KAI LENS · 摄影作品管理<span>好的故事，值得用心整理。</span>
        </footer>
      </div>
      {confirmDelete && (
        <div className="dialog-overlay">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="dialog-icon">
              <Trash2 size={23} />
            </span>
            <h2 id="delete-title">将「{confirmDelete.title}」移入回收站？</h2>
            <p>作品将从前台隐藏，照片仍会保留，你可以随时恢复。</p>
            <div>
              <button
                ref={dialogClose}
                disabled={busy}
                className="secondary-button"
                onClick={() => setConfirmDelete(null)}
              >
                保留作品
              </button>
              <button
                disabled={busy}
                className="primary-button"
                onClick={() => void removeWork()}
              >
                {busy ? "正在移除…" : "移入回收站"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
