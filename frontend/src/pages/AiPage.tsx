import { ArrowUp, Bot, Check, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, type Skill } from '../lib/api';

type Message = { role: 'user' | 'assistant'; content: string };

export function AiPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<number>();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好，我是 Kai 的轻量 Agent 实验。选择一个 Skill，然后问我一个问题。' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.skills().then((items) => {
      setSkills(items);
      setSelected(items[0]?.id);
    }).catch(() => setSkills([]));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const response = await api.chat(message, selected);
      setMessages((current) => [...current, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error instanceof Error ? error.message : '暂时无法回答' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-screen-xl px-5 py-12 md:px-10 md:py-20">
      <header className="mb-12 grid gap-6 md:grid-cols-2 md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-rust"><Sparkles size={15} /> Agent playground</div>
          <h1 className="mt-4 font-serif text-5xl md:text-7xl">AI 实验室</h1>
        </div>
        <p className="max-w-lg text-sm leading-7 text-ink/60 md:justify-self-end">一个用来学习 Agent 基本流程的小空间：选择 Skill、组织提示词、调用模型，再观察它如何回答。</p>
      </header>
      <div className="grid overflow-hidden rounded-3xl border border-ink/15 bg-white/50 shadow-2xl shadow-ink/5 lg:grid-cols-12">
        <aside className="border-b border-ink/10 bg-ink p-6 text-paper lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="mb-7 flex items-center gap-3"><Bot size={20} /><h2 className="font-medium">选择 Skill</h2></div>
          <div className="space-y-3">
            {skills.map((skill) => (
              <button key={skill.id} onClick={() => setSelected(skill.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected === skill.id ? 'border-paper/60 bg-paper/10' : 'border-paper/10 hover:border-paper/30'}`}>
                <div className="flex items-center justify-between"><span className="font-medium">{skill.name}</span>{selected === skill.id && <Check size={16} />}</div>
                <p className="mt-2 text-xs leading-5 text-paper/55">{skill.description}</p>
              </button>
            ))}
          </div>
          <p className="mt-8 text-xs leading-5 text-paper/35">Skill 可在管理员后台新建和编辑。模型 API 未配置时，系统将使用演示模式。</p>
        </aside>
        <section className="flex min-h-[620px] flex-col lg:col-span-8">
          <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-10">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-5 py-4 text-sm leading-7 ${message.role === 'user' ? 'bg-rust text-white' : 'bg-paper text-ink'}`}>{message.content}</div>
              </div>
            ))}
            {loading && <div className="text-sm text-ink/40">Agent 正在思考…</div>}
          </div>
          <form onSubmit={submit} className="border-t border-ink/10 p-5 md:p-7">
            <div className="flex items-end gap-3 rounded-2xl border border-ink/15 bg-white p-3 focus-within:border-rust">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder="问点什么，例如：帮我设计一次城市摄影散步…" className="min-h-14 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
              <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-paper transition hover:bg-rust" aria-label="发送"><ArrowUp size={18} /></button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
