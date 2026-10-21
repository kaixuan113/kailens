import { Aperture, ArrowLeft, FileText, Image, KeyRound, LoaderCircle, LogOut, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest, adminUpload, adminUploadMany, api, type Post, type Skill, type Work } from '../lib/api';

type Tab = 'works' | 'posts' | 'skills';

const emptyWork: Omit<Work, 'id'> = {
  title: '', category: '街头', location: '北京', year: String(new Date().getFullYear()), image_url: '', gallery_urls: [], description: '', featured: false, sort_order: 0,
};
const emptyPost: Omit<Post, 'id'> = {
  title: '', slug: '', excerpt: '', content: '', cover_url: '', tags: [], status: 'draft', published_at: new Date().toISOString(),
};
const emptySkill: Omit<Skill, 'id'> = {
  name: '', description: '', instructions: '', enabled: true,
};

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('kailens_admin_token') ?? '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('works');
  const [works, setWorks] = useState<Work[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [notice, setNotice] = useState('');
  const [workForm, setWorkForm] = useState<Omit<Work, 'id'> & { id?: number }>(emptyWork);
  const [postForm, setPostForm] = useState<Omit<Post, 'id'> & { id?: number }>(emptyPost);
  const [skillForm, setSkillForm] = useState<Omit<Skill, 'id'> & { id?: number }>(emptySkill);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [nextWorks, nextPosts, nextSkills] = await Promise.all([
        adminRequest<Work[]>('/api/v1/admin/works', token),
        adminRequest<Post[]>('/api/v1/admin/posts', token),
        adminRequest<Skill[]>('/api/v1/admin/skills', token),
      ]);
      setWorks(nextWorks); setPosts(nextPosts); setSkills(nextSkills);
    } catch {
      localStorage.removeItem('kailens_admin_token');
      setToken('');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function login(event: FormEvent) {
    event.preventDefault(); setLoginError('');
    try {
      const result = await api.adminLogin(password);
      localStorage.setItem('kailens_admin_token', result.token);
      setToken(result.token); setPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败');
    }
  }

  async function saveWork(event: FormEvent) {
    event.preventDefault();
    const path = workForm.id ? `/api/v1/admin/works/${workForm.id}` : '/api/v1/admin/works';
    const method = workForm.id ? 'PUT' : 'POST';
    await adminRequest(path, token, { method, body: JSON.stringify(workForm) });
    setWorkForm(emptyWork); setNotice('作品已保存'); await load();
  }

  async function savePost(event: FormEvent) {
    event.preventDefault();
    const path = postForm.id ? `/api/v1/admin/posts/${postForm.id}` : '/api/v1/admin/posts';
    const method = postForm.id ? 'PUT' : 'POST';
    await adminRequest(path, token, { method, body: JSON.stringify(postForm) });
    setPostForm(emptyPost); setNotice('文章已保存'); await load();
  }

  async function saveSkill(event: FormEvent) {
    event.preventDefault();
    const path = skillForm.id ? `/api/v1/admin/skills/${skillForm.id}` : '/api/v1/admin/skills';
    const method = skillForm.id ? 'PUT' : 'POST';
    await adminRequest(path, token, { method, body: JSON.stringify(skillForm) });
    setSkillForm(emptySkill); setNotice('Skill 已保存'); await load();
  }

  async function remove(kind: Tab, id: number) {
    if (!window.confirm('确定删除？此操作不可撤销。')) return;
    await adminRequest(`/api/v1/admin/${kind}/${id}`, token, { method: 'DELETE' });
    setNotice('已删除'); await load();
  }

  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-5 text-paper">
        <div className="w-full max-w-md rounded-3xl border border-paper/15 bg-paper/5 p-8 shadow-2xl backdrop-blur">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 text-sm text-paper/50 hover:text-paper"><ArrowLeft size={16} /> 返回网站</Link>
          <Aperture size={36} className="text-rust" />
          <h1 className="mt-6 font-serif text-4xl">管理员登录</h1>
          <p className="mt-3 text-sm leading-6 text-paper/50">登录后可以管理摄影作品、博客文章和 Agent Skills。</p>
          <form onSubmit={login} className="mt-8 space-y-4">
            <label className="block text-sm text-paper/65">密码</label>
            <div className="flex items-center gap-3 rounded-xl border border-paper/20 px-4 focus-within:border-paper/60"><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-4 outline-none" autoFocus /></div>
            {loginError && <p className="text-sm text-red-300">{loginError}</p>}
            <button className="w-full rounded-xl bg-paper py-4 font-medium text-ink transition hover:bg-rust hover:text-white">登录后台</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Image }> = [
    { id: 'works', label: '摄影作品', icon: Image },
    { id: 'posts', label: '博客文章', icon: FileText },
    { id: 'skills', label: 'Agent Skills', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#ece8df] text-ink">
      <header className="border-b border-ink/10 bg-paper px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-3"><Aperture size={22} /><span className="font-semibold tracking-widest">KAI LENS / ADMIN</span></div>
          <div className="flex items-center gap-5 text-sm"><Link to="/" className="text-ink/55 hover:text-rust">查看网站</Link><button onClick={() => { localStorage.removeItem('kailens_admin_token'); setToken(''); }} className="flex items-center gap-2 text-ink/55 hover:text-rust"><LogOut size={16} /> 退出</button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-screen-2xl gap-6 p-5 md:grid-cols-12 md:p-8">
        <aside className="rounded-2xl bg-ink p-4 text-paper md:col-span-3 lg:col-span-2">
          <nav className="space-y-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${tab === item.id ? 'bg-paper text-ink' : 'text-paper/60 hover:bg-paper/10'}`}><item.icon size={17} />{item.label}</button>)}</nav>
        </aside>
        <main className="space-y-6 md:col-span-9 lg:col-span-10">
          {notice && <button onClick={() => setNotice('')} className="w-full rounded-xl bg-olive px-4 py-3 text-left text-sm text-white">{notice} · 点击关闭</button>}
          {tab === 'works' && <WorkManager token={token} items={works} form={workForm} setForm={setWorkForm} save={saveWork} remove={(id) => remove('works', id)} />}
          {tab === 'posts' && <PostManager token={token} items={posts} form={postForm} setForm={setPostForm} save={savePost} remove={(id) => remove('posts', id)} />}
          {tab === 'skills' && <SkillManager items={skills} form={skillForm} setForm={setSkillForm} save={saveSkill} remove={(id) => remove('skills', id)} />}
        </main>
      </div>
    </div>
  );
}

const fieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-rust';
const labelClass = 'space-y-2 text-sm text-ink/60';

function WorkManager({ token, items, form, setForm, save, remove }: { token: string; items: Work[]; form: Omit<Work, 'id'> & { id?: number }; setForm: (value: typeof form) => void; save: (event: FormEvent) => void; remove: (id: number) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function uploadCover(file: File) {
    setUploading(true); setUploadError('');
    try {
      const result = await adminUpload(file, token);
      setForm({ ...form, image_url: result.url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '封面上传失败');
    } finally {
      setUploading(false);
    }
  }

  async function uploadGallery(files: File[]) {
    if (!files.length) return;
    setUploading(true); setUploadError('');
    try {
      const urls = await adminUploadMany(files, token);
      setForm({
        ...form,
        image_url: form.image_url || urls[0] || '',
        gallery_urls: [...form.gallery_urls, ...urls],
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '作品照片上传失败');
    } finally {
      setUploading(false);
    }
  }

  return <ManagerShell title="摄影作品" count={items.length} onNew={() => setForm(emptyWork)}>
    <form onSubmit={save} className="grid gap-4 rounded-2xl bg-paper p-5 lg:grid-cols-2">
      <label className={labelClass}>作品标题<input required className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label className={labelClass}>分类<input className={fieldClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
      <label className={labelClass}>地点<input className={fieldClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
      <label className={labelClass}>年份<input className={fieldClass} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
      <label className={`${labelClass} lg:col-span-2`}>作品集封面地址<input required className={fieldClass} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="首页卡片使用的封面图" /></label>
      <label className={labelClass}>上传作品集封面（单张，最大 12MB）<input type="file" accept="image/jpeg,image/png,image/webp" className={fieldClass} disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadCover(file); }} /></label>
      <label className={labelClass}>批量上传作品照片（可一次多选）<input type="file" multiple accept="image/jpeg,image/png,image/webp" className={fieldClass} disabled={uploading} onChange={(e) => void uploadGallery(Array.from(e.target.files ?? []))} /></label>
      {uploading && <p className="flex items-center gap-2 text-sm text-rust lg:col-span-2"><LoaderCircle className="animate-spin" size={16} /> 正在上传，请不要关闭页面…</p>}
      {uploadError && <p className="rounded-xl bg-rust/10 p-3 text-sm text-rust lg:col-span-2">{uploadError}</p>}
      {form.image_url && <div className="lg:col-span-2"><p className="mb-2 text-sm text-ink/60">当前封面</p><img src={form.image_url} alt="作品集封面预览" className="h-48 w-full rounded-xl object-cover md:w-80" /></div>}
      {form.gallery_urls.length > 0 && <div className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm text-ink/60">作品集照片</p><span className="text-xs text-ink/40">共 {form.gallery_urls.length} 张 · 点击“设为封面”可更换首页图</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {form.gallery_urls.map((url, index) => <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl bg-fog">
            <img src={url} alt={`作品照片 ${index + 1}`} className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/75 p-2 text-xs text-paper backdrop-blur">
              <button type="button" className={form.image_url === url ? 'text-rust' : 'hover:text-rust'} onClick={() => setForm({ ...form, image_url: url })}>{form.image_url === url ? '当前封面' : '设为封面'}</button>
              <button type="button" aria-label="移除照片" className="hover:text-rust" onClick={() => setForm({ ...form, gallery_urls: form.gallery_urls.filter((_, photoIndex) => photoIndex !== index) })}><X size={15} /></button>
            </div>
          </div>)}
        </div>
      </div>}
      <label className={`${labelClass} lg:col-span-2`}>简介<textarea className={fieldClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> 首页精选</label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-paper hover:bg-rust"><Save size={16} /> 保存作品</button>
    </form>
    <ItemList>{items.map((item) => <ItemRow key={item.id} title={item.title} meta={`${item.category} · ${item.location} · ${item.year} · ${new Set([item.image_url, ...item.gallery_urls]).size} 张照片`} onEdit={() => setForm(item)} onRemove={() => remove(item.id)} />)}</ItemList>
  </ManagerShell>;
}

function PostManager({ token, items, form, setForm, save, remove }: { token: string; items: Post[]; form: Omit<Post, 'id'> & { id?: number }; setForm: (value: typeof form) => void; save: (event: FormEvent) => void; remove: (id: number) => void }) {
  return <ManagerShell title="博客文章" count={items.length} onNew={() => setForm(emptyPost)}>
    <form onSubmit={save} className="grid gap-4 rounded-2xl bg-paper p-5 lg:grid-cols-2">
      <label className={labelClass}>标题<input required className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label className={labelClass}>Slug<input required className={fieldClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-first-post" /></label>
      <label className={`${labelClass} lg:col-span-2`}>摘要<textarea required className={fieldClass} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
      <label className={`${labelClass} lg:col-span-2`}>封面地址<input className={fieldClass} value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></label>
      <label className={`${labelClass} lg:col-span-2`}>或上传封面（最大 12MB）<input type="file" accept="image/jpeg,image/png,image/webp" className={fieldClass} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const result = await adminUpload(file, token); setForm({ ...form, cover_url: result.url }); } }} /></label>
      <label className={`${labelClass} lg:col-span-2`}>正文（Markdown）<textarea required className={`${fieldClass} font-mono`} rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
      <label className={labelClass}>标签（逗号分隔）<input className={fieldClass} value={form.tags.join(',')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
      <label className={labelClass}>状态<select className={fieldClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Post['status'] })}><option value="draft">草稿</option><option value="published">发布</option></select></label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-paper hover:bg-rust lg:col-span-2"><Save size={16} /> 保存文章</button>
    </form>
    <ItemList>{items.map((item) => <ItemRow key={item.id} title={item.title} meta={`${item.status === 'published' ? '已发布' : '草稿'} · /${item.slug}`} onEdit={() => setForm(item)} onRemove={() => remove(item.id)} />)}</ItemList>
  </ManagerShell>;
}

function SkillManager({ items, form, setForm, save, remove }: { items: Skill[]; form: Omit<Skill, 'id'> & { id?: number }; setForm: (value: typeof form) => void; save: (event: FormEvent) => void; remove: (id: number) => void }) {
  return <ManagerShell title="Agent Skills" count={items.length} onNew={() => setForm(emptySkill)}>
    <form onSubmit={save} className="grid gap-4 rounded-2xl bg-paper p-5 lg:grid-cols-2">
      <label className={labelClass}>Skill 名称<input required className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className={labelClass}>简短说明<input required className={fieldClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className={`${labelClass} lg:col-span-2`}>系统指令<textarea required className={`${fieldClass} font-mono`} rows={10} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> 启用</label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-paper hover:bg-rust"><Save size={16} /> 保存 Skill</button>
    </form>
    <ItemList>{items.map((item) => <ItemRow key={item.id} title={item.name} meta={`${item.enabled ? '已启用' : '已停用'} · ${item.description}`} onEdit={() => setForm(item)} onRemove={() => remove(item.id)} />)}</ItemList>
  </ManagerShell>;
}

function ManagerShell({ title, count, onNew, children }: { title: string; count: number; onNew: () => void; children: React.ReactNode }) {
  return <><div className="flex items-center justify-between"><div><h1 className="font-serif text-4xl">{title}</h1><p className="mt-1 text-sm text-ink/45">共 {count} 条</p></div><button onClick={onNew} className="flex items-center gap-2 rounded-xl bg-rust px-4 py-3 text-sm text-white"><Plus size={16} /> 新建</button></div>{children}</>;
}
function ItemList({ children }: { children: React.ReactNode }) { return <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl bg-paper">{children}</div>; }
function ItemRow({ title, meta, onEdit, onRemove }: { title: string; meta: string; onEdit: () => void; onRemove: () => void }) {
  return <div className="flex items-center justify-between gap-4 p-5"><button onClick={onEdit} className="min-w-0 flex-1 text-left"><p className="truncate font-medium hover:text-rust">{title}</p><p className="mt-1 truncate text-xs text-ink/45">{meta}</p></button><button onClick={onRemove} className="rounded-lg p-2 text-ink/35 hover:bg-rust/10 hover:text-rust" aria-label="删除"><Trash2 size={17} /></button></div>;
}
