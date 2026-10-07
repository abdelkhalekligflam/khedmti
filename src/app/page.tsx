"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Wallet,
  Settings2,
  CalendarDays,
  CircleHelp,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  MoreHorizontal,
  Check,
  Clock3,
  Download,
  Upload,
  Trash2,
  Pencil,
  Printer,
  MessageCircle,
  Copy,
  Cloud,
  LoaderCircle,
  LogOut,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Banknote,
  AlertCircle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import CloudGate from "@/components/cloud-gate";
import Modal from "@/components/modal";
import { useWorkspace } from "@/lib/use-workspace";
import { supabase } from "@/lib/supabase";
import { words, extra, type Lang } from "@/lib/i18n";
import {
  addPayment,
  totals,
  round,
  nextNumber,
  validData,
  type Data,
  type Client,
  type Job,
  type Line,
} from "@/lib/model";
type View =
  | "dashboard"
  | "clients"
  | "quotes"
  | "jobs"
  | "payments"
  | "planning"
  | "settings"
  | "support";
const navigation = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "clients", icon: Users },
  { id: "quotes", icon: FileText },
  { id: "jobs", icon: Wrench },
  { id: "planning", icon: CalendarDays },
  { id: "payments", icon: Wallet },
  { id: "settings", icon: Settings2 },
  { id: "support", icon: CircleHelp },
] as const;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const newLine = (): Line => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  price: 0,
});
export default function Home() {
  return (
    <CloudGate>
      {(user, guest) => (
        <Workspace key={user?.id || "local"} user={user} guest={guest} />
      )}
    </CloudGate>
  );
}
function Workspace({ user, guest }: { user: User | null; guest: boolean }) {
  const {
    data,
    setData,
    ready,
    error,
    saving,
    dirty,
    loaded,
    save: saveCloud,
    load,
  } = useWorkspace(user?.id);
  const [lang, setLang] = useState<Lang>("fr"),
    [dark, setDark] = useState(false),
    [view, setView] = useState<View>("dashboard"),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [modal, setModal] = useState<
      "client" | "quote" | "job" | "payment" | "preview" | null
    >(null),
    [edit, setEdit] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [formError, setFormError] = useState(""),
    [printed, setPrinted] = useState<Job | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [actions, setActions] = useState<string | null>(null),
    [items, setItems] = useState<Line[]>([]),
    [tax, setTax] = useState(0),
    [discount, setDiscount] = useState(0),
    [confirm, setConfirm] = useState<{
      title: string;
      text: string;
      run: () => void;
    } | null>(null),
    [month, setMonth] = useState(() => new Date(2026, 0, 1)),
    [selectedDay, setSelectedDay] = useState<string | null>(null),
    [localReady, setLocalReady] = useState(false);
  const importRef = useRef<HTMLInputElement>(null),
    fileRef = useRef<HTMLInputElement>(null);
  const t = { ...words[lang], ...extra[lang] },
    locale = lang === "fr" ? "fr-MA" : "ar-MA";
  useEffect(() => {
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setLang(localStorage.getItem("khedmti-lang") === "ar" ? "ar" : "fr");
    setDark(localStorage.getItem("khedmti-dark") === "true");
    setLocalReady(true);
  }, []);
  useEffect(() => {
    if (!localReady) return;
    localStorage.setItem("khedmti-lang", lang);
    localStorage.setItem("khedmti-dark", String(dark));
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [lang, dark, localReady]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (user && dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [user, dirty]);
  useEffect(() => {
    if (!printed) return;
    const id = setTimeout(() => {
      window.print();
      setPrinted(null);
    }, 100);
    return () => clearTimeout(id);
  }, [printed]);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 2,
    }).format(n);
  const dateLabel = (s: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
      new Date(s + "T12:00:00"),
    );
  const getClient = (id: string) => data.clients.find((c) => c.id === id);
  const jobs = data.jobs.filter((j) => j.kind === "job"),
    quotes = data.jobs.filter((j) => j.kind === "quote"),
    outstanding = jobs.filter((j) => round(j.amount - j.paid) > 0),
    active = jobs.filter((j) => j.status !== "completed");
  const received = round(jobs.reduce((sum, j) => sum + j.paid, 0)),
    remaining = round(jobs.reduce((sum, j) => sum + j.amount - j.paid, 0));
  const stateLabels: Record<string, string> = {
    todo: t.todo,
    doing: t.doing,
    completed: t.completed,
    draft: t.draft,
    accepted: t.accepted,
    refused: t.refused,
  };
  const subtitle: Record<View, string> = {
    dashboard: t.intro,
    clients: t.clientsSubtitle,
    quotes: t.quoteDesc,
    jobs: t.jobsDesc,
    payments: t.paymentsDesc,
    planning: t.planningDesc,
    settings: t.settingsDesc,
    support: t.helpDesc,
  };
  function navigate(v: View) {
    setView(v);
    setMenu(false);
    setQuery("");
    setFilter("all");
    setActions(null);
    setDetail(null);
  }
  function open(kind: typeof modal, id: string | null = null) {
    if ((kind === "quote" || kind === "job") && !data.clients.length) {
      setNotice(t.noClient);
      navigate("clients");
      return;
    }
    setEdit(id);
    setModal(kind);
    setFormError("");
    setActions(null);
    if (kind === "quote" || kind === "job") {
      const j = data.jobs.find((j) => j.id === id);
      setItems(
        j?.items?.length
          ? j.items
          : [
              j
                ? {
                    id: crypto.randomUUID(),
                    description: j.title,
                    quantity: 1,
                    price: j.amount,
                  }
                : newLine(),
            ],
      );
      setTax(j?.tax || 0);
      setDiscount(j?.discount || 0);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.currentTarget),
      id = edit || crypto.randomUUID();
    try {
      if (modal === "client") {
        const c: Client = {
          id,
          name: String(f.get("name")).trim(),
          phone: String(f.get("phone")).trim(),
          address: String(f.get("address")).trim(),
          email: String(f.get("email") || "").trim(),
          notes: String(f.get("notes") || "").trim(),
        };
        if (!c.name || !c.phone) throw new Error(t.invalidLines);
        setData((d) => ({
          ...d,
          clients: edit
            ? d.clients.map((x) => (x.id === id ? c : x))
            : [c, ...d.clients],
        }));
      } else if (modal === "payment") {
        setData(
          addPayment(
            data,
            id,
            Number(f.get("payment")),
            String(f.get("date")),
            String(f.get("method")),
            String(f.get("notes") || ""),
          ),
        );
      } else {
        if (
          items.length === 0 ||
          items.some(
            (i) =>
              !i.description.trim() ||
              !Number.isFinite(i.price) ||
              i.price < 0 ||
              !Number.isFinite(i.quantity) ||
              i.quantity <= 0,
          ) ||
          !Number.isFinite(tax) ||
          tax < 0 ||
          tax > 100 ||
          !Number.isFinite(discount) ||
          discount < 0 ||
          discount > totals(items).subtotal
        )
          throw new Error(t.invalidLines);
        const amount = totals(items, discount, tax).total,
          old = data.jobs.find((j) => j.id === edit),
          paid = old?.paid ?? Number(f.get("paid") || 0);
        if (
          !Number.isFinite(amount) ||
          !Number.isFinite(paid) ||
          paid < 0 ||
          paid > amount
        )
          throw new Error(t.invalid);
        const kind = modal === "quote" ? "quote" : "job";
        const j: Job = {
          ...old,
          id,
          client: String(f.get("client")),
          title: String(f.get("title")).trim(),
          date: String(f.get("date")),
          time: String(f.get("time") || ""),
          amount,
          paid,
          kind,
          status: String(f.get("status")),
          items: items.map((i) => ({
            ...i,
            description: i.description.trim(),
          })),
          tax,
          discount,
          notes: String(f.get("notes") || "").trim(),
          number: old?.number || nextNumber(data, kind),
        };
        if (!j.title || !getClient(j.client)) throw new Error(t.invalidLines);
        setData((d) => ({
          ...d,
          jobs: edit
            ? d.jobs.map((x) => (x.id === id ? j : x))
            : [j, ...d.jobs],
          payments:
            !edit && kind === "job" && paid > 0
              ? [
                  ...(d.payments || []),
                  {
                    id: crypto.randomUUID(),
                    jobId: id,
                    amount: paid,
                    date: j.date,
                    method: "other",
                    note: t.paid,
                  },
                ]
              : d.payments,
        }));
      }
      setModal(null);
      setNotice(t.saved);
    } catch (e) {
      setFormError(
        e instanceof Error && e.message !== "payment" ? e.message : t.invalid,
      );
    }
  }
  function deleteJob(j: Job) {
    setActions(null);
    setConfirm({
      title: t.deleteTitle,
      text: t.deleteText,
      run: () => {
        setData((d) => ({
          ...d,
          jobs: d.jobs.filter((x) => x.id !== j.id),
          payments: (d.payments || []).filter((p) => p.jobId !== j.id),
        }));
        setNotice(t.deleted);
      },
    });
  }
  function deleteClient(c: Client) {
    if (data.jobs.some((j) => j.client === c.id)) {
      setNotice(t.linked);
      return;
    }
    setConfirm({
      title: t.deleteTitle,
      text: t.deleteText,
      run: () => {
        setData((d) => ({
          ...d,
          clients: d.clients.filter((x) => x.id !== c.id),
        }));
        setDetail(null);
        setNotice(t.deleted);
      },
    });
  }
  function convert(j: Job) {
    setActions(null);
    if (data.jobs.some((x) => x.quoteId === j.id)) {
      setNotice(t.quoteInJob);
      return;
    }
    setConfirm({
      title: t.convertConfirm,
      text: j.title,
      run: () => {
        const id = crypto.randomUUID();
        setData((d) => ({
          ...d,
          jobs: [
            {
              ...j,
              id,
              kind: "job",
              status: "todo",
              quoteId: j.id,
              number: nextNumber(d, "job"),
            },
            ...d.jobs,
          ],
          payments:
            j.paid > 0
              ? [
                  ...(d.payments || []),
                  {
                    id: crypto.randomUUID(),
                    jobId: id,
                    amount: j.paid,
                    date: j.date,
                    method: "other",
                    note: t.paid,
                  },
                ]
              : d.payments,
        }));
        setNotice(t.saved);
        navigate("jobs");
      },
    });
  }
  function share(j: Job) {
    let phone = (getClient(j.client)?.phone || "").replace(/[^0-9]/g, "");
    if (phone.startsWith("0") && phone.length === 10)
      phone = "212" + phone.slice(1);
    const text = `${data.company}\n${t.quoteLabel} ${j.number || j.id.slice(0, 8)}\n${getClient(j.client)?.name}\n${j.title}\n${(j.items || []).map((i) => `${i.description} · ${i.quantity} × ${money(i.price)}`).join("\n")}\n${t.total}: ${money(j.amount)}\n${t.rest}: ${money(j.amount - j.paid)}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setActions(null);
  }
  function download(value: string, name: string, type: string) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(new Blob([value], { type }));
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function backup() {
    download(
      JSON.stringify(data, null, 2),
      `khedmti-${today()}.json`,
      "application/json",
    );
  }
  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5000000) throw new Error();
      const parsed: unknown = JSON.parse(await file.text());
      if (!validData(parsed)) throw new Error();
      setConfirm({
        title: t.restoreTitle,
        text: t.restoreText,
        run: () => {
          setData(parsed);
          setNotice(t.restored);
        },
      });
    } catch {
      setNotice(t.invalidBackup);
    }
  }
  function csv() {
    const escape = (s: string | number) =>
      `"${String(s)
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""')}"`;
    const rows = [
      [
        t.reference,
        t.title,
        t.client,
        t.date,
        t.status,
        t.total,
        t.paid,
        t.rest,
      ],
      ...jobs.map((j) => [
        j.number || j.id,
        j.title,
        getClient(j.client)?.name || "",
        j.date,
        stateLabels[j.status],
        j.amount,
        j.paid,
        round(j.amount - j.paid),
      ]),
    ];
    download(
      "\uFEFF" + rows.map((r) => r.map(escape).join(";")).join("\r\n"),
      `khedmti-interventions-${today()}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 1000000
    ) {
      setNotice(t.avatarError);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setData((d) => ({ ...d, avatar: String(reader.result) }));
      setNotice(t.saved);
    };
    reader.onerror = () => setNotice(t.avatarError);
    reader.readAsDataURL(file);
  }
  async function logout() {
    if (!supabase) return;
    const go = () => {
      void supabase!.auth.signOut().then(({ error }) => {
        if (error) setNotice(error.message);
      });
    };
    if (dirty) setConfirm({ title: t.notSaved, text: t.localDraft, run: go });
    else go();
  }
  const field = (
    label: string,
    name: string,
    type = "text",
    value?: string | number,
    required = true,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        maxLength={type === "text" ? 500 : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
  const filtered = (list: Job[]) =>
    list.filter(
      (j) =>
        (filter === "all" || j.status === filter) &&
        (j.title + (j.number || "") + (getClient(j.client)?.name || ""))
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const current = data.jobs.find((j) => j.id === edit),
    currentClient = data.clients.find((c) => c.id === edit),
    clientDetail = data.clients.find((c) => c.id === detail);
  function avatar(name: string, size = "") {
    return (
      <span className={`avatar ${size}`}>{name.slice(0, 2).toUpperCase()}</span>
    );
  }
  function status(j: Job) {
    return (
      <span className={`badge ${j.status}`}>
        <span />
        {stateLabels[j.status]}
      </span>
    );
  }
  function empty(
    text = t.empty,
    description = t.start,
    button?: () => void,
    label = t.add,
  ) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <FileText size={24} />
        </div>
        <h3>{text}</h3>
        <p>{description}</p>
        {button && (
          <button className="primary" onClick={button}>
            <Plus size={15} />
            {label}
          </button>
        )}
      </div>
    );
  }
  function actionMenu(j: Job) {
    return (
      <div className="action-wrap">
        <button
          className="icon-button"
          aria-label={t.more}
          aria-expanded={actions === j.id}
          onClick={() => setActions(actions === j.id ? null : j.id)}
        >
          <MoreHorizontal size={18} />
        </button>
        {actions === j.id && (
          <Modal
            title={j.title}
            closeLabel={t.close}
            onClose={() => setActions(null)}
          >
            <div className="action-list">
              <button onClick={() => open(j.kind, j.id)}>
                <Pencil size={14} />
                {t.edit}
              </button>
              {j.kind === "quote" && (
                <>
                  <button onClick={() => open("preview", j.id)}>
                    <FileText size={14} />
                    {t.printPreview}
                  </button>
                  <button
                    onClick={() => {
                      setPrinted(j);
                      setActions(null);
                    }}
                  >
                    <Printer size={14} />
                    {t.print}
                  </button>
                  <button onClick={() => share(j)}>
                    <MessageCircle size={14} />
                    {t.whatsapp}
                  </button>
                  <button
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        jobs: [
                          {
                            ...j,
                            id: crypto.randomUUID(),
                            number: nextNumber(d, "quote"),
                            status: "draft",
                            paid: 0,
                            quoteId: undefined,
                          },
                          ...d.jobs,
                        ],
                      }));
                      setActions(null);
                      setNotice(t.saved);
                    }}
                  >
                    <Copy size={14} />
                    {t.duplicate}
                  </button>
                  {j.status === "accepted" && (
                    <button onClick={() => convert(j)}>
                      <Wrench size={14} />
                      {t.convert}
                    </button>
                  )}
                </>
              )}
              {j.kind === "job" && j.amount > j.paid && (
                <button onClick={() => open("payment", j.id)}>
                  <Banknote size={14} />
                  {t.addPayment}
                </button>
              )}
              <button className="danger-text" onClick={() => deleteJob(j)}>
                <Trash2 size={14} />
                {t.remove}
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }
  function table(list: Job[], payment = false, compact = false) {
    const rows = compact ? list : filtered(list);
    return rows.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.title}</th>
              <th>{t.client}</th>
              <th>{t.date}</th>
              {!payment && <th>{t.status}</th>}
              <th>{payment ? t.rest : t.total}</th>
              <th>
                <span className="sr-only">{t.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id}>
                <td>
                  <div className="table-title">
                    <span className="document-icon">
                      {j.kind === "quote" ? (
                        <FileText size={17} />
                      ) : (
                        <Wrench size={17} />
                      )}
                    </span>
                    <div>
                      <strong>{j.title}</strong>
                      <small>
                        {j.number || j.id.slice(0, 8).toUpperCase()}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    className="client-link"
                    onClick={() => {
                      navigate("clients");
                      setDetail(j.client);
                    }}
                  >
                    {getClient(j.client)?.name}
                  </button>
                </td>
                <td>
                  <span>{dateLabel(j.date)}</span>
                  {j.time && <small>{j.time}</small>}
                </td>
                {!payment && <td>{status(j)}</td>}
                <td className="money">
                  {money(payment ? round(j.amount - j.paid) : j.amount)}
                  {payment && (
                    <small>
                      {t.total}: {money(j.amount)}
                    </small>
                  )}
                </td>
                <td>
                  {payment ? (
                    <button
                      className="small-button"
                      onClick={() => open("payment", j.id)}
                    >
                      <Plus size={13} />
                      {t.payment}
                    </button>
                  ) : (
                    actionMenu(j)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      empty(list.length ? t.noResults : t.empty, t.start)
    );
  }
  function toolbar(kind: "quote" | "job") {
    return (
      <div className="toolbar">
        <div className="filter-tabs">
          {[
            "all",
            ...(kind === "quote"
              ? ["draft", "accepted", "refused"]
              : ["todo", "doing", "completed"]),
          ].map((s) => (
            <button
              className={filter === s ? "active" : ""}
              key={s}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? t.all : stateLabels[s]}
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={15} />
          <input
            aria-label={t.search}
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
    );
  }
  function quoteDocument(j: Job) {
    const c = getClient(j.client),
      lines = j.items?.length
        ? j.items
        : [{ id: j.id, description: j.title, quantity: 1, price: j.amount }],
      sum = totals(lines, j.discount || 0, j.tax || 0),
      expiry = new Date(j.date + "T12:00:00");
    expiry.setDate(expiry.getDate() + 30);
    return (
      <article className="quote-document" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="quote-header">
          <div>
            {data.avatar && (
              <img
                src={data.avatar}
                alt={data.company}
                width={64}
                height={64}
              />
            )}
            <h2>{data.company}</h2>
            <p>{data.address}</p>
            <p>
              {data.phone} {data.email && `· ${data.email}`}
            </p>
            {data.ice && <p>ICE : {data.ice}</p>}
          </div>
          <div className="quote-ref">
            <h1>{t.quoteLabel}</h1>
            <strong>{j.number || j.id.slice(0, 8).toUpperCase()}</strong>
            <p>
              {t.date}: {j.date}
            </p>
            <p>
              {t.validUntil}: {expiry.toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
        <div className="quote-client">
          <small>{t.client}</small>
          <h3>{c?.name}</h3>
          <p>{c?.address}</p>
          <p>
            {c?.phone} {c?.email && `· ${c.email}`}
          </p>
        </div>
        <h3>{j.title}</h3>
        <table>
          <thead>
            <tr>
              <th>{t.line}</th>
              <th>{t.quantity}</th>
              <th>{t.unit}</th>
              <th>{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td>
                <td>{i.quantity}</td>
                <td>{money(i.price)}</td>
                <td>{money(round(i.quantity * i.price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="quote-totals">
          <p>
            <span>{t.subtotal}</span>
            <strong>{money(sum.subtotal)}</strong>
          </p>
          {!!j.discount && (
            <p>
              <span>{t.discount}</span>
              <strong>− {money(j.discount)}</strong>
            </p>
          )}
          <p>
            <span>
              {t.taxAmount} ({j.tax || 0}%)
            </span>
            <strong>{money(sum.taxAmount)}</strong>
          </p>
          <p className="quote-total">
            <span>{t.total}</span>
            <strong>{money(j.amount)}</strong>
          </p>
          {j.paid > 0 && (
            <>
              <p>
                <span>{t.paid}</span>
                <strong>{money(j.paid)}</strong>
              </p>
              <p>
                <span>{t.rest}</span>
                <strong>{money(round(j.amount - j.paid))}</strong>
              </p>
            </>
          )}
        </div>
        {j.notes && (
          <div className="quote-notes">
            <h4>{t.notes}</h4>
            <p>{j.notes}</p>
          </div>
        )}
        <div className="quote-footer">
          <p>{t.quoteValidity}</p>
          <p>{j.tax ? t.taxNote : t.untaxed}</p>
          <strong>{t.quoteFooter}</strong>
        </div>
      </article>
    );
  }
  if (!ready || !localReady)
    return (
      <div className="auth-loading">
        <LoaderCircle className="spin" /> Khedmti
      </div>
    );
  if (!loaded)
    return (
      <div className="load-error">
        <AlertCircle size={30} />
        <h1>Khedmti</h1>
        <p role="alert">{error}</p>
        <button className="primary" onClick={() => void load()}>
          {t.reload}
        </button>
        {user && <button onClick={() => void logout()}>{t.logout}</button>}
      </div>
    );
  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <div className="screen" dir={lang === "ar" ? "rtl" : "ltr"}>
        {menu && (
          <button
            className="scrim"
            aria-label={t.close}
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={menu ? "open" : ""}>
          <a className="brand" href="/">
            <span className="logo">
              k<span>·</span>
            </span>
            Khedmti<span className="brand-dot">.</span>
          </a>
          <div className="workspace-switch">
            <span className="workspace-avatar">
              <Building2 size={16} />
            </span>
            <div>
              <strong>{data.company}</strong>
              <small>{user ? user.email : t.guest}</small>
            </div>
            <ShieldCheck size={15} />
          </div>
          <p className="eyebrow">{t.workspace}</p>
          <nav>
            {navigation.slice(0, 6).map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={view === id ? "selected" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={18} />
                {t[id]}
                {id === "jobs" && active.length > 0 && <b>{active.length}</b>}
              </button>
            ))}
          </nav>
          <p className="eyebrow tools-label">{t.tools}</p>
          <nav>
            {navigation.slice(6).map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={view === id ? "selected" : ""}
                onClick={() => navigate(id)}
              >
                <Icon size={18} />
                {t[id]}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <span className="live-dot" />
              {user ? (dirty ? t.changes : t.savedCloud) : t.guest}
              <small>{user ? t.localDraft : t.local}</small>
            </div>
            <button className="profile" onClick={() => navigate("settings")}>
              {data.avatar ? (
                <img
                  className="avatar"
                  src={data.avatar}
                  width={38}
                  height={38}
                  alt=""
                />
              ) : (
                avatar(data.company)
              )}
              <div>
                <strong>{data.company}</strong>
                <small>{t.business}</small>
              </div>
              <Settings2 size={15} />
            </button>
          </div>
        </aside>
        <div className="main">
          <header>
            <div className="header-left">
              <button
                className="menu-button icon-button"
                aria-label={t.menu}
                onClick={() => setMenu(!menu)}
              >
                <Menu size={20} />
              </button>
              <span className="breadcrumb-root">{t.workspace}</span>
              <span className="slash">/</span>
              <strong>{t[view]}</strong>
            </div>
            <div className="header-actions">
              {user && (
                <button
                  className={`cloud-save ${dirty ? "unsaved" : ""}`}
                  disabled={saving || !dirty}
                  onClick={() => void saveCloud()}
                >
                  {saving ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Cloud size={15} />
                  )}
                  <span>
                    {saving ? t.saving : dirty ? t.cloud : t.savedCloud}
                  </span>
                </button>
              )}
              <button
                className="language-button"
                onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
              >
                <Globe2 size={14} />
                {lang === "fr" ? "العربية" : "FR"}
              </button>
              <button
                className="icon-button theme-button"
                aria-label={t.dark}
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                className="header-avatar"
                aria-label={t.settings}
                onClick={() => navigate("settings")}
              >
                {avatar(data.company, "small")}
              </button>
            </div>
          </header>
          <main>
            <div className="page-title">
              <div>
                <div className="page-eyebrow">
                  <span className="tiny-line" />
                  {view === "dashboard" ? t.dashboardLabel : t.workspace}
                </div>
                <h1>{view === "dashboard" ? t.greeting : t[view]}</h1>
                <p>{subtitle[view]}</p>
              </div>
              <div className="title-actions">
                {view === "dashboard" && (
                  <button className="secondary" onClick={() => open("quote")}>
                    <FileText size={16} />
                    {t.newQuote}
                  </button>
                )}
                {[
                  "dashboard",
                  "clients",
                  "quotes",
                  "jobs",
                  "planning",
                ].includes(view) && (
                  <button
                    className="primary"
                    onClick={() =>
                      open(
                        view === "clients"
                          ? "client"
                          : view === "quotes"
                            ? "quote"
                            : "job",
                      )
                    }
                  >
                    <Plus size={17} />
                    {view === "clients"
                      ? t.newClient
                      : view === "quotes"
                        ? t.newQuote
                        : t.newJob}
                  </button>
                )}
                {view === "payments" && (
                  <button className="secondary" onClick={csv}>
                    <Download size={16} />
                    {t.exportCsv}
                  </button>
                )}
              </div>
            </div>
            {(notice || error) && (
              <div className={`notice ${error ? "error" : ""}`} role="status">
                <span>
                  {error ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}{" "}
                  {error || notice}
                </span>
                <button
                  className="icon-button"
                  aria-label={t.close}
                  onClick={() => setNotice("")}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {!user && !guest && (
              <div className="local-banner">
                <ShieldCheck size={14} />
                <span>{t.connectionNotice}</span>
                <button onClick={backup}>
                  {t.backup}
                  <Download size={13} />
                </button>
              </div>
            )}
            {view === "dashboard" && (
              <>
                <div className="stats">
                  {[
                    {
                      label: t.revenue,
                      value: money(received),
                      icon: TrendingUp,
                      note: t.revenueDesc,
                      accent: true,
                    },
                    {
                      label: t.pending,
                      value: money(remaining),
                      icon: Wallet,
                      note: t.pendingDesc,
                    },
                    {
                      label: t.active,
                      value: active.length,
                      icon: Wrench,
                      note: t.activeDesc,
                    },
                    {
                      label: t.clients,
                      value: data.clients.length,
                      icon: Users,
                      note: t.clientsDesc,
                    },
                  ].map(({ label, value, icon: Icon, note, accent }) => (
                    <article
                      className={`stat ${accent ? "stat-accent" : ""}`}
                      key={label}
                    >
                      <div>
                        <span>{label}</span>
                        <i>
                          <Icon size={17} />
                        </i>
                      </div>
                      <strong>{value}</strong>
                      <small>
                        <span className="stat-dot" />
                        {note}
                      </small>
                    </article>
                  ))}
                </div>
                {!data.clients.length && (
                  <section className="onboarding">
                    <div className="onboarding-symbol">
                      <Wrench size={32} />
                      <span>✦</span>
                    </div>
                    <div>
                      <span className="eyebrow">KHEDMTI</span>
                      <h2>{t.onboarding}</h2>
                      <p>{t.onboardingDesc}</p>
                      <div className="onboarding-steps">
                        <span>
                          <b>1</b>
                          {t.step1}
                        </span>
                        <span>
                          <b>2</b>
                          {t.step2}
                        </span>
                        <span>
                          <b>3</b>
                          {t.step3}
                        </span>
                      </div>
                    </div>
                    <button className="primary" onClick={() => open("client")}>
                      {t.first}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                )}
                <div className="dashboard-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>{t.recent}</h2>
                        <p>{t.jobsDesc}</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("jobs")}
                      >
                        {t.all}
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {table(jobs.slice(0, 5), false, true)}
                  </section>
                  <section className="panel upcoming">
                    <div className="panel-heading">
                      <div>
                        <h2>{t.next}</h2>
                        <p>
                          {new Intl.DateTimeFormat(locale, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          }).format(new Date())}
                        </p>
                      </div>
                      <CalendarDays size={18} />
                    </div>
                    {active
                      .filter((j) => j.date >= today())
                      .sort((a, b) =>
                        (a.date + a.time).localeCompare(b.date + b.time),
                      )
                      .slice(0, 4)
                      .map((j) => (
                        <button
                          className="appointment"
                          onClick={() => open("job", j.id)}
                          key={j.id}
                        >
                          <span className="date-tile">
                            {j.date.slice(8)}
                            <small>
                              {new Intl.DateTimeFormat(locale, {
                                month: "short",
                              }).format(new Date(j.date + "T12:00:00"))}
                            </small>
                          </span>
                          <div>
                            <strong>{j.title}</strong>
                            <small>
                              {getClient(j.client)?.name}{" "}
                              {j.time && `· ${j.time}`}
                            </small>
                          </div>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    {!active.some((j) => j.date >= today()) && (
                      <div className="schedule-empty">
                        <CalendarDays size={28} />
                        <p>{t.emptyDay}</p>
                      </div>
                    )}
                    <button
                      className="wide"
                      onClick={() => navigate("planning")}
                    >
                      {t.planning}
                      <ArrowUpRight size={14} />
                    </button>
                  </section>
                </div>
                <section className="insight">
                  <div className="insight-icon">
                    <CheckCircle2 size={20} />
                  </div>
                  <p>{t.quoteOnly}</p>
                  <button
                    className="text-button"
                    onClick={() => navigate("support")}
                  >
                    {t.support}
                    <ArrowUpRight size={14} />
                  </button>
                </section>
              </>
            )}
            {view === "clients" &&
              (clientDetail ? (
                <>
                  <button
                    className="text-button back-button"
                    onClick={() => setDetail(null)}
                  >
                    <ChevronLeft size={15} />
                    {t.back}
                  </button>
                  <div className="client-detail-grid">
                    <section className="panel client-profile">
                      {avatar(clientDetail.name, "large")}
                      <h2>{clientDetail.name}</h2>
                      <p dir="ltr">{clientDetail.phone}</p>
                      {clientDetail.email && <p>{clientDetail.email}</p>}
                      <p>{clientDetail.address || "—"}</p>
                      {clientDetail.notes && (
                        <div className="client-notes">{clientDetail.notes}</div>
                      )}
                      <button
                        className="secondary"
                        onClick={() => open("client", clientDetail.id)}
                      >
                        <Pencil size={14} />
                        {t.edit}
                      </button>
                      <button
                        className="text-button danger-text"
                        onClick={() => deleteClient(clientDetail)}
                      >
                        <Trash2 size={14} />
                        {t.remove}
                      </button>
                    </section>
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>{t.clientHistory}</h2>
                      </div>
                      {table(
                        data.jobs.filter((j) => j.client === clientDetail.id),
                        false,
                        true,
                      )}
                    </section>
                  </div>
                </>
              ) : (
                <>
                  <div className="clients-toolbar">
                    <span>
                      {data.clients.length} {t.clients.toLowerCase()}
                    </span>
                    <div className="search">
                      <Search size={15} />
                      <input
                        aria-label={t.search}
                        placeholder={t.search}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="client-grid">
                    {data.clients
                      .filter((c) =>
                        (c.name + c.phone + c.address)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="panel client-card" key={c.id}>
                          <div className="client-card-top">
                            {avatar(c.name)}
                            <button
                              className="icon-button"
                              aria-label={t.edit}
                              onClick={() => open("client", c.id)}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                          <h2>{c.name}</h2>
                          <p dir="ltr">{c.phone}</p>
                          <p className="client-address">{c.address || "—"}</p>
                          <div className="client-card-bottom">
                            <span>
                              {
                                data.jobs.filter(
                                  (j) => j.client === c.id && j.kind === "job",
                                ).length
                              }{" "}
                              {t.jobs.toLowerCase()}
                            </span>
                            <button
                              className="text-button"
                              onClick={() => setDetail(c.id)}
                            >
                              {t.viewClient}
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!data.clients.length && (
                    <section className="panel">
                      {empty(t.empty, t.start, () => open("client"), t.first)}
                    </section>
                  )}
                  {data.clients.length > 0 &&
                    !data.clients.some((c) =>
                      (c.name + c.phone + c.address)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ) &&
                    empty(t.noResults, "")}
                </>
              ))}
            {(view === "quotes" || view === "jobs") && (
              <section className="panel">
                {toolbar(view === "quotes" ? "quote" : "job")}
                {table(view === "quotes" ? quotes : jobs)}
                <div className="table-footer">
                  {filtered(view === "quotes" ? quotes : jobs).length}{" "}
                  {t[view].toLowerCase()}
                  <span>Khedmti</span>
                </div>
              </section>
            )}
            {view === "payments" && (
              <>
                <div className="payment-summary">
                  <article>
                    <span>{t.revenue}</span>
                    <strong>{money(received)}</strong>
                    <CheckCircle2 size={20} />
                  </article>
                  <article>
                    <span>{t.payable}</span>
                    <strong>{money(remaining)}</strong>
                    <Clock3 size={20} />
                  </article>
                  <article>
                    <span>{t.jobTotal}</span>
                    <strong>
                      {money(jobs.reduce((s, j) => s + j.amount, 0))}
                    </strong>
                    <Wallet size={20} />
                  </article>
                </div>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>{t.payable}</h2>
                      <p>{t.paymentsDesc}</p>
                    </div>
                    <div className="search">
                      <Search size={15} />
                      <input
                        aria-label={t.search}
                        placeholder={t.search}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {table(outstanding, true)}
                </section>
                <section className="panel history-panel">
                  <div className="panel-heading">
                    <h2>{t.history}</h2>
                    <Banknote size={18} />
                  </div>
                  {(data.payments || []).length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>{t.title}</th>
                            <th>{t.client}</th>
                            <th>{t.date}</th>
                            <th>{t.method}</th>
                            <th>{t.total}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(data.payments || [])].reverse().map((p) => {
                            const j = jobs.find((j) => j.id === p.jobId);
                            return (
                              <tr key={p.id}>
                                <td>
                                  <strong>{j?.title}</strong>
                                  <small>{p.note}</small>
                                </td>
                                <td>{j && getClient(j.client)?.name}</td>
                                <td>{dateLabel(p.date)}</td>
                                <td>
                                  {(
                                    {
                                      cash: t.cash,
                                      bank: t.bank,
                                      card: t.card,
                                      other: t.other,
                                    } as Record<string, string>
                                  )[p.method] || p.method}
                                </td>
                                <td className="money">{money(p.amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    empty(t.noPayments, t.paymentsDesc)
                  )}
                  {jobs.some(
                    (j) =>
                      j.paid >
                      round(
                        (data.payments || [])
                          .filter((p) => p.jobId === j.id)
                          .reduce((s, p) => s + p.amount, 0),
                      ),
                  ) && <div className="history-note">{t.inheritedPayment}</div>}
                </section>
              </>
            )}
            {view === "planning" && (
              <>
                <section className="panel calendar">
                  <div className="calendar-heading">
                    <div>
                      <span className="eyebrow">{t.calendar}</span>
                      <h2>
                        {new Intl.DateTimeFormat(locale, {
                          month: "long",
                          year: "numeric",
                        }).format(month)}
                      </h2>
                    </div>
                    <div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setMonth(
                            new Date(
                              new Date().getFullYear(),
                              new Date().getMonth(),
                              1,
                            ),
                          );
                          setSelectedDay(today());
                        }}
                      >
                        {t.todayLabel}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t.previous}
                        onClick={() => {
                          setMonth(
                            new Date(
                              month.getFullYear(),
                              month.getMonth() - 1,
                              1,
                            ),
                          );
                          setSelectedDay(null);
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t.next}
                        onClick={() => {
                          setMonth(
                            new Date(
                              month.getFullYear(),
                              month.getMonth() + 1,
                              1,
                            ),
                          );
                          setSelectedDay(null);
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="calendar-week">
                    {Array.from({ length: 7 }, (_, i) =>
                      new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                      }).format(new Date(2026, 0, 5 + i)),
                    ).map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {Array.from(
                      {
                        length:
                          ((month.getDay() + 6) % 7) +
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            0,
                          ).getDate(),
                      },
                      (_, i) => {
                        const day = i - ((month.getDay() + 6) % 7) + 1;
                        if (day < 1)
                          return <div className="calendar-blank" key={i} />;
                        const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                          scheduled = jobs.filter((j) => j.date === date);
                        return (
                          <button
                            key={i}
                            className={`calendar-day ${date === today() ? "today" : ""} ${selectedDay === date ? "chosen" : ""}`}
                            onClick={() =>
                              setSelectedDay(selectedDay === date ? null : date)
                            }
                          >
                            <span className="day-number">{day}</span>
                            <div>
                              {scheduled.slice(0, 2).map((j) => (
                                <span
                                  className={`calendar-job ${j.status}`}
                                  key={j.id}
                                >
                                  {j.time && `${j.time} `}
                                  {j.title}
                                </span>
                              ))}
                              {scheduled.length > 2 && (
                                <small>+{scheduled.length - 2}</small>
                              )}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>
                <section className="panel history-panel">
                  <div className="panel-heading">
                    <h2>
                      {selectedDay ? dateLabel(selectedDay) : t.thisMonth}
                    </h2>
                    <CalendarDays size={18} />
                  </div>
                  {table(
                    jobs
                      .filter((j) =>
                        selectedDay
                          ? j.date === selectedDay
                          : j.date.startsWith(
                              `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
                            ),
                      )
                      .sort((a, b) =>
                        (a.date + a.time).localeCompare(b.date + b.time),
                      ),
                    false,
                    true,
                  )}
                </section>
              </>
            )}
            {view === "settings" && (
              <div className="settings-grid">
                <section className="panel settings">
                  <div className="settings-heading">
                    <Building2 size={18} />
                    <div>
                      <h2>{t.profile}</h2>
                      <p>{t.businessDesc}</p>
                    </div>
                  </div>
                  <div className="avatar-settings">
                    {data.avatar ? (
                      <img
                        className="business-logo"
                        src={data.avatar}
                        alt={data.company}
                        width={70}
                        height={70}
                      />
                    ) : (
                      avatar(data.company, "large")
                    )}
                    <div>
                      <strong>{t.avatar}</strong>
                      <p>{t.avatarHint}</p>
                      <div>
                        <button
                          className="small-button"
                          onClick={() => fileRef.current?.click()}
                        >
                          <Upload size={13} />
                          {t.add}
                        </button>
                        {data.avatar && (
                          <button
                            className="text-button danger-text"
                            onClick={() =>
                              setData((d) => ({ ...d, avatar: undefined }))
                            }
                          >
                            {t.removeAvatar}
                          </button>
                        )}
                      </div>
                      <input
                        hidden
                        type="file"
                        ref={fileRef}
                        accept="image/png,image/jpeg"
                        onChange={uploadAvatar}
                      />
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      setData((d) => ({
                        ...d,
                        company: String(f.get("company")).trim(),
                        phone: String(f.get("phone")).trim(),
                        email: String(f.get("email")).trim(),
                        address: String(f.get("address")).trim(),
                        ice: String(f.get("ice")).trim(),
                      }));
                      setNotice(t.saved);
                    }}
                  >
                    {field(t.companyName, "company", "text", data.company)}
                    <div className="form-row">
                      {field(t.phone, "phone", "tel", data.phone, false)}
                      {field(t.email, "email", "email", data.email, false)}
                    </div>
                    {field(t.address, "address", "text", data.address, false)}
                    {field(t.ice, "ice", "text", data.ice, false)}
                    <div className="settings-form-footer">
                      <span>{t.businessDesc}</span>
                      <button className="primary">
                        <Check size={15} />
                        {t.save}
                      </button>
                    </div>
                  </form>
                </section>
                <div className="settings-column">
                  <section className="panel settings">
                    <div className="settings-heading">
                      <Sun size={18} />
                      <h2>{t.appearance}</h2>
                    </div>
                    <div className="theme-options">
                      <button
                        className={!dark ? "chosen" : ""}
                        onClick={() => setDark(false)}
                      >
                        <Sun size={21} />
                        {t.light}
                        {!dark && <Check size={14} />}
                      </button>
                      <button
                        className={dark ? "chosen" : ""}
                        onClick={() => setDark(true)}
                      >
                        <Moon size={21} />
                        {t.dark}
                        {dark && <Check size={14} />}
                      </button>
                    </div>
                    <label>
                      {t.language}
                      <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Lang)}
                      >
                        <option value="fr">Français</option>
                        <option value="ar">العربية</option>
                      </select>
                    </label>
                  </section>
                  <section className="panel settings">
                    <div className="settings-heading">
                      <ShieldCheck size={18} />
                      <h2>{t.backup}</h2>
                    </div>
                    <p>{user ? t.localDraft : t.localWarning}</p>
                    <button className="secondary wide" onClick={backup}>
                      <Download size={15} />
                      {t.backup}
                    </button>
                    <button
                      className="secondary wide"
                      onClick={() => importRef.current?.click()}
                    >
                      <Upload size={15} />
                      {t.import}
                    </button>
                    <input
                      hidden
                      type="file"
                      ref={importRef}
                      accept="application/json,.json"
                      onChange={restore}
                    />
                    {user && (
                      <>
                        <button
                          className="primary wide"
                          disabled={!dirty || saving}
                          onClick={() => void saveCloud()}
                        >
                          <Cloud size={15} />
                          {t.cloud}
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            setConfirm({
                              title: t.reload,
                              text: t.unsavedReload,
                              run: () => {
                                void load(true);
                              },
                            })
                          }
                        >
                          {t.reload}
                        </button>
                        <hr />
                        <button
                          className="text-button danger-text"
                          onClick={() => void logout()}
                        >
                          <LogOut size={15} />
                          {t.logout}
                        </button>
                      </>
                    )}
                    {!user && supabase && (
                      <button
                        className="primary wide"
                        onClick={() => window.location.reload()}
                      >
                        {t.connection}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </section>
                </div>
              </div>
            )}
            {view === "support" && (
              <div className="help-grid">
                <section className="help-intro">
                  <div className="help-icon">
                    <CircleHelp size={32} />
                  </div>
                  <h2>{t.helpDesc}</h2>
                  <p>{t.onboardingDesc}</p>
                  <button
                    className="primary"
                    onClick={() => navigate("clients")}
                  >
                    {t.clients}
                    <ArrowRight size={15} />
                  </button>
                </section>
                <section className="panel help-list">
                  {[
                    [t.help1, t.help1Text],
                    [t.help2, t.help2Text],
                    [t.help3, t.help3Text],
                    [t.help4, t.help4Text],
                    [t.help5, t.help5Text],
                  ].map(([q, a]) => (
                    <details key={q}>
                      <summary>
                        {q}
                        <Plus size={16} />
                      </summary>
                      <p>{a}</p>
                    </details>
                  ))}
                </section>
              </div>
            )}
          </main>
          <footer>
            <span>
              Khedmti<span className="brand-dot">.</span>{" "}
              <span className="footer-tag">{t.subtitle}</span>
            </span>
            <span>
              {user ? (
                <>
                  <Cloud size={12} />
                  {dirty ? t.changes : t.savedCloud}
                </>
              ) : (
                <>
                  <span className="live-dot" />
                  {t.local}
                </>
              )}
            </span>
          </footer>
        </div>
        {modal && (
          <Modal
            title={
              modal === "preview"
                ? t.printPreview
                : modal === "client"
                  ? edit
                    ? t.edit
                    : t.newClient
                  : modal === "quote"
                    ? edit
                      ? t.edit
                      : t.newQuote
                    : modal === "payment"
                      ? t.payment
                      : edit
                        ? t.edit
                        : t.newJob
            }
            closeLabel={t.close}
            onClose={() => setModal(null)}
            wide={modal === "quote" || modal === "job" || modal === "preview"}
          >
            {modal === "preview" && current ? (
              <>
                <div className="document-preview">{quoteDocument(current)}</div>
                <div className="preview-footer">
                  <button className="secondary" onClick={() => share(current)}>
                    <MessageCircle size={16} />
                    {t.whatsapp}
                  </button>
                  <button
                    className="primary"
                    onClick={() => setPrinted(current)}
                  >
                    <Printer size={16} />
                    {t.print}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="modal-form">
                {modal === "client" ? (
                  <>
                    <div className="form-section-label">{t.client}</div>
                    {field(t.name, "name", "text", currentClient?.name)}
                    <div className="form-row">
                      {field(t.phone, "phone", "tel", currentClient?.phone)}
                      {field(
                        t.email,
                        "email",
                        "email",
                        currentClient?.email,
                        false,
                      )}
                    </div>
                    {field(
                      t.address,
                      "address",
                      "text",
                      currentClient?.address,
                      false,
                    )}
                    <label>
                      {t.notes}
                      <textarea
                        name="notes"
                        defaultValue={currentClient?.notes}
                        rows={3}
                        maxLength={2000}
                      />
                    </label>
                  </>
                ) : modal === "payment" ? (
                  <>
                    <div className="payment-context">
                      <span>{current?.title}</span>
                      <strong>
                        {money(
                          current ? round(current.amount - current.paid) : 0,
                        )}
                      </strong>
                      <small>{t.payable}</small>
                    </div>
                    {field(t.paymentAmount, "payment", "number")}
                    <div className="form-row">
                      {field(t.date, "date", "date", today())}
                      <label>
                        {t.method}
                        <select name="method">
                          <option value="cash">{t.cash}</option>
                          <option value="bank">{t.bank}</option>
                          <option value="card">{t.card}</option>
                          <option value="other">{t.other}</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      {t.notes}
                      <textarea name="notes" rows={2} maxLength={2000} />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="form-section-label">
                      01 <span>{t.details}</span>
                    </div>
                    <div className="form-row">
                      <label>
                        {t.client}
                        <select
                          name="client"
                          required
                          defaultValue={current?.client || ""}
                        >
                          <option value="" disabled>
                            {t.select}
                          </option>
                          {data.clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t.status}
                        <select
                          name="status"
                          defaultValue={
                            current?.status ||
                            (modal === "quote" ? "draft" : "todo")
                          }
                        >
                          {(modal === "quote"
                            ? ["draft", "accepted", "refused"]
                            : ["todo", "doing", "completed"]
                          ).map((s) => (
                            <option key={s} value={s}>
                              {stateLabels[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {field(t.title, "title", "text", current?.title)}
                    <div className="form-row">
                      {field(t.date, "date", "date", current?.date || today())}
                      {modal === "job" ? (
                        field(t.time, "time", "time", current?.time, false)
                      ) : (
                        <div />
                      )}
                    </div>
                    <div className="form-section-label">
                      02 <span>{t.line}</span>
                    </div>
                    <div className="quote-line-labels">
                      <span>{t.line}</span>
                      <span>{t.quantity}</span>
                      <span>{t.unit}</span>
                      <span />
                    </div>
                    <div className="line-items">
                      {items.map((i, index) => (
                        <div className="quote-line" key={i.id}>
                          <input
                            aria-label={`${t.line} ${index + 1}`}
                            placeholder={t.line}
                            required
                            value={i.description}
                            maxLength={500}
                            onChange={(e) =>
                              setItems(
                                items.map((x) =>
                                  x.id === i.id
                                    ? { ...x, description: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <input
                            aria-label={`${t.quantity} ${index + 1}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={i.quantity}
                            onChange={(e) =>
                              setItems(
                                items.map((x) =>
                                  x.id === i.id
                                    ? {
                                        ...x,
                                        quantity:
                                          e.target.value === ""
                                            ? 0
                                            : Number(e.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          <input
                            aria-label={`${t.unit} ${index + 1}`}
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={i.price}
                            onChange={(e) =>
                              setItems(
                                items.map((x) =>
                                  x.id === i.id
                                    ? {
                                        ...x,
                                        price:
                                          e.target.value === ""
                                            ? 0
                                            : Number(e.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            className="icon-button danger-text"
                            disabled={items.length === 1}
                            aria-label={`${t.remove} ${index + 1}`}
                            onClick={() =>
                              setItems(items.filter((x) => x.id !== i.id))
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-button add-line"
                      onClick={() => setItems([...items, newLine()])}
                    >
                      <Plus size={15} />
                      {t.addLine}
                    </button>
                    <div className="quote-calculation">
                      <div className="quote-options">
                        <label>
                          {t.discount}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={discount}
                            onChange={(e) =>
                              setDiscount(Number(e.target.value))
                            }
                          />
                        </label>
                        <label>
                          {t.tax}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            required
                            value={tax}
                            onChange={(e) => setTax(Number(e.target.value))}
                          />
                        </label>
                        {!edit && field(t.paid, "paid", "number", 0)}
                      </div>
                      <div className="calculation-summary">
                        <p>
                          <span>{t.subtotal}</span>
                          <strong>{money(totals(items).subtotal)}</strong>
                        </p>
                        <p>
                          <span>{t.taxAmount}</span>
                          <strong>
                            {money(totals(items, discount, tax).taxAmount)}
                          </strong>
                        </p>
                        <p className="total">
                          <span>{t.total}</span>
                          <strong>
                            {money(totals(items, discount, tax).total)}
                          </strong>
                        </p>
                        {edit && current && (
                          <small>
                            {t.paid}: {money(current.paid)}
                          </small>
                        )}
                      </div>
                    </div>
                    <label>
                      {t.notes}
                      <textarea
                        name="notes"
                        defaultValue={current?.notes}
                        rows={2}
                        maxLength={2000}
                      />
                    </label>
                  </>
                )}
                {formError && (
                  <p className="form-error" role="alert">
                    <AlertCircle size={15} />
                    {formError}
                  </p>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setModal(null)}
                  >
                    {t.cancel}
                  </button>
                  <button className="primary">
                    <Check size={15} />
                    {t.save}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        )}
        {confirm && (
          <Modal
            title={confirm.title}
            closeLabel={t.close}
            onClose={() => setConfirm(null)}
          >
            <div className="confirm-body">
              <div className="confirm-icon">
                <AlertCircle size={24} />
              </div>
              <p>{confirm.text}</p>
              <div className="form-actions">
                <button className="secondary" onClick={() => setConfirm(null)}>
                  {t.cancel}
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    confirm.run();
                    setConfirm(null);
                  }}
                >
                  {t.confirm}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
      {printed && (
        <div className="print-document">{quoteDocument(printed)}</div>
      )}
    </div>
  );
}
