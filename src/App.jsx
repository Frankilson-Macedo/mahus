import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

// ===== FIREBASE CONFIG =====
// Substitua com suas credenciais do Firebase Console
  const firebaseConfig = {
    apiKey: "AIzaSyAObFJSulk3zLFYyYM7-M2eOZ2NUKqqaXo",
    authDomain: "mahus-38031.firebaseapp.com",
    projectId: "mahus-38031",
    storageBucket: "mahus-38031.firebasestorage.app",
    messagingSenderId: "300375851172",
    appId: "1:300375851172:web:93af2f814c9c61e43ba631",
    measurementId: "G-Z9BK2JQM08"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== TAMANHOS =====
const TAMANHOS = {
  infantil: ["1 ano","2 anos","3 anos","4 anos","5 anos","6 anos","7 anos","8 anos","9 anos","10 anos"],
  feminino: ["PP","P","M","G","GG","XG","EXG"],
  masculino: ["PP","P","M","G","GG"]
};

const CATEGORIAS_ROUPA = [
  "Vestido","Blusa","Calça","Short","Saia","Conjunto","Macacão",
  "Pijama","Camisa","Bermuda","Moletom","Legging","Body","Outro"
];

const STATUS_PEDIDO = {
  pendente: { label: "Pendente", color: "#f59e0b", bg: "#fef3c7" },
  producao: { label: "Em Produção", color: "#3b82f6", bg: "#dbeafe" },
  pronto: { label: "Pronto", color: "#10b981", bg: "#d1fae5" },
  entregue: { label: "Entregue", color: "#6b7280", bg: "#f3f4f6" },
  cancelado: { label: "Cancelado", color: "#ef4444", bg: "#fee2e2" }
};

// ===== HELPERS =====
const fmt = (v) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0,00";
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR");
};

// ===== ITEM DO PEDIDO =====
function ItemRow({ item, onChange, onRemove }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#fafafa" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <select value={item.categoria} onChange={e => onChange("categoria", e.target.value)}
          style={sel}>
          <option value="">Tipo de roupa</option>
          {CATEGORIAS_ROUPA.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={item.genero} onChange={e => onChange("genero", e.target.value)} style={sel}>
          <option value="">Gênero</option>
          <option value="infantil">Infantil</option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </select>
        {item.genero && (
          <select value={item.tamanho} onChange={e => onChange("tamanho", e.target.value)} style={sel}>
            <option value="">Tamanho</option>
            {TAMANHOS[item.genero]?.map(t => <option key={t}>{t}</option>)}
          </select>
        )}
        <input type="number" placeholder="Qtd" min={1} value={item.qtd}
          onChange={e => onChange("qtd", Number(e.target.value))}
          style={{ ...inp, width: 56 }} />
        <input type="number" placeholder="R$ Valor un." step="0.01" value={item.valor}
          onChange={e => onChange("valor", e.target.value)}
          style={{ ...inp, width: 96 }} />
        <button onClick={onRemove} style={{ ...btnDanger, padding: "4px 10px", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <input placeholder="Observação (cor, detalhe, bordado...)" value={item.obs}
        onChange={e => onChange("obs", e.target.value)}
        style={{ ...inp, width: "100%", fontSize: 13 }} />
    </div>
  );
}

// ===== MODAL CLIENTE =====
function ClienteModal({ cliente, onSave, onClose }) {
  const [form, setForm] = useState(cliente || { nome: "", telefone: "", endereco: "", obs: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Overlay onClose={onClose}>
      <h2 style={modalTitle}>{cliente ? "Editar Cliente" : "Novo Cliente"}</h2>
      <label style={lbl}>Nome *</label>
      <input value={form.nome} onChange={e => set("nome", e.target.value)} style={inp} placeholder="Nome completo" />
      <label style={lbl}>Telefone / WhatsApp</label>
      <input value={form.telefone} onChange={e => set("telefone", e.target.value)} style={inp} placeholder="(00) 00000-0000" />
      <label style={lbl}>Endereço</label>
      <input value={form.endereco} onChange={e => set("endereco", e.target.value)} style={inp} placeholder="Rua, número..." />
      <label style={lbl}>Observações</label>
      <textarea value={form.obs} onChange={e => set("obs", e.target.value)} style={{ ...inp, height: 72, resize: "vertical" }} placeholder="Medidas especiais, preferências..." />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={() => { if (!form.nome.trim()) return alert("Informe o nome"); onSave(form); }} style={btnPrimary}>Salvar</button>
      </div>
    </Overlay>
  );
}

// ===== MODAL PEDIDO =====
function PedidoModal({ pedido, clientes, onSave, onClose }) {
  const novoItem = () => ({ id: Date.now(), categoria: "", genero: "", tamanho: "", qtd: 1, valor: "", obs: "" });
  const [form, setForm] = useState(pedido || {
    clienteId: "", status: "pendente", prazo: "", entrada: "", itens: [novoItem()], obs: ""
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setItem = (idx, k, v) => setForm(p => {
    const itens = [...p.itens];
    itens[idx] = { ...itens[idx], [k]: v };
    return { ...p, itens };
  });
  const addItem = () => setForm(p => ({ ...p, itens: [...p.itens, novoItem()] }));
  const removeItem = (idx) => setForm(p => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));
  const total = form.itens.reduce((s, i) => s + (Number(i.valor) || 0) * (Number(i.qtd) || 0), 0);

  return (
    <Overlay onClose={onClose}>
      <h2 style={modalTitle}>{pedido ? "Editar Pedido" : "Novo Pedido"}</h2>
      <label style={lbl}>Cliente *</label>
      <select value={form.clienteId} onChange={e => set("clienteId", e.target.value)} style={sel}>
        <option value="">Selecione o cliente</option>
        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={lbl}>Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} style={sel}>
            {Object.entries(STATUS_PEDIDO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={lbl}>Prazo de entrega</label>
          <input type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} style={inp} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={lbl}>Entrada (R$)</label>
          <input type="number" step="0.01" placeholder="0,00" value={form.entrada}
            onChange={e => set("entrada", e.target.value)} style={inp} />
        </div>
      </div>
      <label style={lbl}>Itens do Pedido</label>
      {form.itens.map((item, idx) => (
        <ItemRow key={item.id} item={item}
          onChange={(k, v) => setItem(idx, k, v)}
          onRemove={() => removeItem(idx)} />
      ))}
      <button onClick={addItem} style={{ ...btnGhost, marginBottom: 8, width: "100%", fontSize: 14 }}>+ Adicionar item</button>
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#166534" }}>Total do pedido: </span>
        <strong style={{ fontSize: 16, color: "#166534" }}>{fmt(total)}</strong>
        {form.entrada > 0 && (
          <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>
            · Saldo: {fmt(total - Number(form.entrada))}
          </span>
        )}
      </div>
      <label style={lbl}>Observações gerais do pedido</label>
      <textarea value={form.obs} onChange={e => set("obs", e.target.value)}
        style={{ ...inp, height: 60, resize: "vertical" }} placeholder="Anotações sobre o pedido..." />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={() => {
          if (!form.clienteId) return alert("Selecione o cliente");
          if (form.itens.length === 0) return alert("Adicione pelo menos um item");
          onSave({ ...form, total });
        }} style={btnPrimary}>Salvar Pedido</button>
      </div>
    </Overlay>
  );
}

// ===== OVERLAY =====
function Overlay({ children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 0 40px"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 20, width: "92vw", maxWidth: 520,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: "auto"
      }}>
        {children}
      </div>
    </div>
  );
}

// ===== TELA CLIENTES =====
function TelaClientes({ clientes, onAdd, onEdit, onDelete }) {
  const [busca, setBusca] = useState("");
  const filtrados = clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca));
  return (
    <div>
      <div style={topBar}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar cliente..." style={{ ...inp, flex: 1 }} />
        <button onClick={onAdd} style={btnPrimary}>+ Novo</button>
      </div>
      {filtrados.length === 0 && <Empty texto="Nenhum cliente encontrado" />}
      {filtrados.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={cardTitle}>{c.nome}</div>
              {c.telefone && <div style={cardSub}>📱 {c.telefone}</div>}
              {c.endereco && <div style={cardSub}>📍 {c.endereco}</div>}
              {c.obs && <div style={{ ...cardSub, fontStyle: "italic", marginTop: 4 }}>{c.obs}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onEdit(c)} style={btnIcon}>✏️</button>
              <button onClick={() => { if (window.confirm("Excluir cliente?")) onDelete(c.id); }} style={btnIcon}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== TELA PEDIDOS =====
function TelaPedidos({ pedidos, clientes, onAdd, onEdit, onDelete, onStatus }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const getNome = (id) => clientes.find(c => c.id === id)?.nome ?? "Cliente";
  const filtrados = pedidos.filter(p => {
    const nome = getNome(p.clienteId).toLowerCase();
    const matchBusca = nome.includes(busca.toLowerCase()) || p.obs?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div>
      <div style={topBar}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar pedido..." style={{ ...inp, flex: 1 }} />
        <button onClick={onAdd} style={btnPrimary}>+ Novo</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setFiltroStatus("todos")} style={filtroStatus === "todos" ? chipAtivo : chip}>Todos</button>
        {Object.entries(STATUS_PEDIDO).map(([k, v]) => (
          <button key={k} onClick={() => setFiltroStatus(k)}
            style={filtroStatus === k ? { ...chipAtivo, background: v.bg, color: v.color, borderColor: v.color } : chip}>
            {v.label}
          </button>
        ))}
      </div>
      {filtrados.length === 0 && <Empty texto="Nenhum pedido encontrado" />}
      {filtrados.map(p => {
        const s = STATUS_PEDIDO[p.status];
        return (
          <div key={p.id} style={{ ...card, borderLeft: `4px solid ${s.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={cardTitle}>{getNome(p.clienteId)}</span>
                  <span style={{ ...badge, background: s.bg, color: s.color }}>{s.label}</span>
                </div>
                <div style={cardSub}>
                  📅 {p.prazo ? `Prazo: ${p.prazo}` : "Sem prazo"} · {p.itens?.length || 0} iten(s)
                </div>
                {p.itens?.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#374151", marginTop: 2, paddingLeft: 8, borderLeft: "2px solid #e5e7eb" }}>
                    {[item.categoria, item.genero && `(${item.genero})`, item.tamanho, item.qtd > 1 && `x${item.qtd}`].filter(Boolean).join(" ")}
                    {item.valor && ` — ${fmt(Number(item.valor) * Number(item.qtd))}`}
                    {item.obs && <span style={{ color: "#9ca3af" }}> · {item.obs}</span>}
                  </div>
                ))}
                <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>{fmt(p.total)}</span>
                  {p.entrada > 0 && <span style={{ fontSize: 12, color: "#6b7280" }}>Entrada: {fmt(Number(p.entrada))} · Saldo: {fmt(p.total - Number(p.entrada))}</span>}
                </div>
                {p.obs && <div style={{ ...cardSub, fontStyle: "italic", marginTop: 4 }}>{p.obs}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                <button onClick={() => onEdit(p)} style={btnIcon}>✏️</button>
                <button onClick={() => { if (window.confirm("Excluir pedido?")) onDelete(p.id); }} style={btnIcon}>🗑️</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px solid #f3f4f6" }}>
              {Object.entries(STATUS_PEDIDO).filter(([k]) => k !== p.status).map(([k, v]) => (
                <button key={k} onClick={() => onStatus(p.id, k)}
                  style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${v.color}`, background: v.bg, color: v.color, cursor: "pointer" }}>
                  → {v.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== DASHBOARD =====
function Dashboard({ pedidos, clientes }) {
  const total = pedidos.reduce((s, p) => s + (p.total || 0), 0);
  const entregues = pedidos.filter(p => p.status === "entregue").reduce((s, p) => s + (p.total || 0), 0);
  const pendentes = pedidos.filter(p => ["pendente", "producao", "pronto"].includes(p.status));
  const aReceber = pendentes.reduce((s, p) => s + Math.max(0, (p.total || 0) - (Number(p.entrada) || 0)), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <StatCard titulo="Total de pedidos" valor={pedidos.length} sub="pedidos cadastrados" cor="#4f46e5" />
        <StatCard titulo="Clientes" valor={clientes.length} sub="cadastrados" cor="#0891b2" />
        <StatCard titulo="Faturamento" valor={fmt(total)} sub="valor total" cor="#059669" />
        <StatCard titulo="A receber" valor={fmt(aReceber)} sub="saldo pendente" cor="#d97706" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>Pedidos por status</div>
        {Object.entries(STATUS_PEDIDO).map(([k, v]) => {
          const count = pedidos.filter(p => p.status === k).length;
          const pct = pedidos.length ? Math.round((count / pedidos.length) * 100) : 0;
          return (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 13, color: v.color }}>{v.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: v.color, borderRadius: 3, transition: "width .4s" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>Últimos pedidos</div>
        {pedidos.slice(0, 5).map(p => {
          const s = STATUS_PEDIDO[p.status];
          const cliente = clientes.find(c => c.id === p.clienteId);
          return (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{cliente?.nome ?? "—"}</div>
                <span style={{ ...badge, background: s.bg, color: s.color }}>{s.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>{fmt(p.total)}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(p.criadoEm)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ titulo, valor, sub, cor }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", borderTop: `4px solid ${cor}` }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{valor}</div>
      <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>
    </div>
  );
}

function Empty({ texto }) {
  return <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
    <div style={{ fontSize: 40, marginBottom: 8 }}>🧵</div>
    {texto}
  </div>;
}

// ===== APP PRINCIPAL =====
export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [modalCliente, setModalCliente] = useState(null); // null | "novo" | objeto
  const [modalPedido, setModalPedido] = useState(null);

  useEffect(() => {
    const q1 = query(collection(db, "clientes"), orderBy("nome"));
    const q2 = query(collection(db, "pedidos"), orderBy("criadoEm", "desc"));
    const u1 = onSnapshot(q1, s => setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(q2, s => setPedidos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const salvarCliente = async (form) => {
    const data = { nome: form.nome, telefone: form.telefone || "", endereco: form.endereco || "", obs: form.obs || "" };
    if (modalCliente?.id) await updateDoc(doc(db, "clientes", modalCliente.id), data);
    else await addDoc(collection(db, "clientes"), { ...data, criadoEm: serverTimestamp() });
    setModalCliente(null);
  };

  const excluirCliente = async (id) => {
    await deleteDoc(doc(db, "clientes", id));
  };

  const salvarPedido = async (form) => {
    const data = {
      clienteId: form.clienteId, status: form.status, prazo: form.prazo || "",
      entrada: Number(form.entrada) || 0, itens: form.itens, total: form.total,
      obs: form.obs || "", atualizadoEm: serverTimestamp()
    };
    if (modalPedido?.id) await updateDoc(doc(db, "pedidos", modalPedido.id), data);
    else await addDoc(collection(db, "pedidos"), { ...data, criadoEm: serverTimestamp() });
    setModalPedido(null);
  };

  const excluirPedido = async (id) => {
    await deleteDoc(doc(db, "pedidos", id));
  };

  const mudarStatus = async (id, status) => {
    await updateDoc(doc(db, "pedidos", id), { status, atualizadoEm: serverTimestamp() });
  };

  const abas = [
    { key: "dashboard", icon: "📊", label: "Resumo" },
    { key: "pedidos", icon: "🧵", label: "Pedidos" },
    { key: "clientes", icon: "👥", label: "Clientes" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 540, margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#7c3aed", color: "#fff", padding: "14px 16px 10px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>✂️ Confecção</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Gerenciamento de pedidos</div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: "12px 12px 80px" }}>
        {aba === "dashboard" && <Dashboard pedidos={pedidos} clientes={clientes} />}
        {aba === "clientes" && (
          <TelaClientes clientes={clientes}
            onAdd={() => setModalCliente("novo")}
            onEdit={c => setModalCliente(c)}
            onDelete={excluirCliente} />
        )}
        {aba === "pedidos" && (
          <TelaPedidos pedidos={pedidos} clientes={clientes}
            onAdd={() => setModalPedido("novo")}
            onEdit={p => setModalPedido(p)}
            onDelete={excluirPedido}
            onStatus={mudarStatus} />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", maxWidth: 540, width: "100%" }}>
          {abas.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              style={{
                flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer",
                borderTop: aba === a.key ? "3px solid #7c3aed" : "3px solid transparent",
                color: aba === a.key ? "#7c3aed" : "#6b7280"
              }}>
              <div style={{ fontSize: 22 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: aba === a.key ? 600 : 400 }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      {modalCliente && (
        <ClienteModal
          cliente={modalCliente === "novo" ? null : modalCliente}
          onSave={salvarCliente}
          onClose={() => setModalCliente(null)} />
      )}
      {modalPedido && (
        <PedidoModal
          pedido={modalPedido === "novo" ? null : modalPedido}
          clientes={clientes}
          onSave={salvarPedido}
          onClose={() => setModalPedido(null)} />
      )}
    </div>
  );
}

// ===== ESTILOS BASE =====
const inp = { border: "1px solid #d1d5db", borderRadius: 7, padding: "8px 10px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff" };
const sel = { ...inp, cursor: "pointer" };
const lbl = { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, marginTop: 10 };
const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 10 };
const cardTitle = { fontSize: 15, fontWeight: 600, color: "#111827" };
const cardSub = { fontSize: 12, color: "#6b7280", marginTop: 2 };
const badge = { fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, display: "inline-block" };
const btnPrimary = { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnGhost = { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 16px", fontSize: 14, cursor: "pointer" };
const btnDanger = { background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const btnIcon = { background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 16 };
const topBar = { display: "flex", gap: 8, marginBottom: 12 };
const chip = { fontSize: 12, padding: "4px 10px", borderRadius: 20, border: "1px solid #d1d5db", background: "#fff", color: "#6b7280", cursor: "pointer" };
const chipAtivo = { ...chip, background: "#7c3aed", color: "#fff", borderColor: "#7c3aed", fontWeight: 600 };
const modalTitle = { fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 12px" };
