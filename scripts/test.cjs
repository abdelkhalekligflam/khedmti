const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
for (const ext of [".ts", ".tsx"])
  require.extensions[ext] = (module, filename) => {
    const source = fs
      .readFileSync(filename, "utf8")
      .replace(/(["'])@\//g, `$1${root}/src/`);
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    module._compile(out, filename);
  };
const {
  totals,
  addPayment,
  validData,
  nextNumber,
} = require("../src/lib/model.ts");
const legacy = {
  company: "Test",
  phone: "",
  clients: [
    { id: "c", name: "Client", phone: "0600000000", address: "Ouarzazate" },
  ],
  jobs: [
    {
      id: "j",
      client: "c",
      title: "Installation",
      date: "2026-10-07",
      kind: "job",
      status: "todo",
      amount: 1500,
      paid: 500,
    },
  ],
};
test("quote totals apply fixed discount before VAT and round cents", () => {
  assert.deepEqual(
    totals(
      [
        { id: "a", description: "A", quantity: 2, price: 500 },
        { id: "b", description: "B", quantity: 1, price: 200 },
      ],
      100,
      20,
    ),
    { subtotal: 1200, taxAmount: 220, total: 1320 },
  );
  assert.deepEqual(
    totals([{ id: "a", description: "A", quantity: 3, price: 0.1 }]),
    { subtotal: 0.3, taxAmount: 0, total: 0.3 },
  );
});
test("payments preserve history and reject overpayment or invalid values", () => {
  const d = addPayment(legacy, "j", 250, "2026-10-07", "cash", "");
  assert.equal(d.jobs[0].paid, 750);
  assert.equal(d.payments[0].amount, 250);
  assert.equal(legacy.jobs[0].paid, 500);
  for (const n of [0, -1, Infinity, NaN, 1000.01])
    assert.throws(() => addPayment(legacy, "j", n, "2026-10-07", "cash", ""));
  assert.equal(
    addPayment(legacy, "j", 1000, "2026-10-07", "cash", "").jobs[0].paid,
    1500,
  );
});
test("legacy backups remain valid, unsafe or inconsistent backups are rejected", () => {
  assert.equal(validData(legacy), true);
  assert.equal(validData({ ...legacy, avatar: "javascript:alert(1)" }), false);
  assert.equal(
    validData({ ...legacy, jobs: [{ ...legacy.jobs[0], client: "missing" }] }),
    false,
  );
  assert.equal(
    validData({ ...legacy, jobs: [{ ...legacy.jobs[0], paid: 1501 }] }),
    false,
  );
  assert.equal(
    validData({
      ...legacy,
      jobs: [
        {
          ...legacy.jobs[0],
          items: [{ id: "x", description: "A", quantity: 1, price: 100 }],
        },
      ],
    }),
    false,
  );
  assert.equal(
    validData({ ...legacy, clients: [...legacy.clients, ...legacy.clients] }),
    false,
  );
  assert.equal(
    validData({ ...legacy, jobs: [{ ...legacy.jobs[0], date: "2026-99-99" }] }),
    false,
  );
  assert.equal(
    validData({
      ...legacy,
      payments: [
        {
          id: "p",
          jobId: "j",
          amount: 600,
          date: "2026-10-07",
          method: "cash",
          note: "",
        },
      ],
    }),
    false,
  );
});
test("reference numbering does not collide with an existing reference", () => {
  const year = new Date().getFullYear();
  assert.equal(
    nextNumber(
      { ...legacy, jobs: [{ ...legacy.jobs[0], number: `DEV-${year}-0001` }] },
      "quote",
    ),
    `DEV-${year}-0002`,
  );
});
test("local client → detailed quote → intervention → payment flow and reload", async () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  global.FormData = dom.window.FormData;
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLDialogElement = dom.window.HTMLDialogElement;
  global.MutationObserver = dom.window.MutationObserver;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.print = () => {};
  window.open = () => null;
  const React = require("react");
  const {
    render,
    screen,
    fireEvent,
    waitFor,
    cleanup,
  } = require("@testing-library/react");
  const Home = require("../src/app/page.tsx").default;
  render(React.createElement(Home));
  await screen.findByRole("heading", { name: "Une activité bien organisée." });
  fireEvent.click(
    screen.getByRole("button", { name: "Commencer avec un client" }),
  );
  fireEvent.change(screen.getByLabelText("Nom complet"), {
    target: { value: "Client Test" },
  });
  fireEvent.change(screen.getByLabelText("Téléphone", { exact: true }), {
    target: { value: "0600000000" },
  });
  fireEvent.change(screen.getByLabelText("Adresse", { exact: true }), {
    target: { value: "Ouarzazate" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer", exact: true }),
  );
  await waitFor(() =>
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-v1")).clients.length,
      1,
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Nouveau devis", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Client", { exact: true }), {
    target: {
      value: JSON.parse(localStorage.getItem("khedmti-v1")).clients[0].id,
    },
  });
  fireEvent.change(screen.getByLabelText("Prestation / description"), {
    target: { value: "Installation électrique" },
  });
  fireEvent.change(screen.getByLabelText("Prestation 1"), {
    target: { value: "Installation" },
  });
  fireEvent.change(screen.getByLabelText("Qté 1"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Prix unitaire 1"), {
    target: { value: "500" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Ajouter une prestation" }),
  );
  fireEvent.change(screen.getByLabelText("Prestation 2"), {
    target: { value: "Matériel" },
  });
  fireEvent.change(screen.getByLabelText("Prix unitaire 2"), {
    target: { value: "200" },
  });
  fireEvent.change(screen.getByLabelText("Remise (DH)"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByLabelText("TVA (%)"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("Déjà payé (DH)"), {
    target: { value: "320" },
  });
  fireEvent.change(screen.getByLabelText("Statut"), {
    target: { value: "accepted" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer", exact: true }),
  );
  await waitFor(() =>
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-v1")).jobs[0].amount,
      1320,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Devis", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Plus d’actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Créer l’intervention" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmer", exact: true }),
  );
  await waitFor(() =>
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-v1")).jobs.filter(
        (j) => j.kind === "job",
      ).length,
      1,
    ),
  );
  let data = JSON.parse(localStorage.getItem("khedmti-v1"));
  assert.equal(data.jobs.filter((j) => j.kind === "quote").length, 1);
  assert.equal(data.payments.length, 1);
  fireEvent.click(
    screen.getByRole("button", { name: "Paiements", exact: true }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Enregistrer un paiement",
      exact: true,
    }),
  );
  fireEvent.change(screen.getByLabelText("Montant du paiement (DH)"), {
    target: { value: "1001" },
  });
  fireEvent.submit(
    screen.getByLabelText("Montant du paiement (DH)").closest("form"),
  );
  await screen.findByRole("alert");
  assert.equal(
    JSON.parse(localStorage.getItem("khedmti-v1")).jobs.find(
      (j) => j.kind === "job",
    ).paid,
    320,
  );
  fireEvent.change(screen.getByLabelText("Montant du paiement (DH)"), {
    target: { value: "250" },
  });
  fireEvent.submit(
    screen.getByLabelText("Montant du paiement (DH)").closest("form"),
  );
  await waitFor(() =>
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-v1")).jobs.find(
        (j) => j.kind === "job",
      ).paid,
      570,
    ),
  );
  data = JSON.parse(localStorage.getItem("khedmti-v1"));
  assert.equal(validData(data), true);
  assert.equal(data.payments.length, 2);
  assert.equal(
    roundValue(
      data.jobs.find((j) => j.kind === "job").amount -
        data.jobs.find((j) => j.kind === "job").paid,
    ),
    750,
  );
  cleanup();
  render(React.createElement(Home));
  await screen.findByRole("heading", { name: "Une activité bien organisée." });
  assert.equal(JSON.parse(localStorage.getItem("khedmti-v1")).jobs.length, 2);
  fireEvent.click(screen.getByRole("button", { name: "العربية", exact: true }));
  await screen.findByRole("heading", { name: "خدمتك منظمة وبسيطة." });
  assert.equal(document.documentElement.dir, "rtl");
  cleanup();
  dom.window.close();
});
function roundValue(n) {
  return Math.round(n * 100) / 100;
}

test("cloud revision conflicts preserve draft and caches are user-scoped", async () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.MutationObserver = dom.window.MutationObserver;
  Object.defineProperty(global, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  const React = require("react");
  const {
    renderHook,
    act,
    waitFor,
    cleanup,
  } = require("@testing-library/react");
  const mod = require("../src/lib/supabase.ts");
  const original = mod.supabase;
  const rows = new Map();
  const clone = (v) => JSON.parse(JSON.stringify(v));
  mod.supabase = {
    from: () => {
      let mode = "read",
        payload = null;
      const filters = {};
      const query = {
        select() {
          return query;
        },
        eq(k, v) {
          filters[k] = v;
          return query;
        },
        insert(v) {
          mode = "insert";
          payload = v;
          return query;
        },
        update(v) {
          mode = "update";
          payload = v;
          return query;
        },
        async single() {
          return query.maybeSingle();
        },
        async maybeSingle() {
          if (mode === "read")
            return {
              data: rows.has(filters.user_id)
                ? clone(rows.get(filters.user_id))
                : null,
              error: null,
            };
          if (mode === "insert") {
            if (rows.has(payload.user_id))
              return { data: null, error: { message: "Duplicate workspace" } };
            rows.set(
              payload.user_id,
              clone({ payload: payload.payload, revision: 1 }),
            );
            return { data: { revision: 1 }, error: null };
          }
          const row = rows.get(filters.user_id);
          if (!row || row.revision !== filters.revision)
            return { data: null, error: null };
          rows.set(filters.user_id, clone(payload));
          return { data: { revision: payload.revision }, error: null };
        },
      };
      return query;
    },
  };
  const { useWorkspace } = require("../src/lib/use-workspace.ts");
  try {
    const hook = renderHook(() => useWorkspace("owner-a"));
    await waitFor(() => assert.equal(hook.result.current.loaded, true));
    await act(async () => hook.result.current.setData(legacy));
    assert.equal(hook.result.current.dirty, true);
    await act(async () => {
      await hook.result.current.save();
    });
    assert.equal(rows.get("owner-a").revision, 1);
    assert.equal(hook.result.current.dirty, false);
    await act(async () =>
      hook.result.current.setData((d) => ({ ...d, company: "Mon brouillon" })),
    );
    rows.set("owner-a", {
      payload: { ...legacy, company: "Autre session" },
      revision: 2,
    });
    await act(async () => {
      await hook.result.current.save();
    });
    assert.match(hook.result.current.error, /autre session/);
    assert.equal(hook.result.current.dirty, true);
    assert.equal(rows.get("owner-a").payload.company, "Autre session");
    hook.unmount();
    const restored = renderHook(() => useWorkspace("owner-a"));
    await waitFor(() => assert.equal(restored.result.current.loaded, true));
    assert.equal(restored.result.current.data.company, "Mon brouillon");
    assert.equal(restored.result.current.dirty, true);
    assert.match(restored.result.current.error, /brouillon local/);
    await act(async () => {
      await restored.result.current.load(true);
    });
    assert.equal(restored.result.current.data.company, "Autre session");
    assert.equal(restored.result.current.dirty, false);
    restored.unmount();
    const second = renderHook(() => useWorkspace("owner-b"));
    await waitFor(() => assert.equal(second.result.current.loaded, true));
    assert.equal(second.result.current.data.clients.length, 0);
    assert.equal(second.result.current.data.company, "Mon entreprise");
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-user-owner-a")).company,
      "Autre session",
    );
    assert.equal(
      JSON.parse(localStorage.getItem("khedmti-user-owner-b")).clients.length,
      0,
    );
    second.unmount();
  } finally {
    cleanup();
    mod.supabase = original;
    dom.window.close();
  }
});
