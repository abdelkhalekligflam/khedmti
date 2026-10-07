export type Client = {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  notes?: string;
};
export type Line = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};
export type Payment = {
  id: string;
  jobId: string;
  amount: number;
  date: string;
  method: string;
  note: string;
};
export type Job = {
  id: string;
  client: string;
  title: string;
  date: string;
  status: string;
  amount: number;
  paid: number;
  kind: "quote" | "job";
  items?: Line[];
  tax?: number;
  discount?: number;
  notes?: string;
  number?: string;
  time?: string;
  quoteId?: string;
};
export type Data = {
  clients: Client[];
  jobs: Job[];
  company: string;
  phone: string;
  email?: string;
  address?: string;
  ice?: string;
  payments?: Payment[];
  avatar?: string;
};
export const initial: Data = {
  clients: [],
  jobs: [],
  payments: [],
  company: "Mon entreprise",
  phone: "",
};
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function totals(items: Line[], discount = 0, tax = 0) {
  const subtotal = round(
    items.reduce((a, i) => a + round(i.quantity * i.price), 0),
  );
  const base = Math.max(0, round(subtotal - discount));
  return {
    subtotal,
    taxAmount: round((base * tax) / 100),
    total: round(base + round((base * tax) / 100)),
  };
}
export function validData(value: unknown): value is Data {
  if (!value || typeof value !== "object") return false;
  const d = value as Data;
  const text = (s: unknown) => s === undefined || typeof s === "string";
  if (
    typeof d.company !== "string" ||
    typeof d.phone !== "string" ||
    ![d.email, d.address, d.ice].every(text)
  )
    return false;
  if (
    d.avatar !== undefined &&
    (typeof d.avatar !== "string" ||
      d.avatar.length > 1500000 ||
      !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(d.avatar))
  )
    return false;
  if (
    !Array.isArray(d.clients) ||
    !Array.isArray(d.jobs) ||
    d.clients.length > 20000 ||
    d.jobs.length > 20000
  )
    return false;
  const clients = d.clients.every(
    (c) =>
      c &&
      typeof c.id === "string" &&
      typeof c.name === "string" &&
      typeof c.phone === "string" &&
      typeof c.address === "string" &&
      [c.email, c.notes].every(text),
  );
  if (!clients || new Set(d.clients.map((c) => c.id)).size !== d.clients.length)
    return false;
  const jobs = d.jobs.every((j) => {
    if (
      !j ||
      typeof j.id !== "string" ||
      !d.clients.some((c) => c.id === j.client) ||
      typeof j.title !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(j.date) ||
      Number.isNaN(new Date(j.date + "T12:00:00").getTime()) ||
      !["quote", "job"].includes(j.kind)
    )
      return false;
    if (
      !(
        j.kind === "quote"
          ? ["draft", "accepted", "refused"]
          : ["todo", "doing", "completed"]
      ).includes(j.status) ||
      ![j.notes, j.time, j.number, j.quoteId].every(text)
    )
      return false;
    if (
      !Number.isFinite(j.amount) ||
      !Number.isFinite(j.paid) ||
      j.amount < 0 ||
      j.paid < 0 ||
      j.paid > j.amount
    )
      return false;
    if (
      j.tax !== undefined &&
      (!Number.isFinite(j.tax) || j.tax < 0 || j.tax > 100)
    )
      return false;
    if (
      j.discount !== undefined &&
      (!Number.isFinite(j.discount) || j.discount < 0)
    )
      return false;
    if (j.items) {
      if (
        !Array.isArray(j.items) ||
        !j.items.length ||
        j.items.length > 500 ||
        !j.items.every(
          (i) =>
            i &&
            typeof i.id === "string" &&
            typeof i.description === "string" &&
            Number.isFinite(i.quantity) &&
            i.quantity > 0 &&
            Number.isFinite(i.price) &&
            i.price >= 0,
        )
      )
        return false;
      if (
        (j.discount || 0) > totals(j.items).subtotal ||
        totals(j.items, j.discount, j.tax).total !== round(j.amount)
      )
        return false;
    }
    return true;
  });
  if (!jobs || new Set(d.jobs.map((j) => j.id)).size !== d.jobs.length)
    return false;
  if (d.payments !== undefined) {
    if (
      !Array.isArray(d.payments) ||
      !d.payments.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          d.jobs.some((j) => j.id === p.jobId && j.kind === "job") &&
          Number.isFinite(p.amount) &&
          p.amount > 0 &&
          /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
          typeof p.method === "string" &&
          typeof p.note === "string",
      )
    )
      return false;
    if (
      new Set(d.payments.map((p) => p.id)).size !== d.payments.length ||
      d.jobs.some(
        (j) =>
          round(
            d
              .payments!.filter((p) => p.jobId === j.id)
              .reduce((s, p) => s + p.amount, 0),
          ) > round(j.paid),
      )
    )
      return false;
  }
  return true;
}
export function nextNumber(data: Data, kind: Job["kind"]) {
  const prefix = kind === "quote" ? "DEV" : "INT";
  const year = new Date().getFullYear();
  let n = 1;
  while (
    data.jobs.some(
      (j) => j.number === `${prefix}-${year}-${String(n).padStart(4, "0")}`,
    )
  )
    n++;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}
export function addPayment(
  data: Data,
  id: string,
  amount: number,
  date: string,
  method: string,
  note: string,
): Data {
  const job = data.jobs.find((j) => j.id === id && j.kind === "job");
  amount = round(amount);
  if (
    !job ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > round(job.amount - job.paid)
  )
    throw new Error("payment");
  return {
    ...data,
    jobs: data.jobs.map((j) =>
      j.id === id ? { ...j, paid: round(j.paid + amount) } : j,
    ),
    payments: [
      ...(data.payments || []),
      { id: crypto.randomUUID(), jobId: id, amount, date, method, note },
    ],
  };
}
