import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

const CLOUDINARY_CLOUD = "djmteuybt";
const CLOUDINARY_UPLOAD_PRESET = "mahus_unsigned";

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

const TAMANHOS = {
  infantil: ["1 ano","2 anos","3 anos","4 anos","5 anos","6 anos","7 anos","8 anos","9 anos","10 anos"],
  feminino: ["PP","P","M","G","GG","XG","EXG"],
  masculino: ["PP","P","M","G","GG"]
};
const CATEGORIAS_ROUPA = ["Camisa","Camisa Baby Look","Calça","Short","Short-Saia","Outros"];
const STATUS_PEDIDO = {
  pendente:  { label: "Pendente",    color: "#f59e0b", bg: "#fef3c7" },
  producao:  { label: "Em Produção", color: "#3b82f6", bg: "#dbeafe" },
  pronto:    { label: "Pronto",      color: "#10b981", bg: "#d1fae5" },
  entregue:  { label: "Entregue",    color: "#6b7280", bg: "#f3f4f6" },
  cancelado: { label: "Cancelado",   color: "#ef4444", bg: "#fee2e2" }
};
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);

// Pega a data de referência de um pedido (dataPedido preferido, fallback criadoEm)
function getDataPedido(p) {
  if (p.dataPedido) return new Date(p.dataPedido + "T12:00:00");
  if (p.criadoEm?.toDate) return p.criadoEm.toDate();
  return null;
}

// ── ItemRow ───────────────────────────────────────────────────────────────────
function ItemRow({ item, onChange, onRemove }) {
  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:10, marginBottom:8, background:"#fafafa" }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
        <select value={item.categoria} onChange={e=>onChange("categoria",e.target.value)} style={sel}>
          <option value="">Tipo de roupa</option>
          {CATEGORIAS_ROUPA.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={item.genero} onChange={e=>onChange("genero",e.target.value)} style={sel}>
          <option value="">Gênero</option>
          <option value="infantil">Infantil</option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
        </select>
        {item.genero && (
          <select value={item.tamanho} onChange={e=>onChange("tamanho",e.target.value)} style={sel}>
            <option value="">Tamanho</option>
            {TAMANHOS[item.genero]?.map(t=><option key={t}>{t}</option>)}
          </select>
        )}
        <input type="number" placeholder="Qtd" min={1} value={item.qtd}
          onChange={e=>onChange("qtd",Number(e.target.value))} style={{...inp,width:56}} />
        <input type="number" placeholder="R$ un." step="0.01" value={item.valor}
          onChange={e=>onChange("valor",e.target.value)} style={{...inp,width:90}} />
        <button onClick={onRemove} style={{...btnDanger,padding:"4px 10px",fontSize:18,lineHeight:1}}>×</button>
      </div>
      <input placeholder="Obs: cor, bordado, detalhe..." value={item.obs}
        onChange={e=>onChange("obs",e.target.value)} style={{...inp,width:"100%",fontSize:13}} />
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function Overlay({ children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,
      display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0 40px" }}>
      <div style={{ background:"#fff",borderRadius:12,padding:20,width:"92vw",maxWidth:520,
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)",margin:"auto" }}>
        {children}
      </div>
    </div>
  );
}

// ── ClienteModal ──────────────────────────────────────────────────────────────
function ClienteModal({ cliente, onSave, onClose }) {
  const [form, setForm] = useState(cliente || { nome:"", telefone:"", endereco:"", obs:"" });
  const [salvando, setSalvando] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const handleSave = async () => {
    if (!form.nome.trim()) return alert("Informe o nome");
    setSalvando(true);
    try { await onSave(form); } finally { setSalvando(false); }
  };
  return (
    <Overlay>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={modalTitle}>{cliente?"Editar Cliente":"Novo Cliente"}</h2>
        <button onClick={onClose} style={btnX}>✕</button>
      </div>
      <label style={lbl}>Nome *</label>
      <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={inp} placeholder="Nome completo" />
      <label style={lbl}>Telefone / WhatsApp</label>
      <input value={form.telefone} onChange={e=>set("telefone",e.target.value)} style={inp} placeholder="(00) 00000-0000" />
      <label style={lbl}>Endereço</label>
      <input value={form.endereco} onChange={e=>set("endereco",e.target.value)} style={inp} placeholder="Rua, número..." />
      <label style={lbl}>Observações</label>
      <textarea value={form.obs} onChange={e=>set("obs",e.target.value)} style={{...inp,height:72,resize:"vertical"}} placeholder="Medidas especiais, preferências..." />
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={handleSave} style={btnPrimary} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
      </div>
    </Overlay>
  );
}

// ── PedidoModal ───────────────────────────────────────────────────────────────
function PedidoModal({ pedido, clientes, onSave, onClose }) {
  const novoItem = () => ({ id:Date.now(), categoria:"", genero:"", tamanho:"", qtd:1, valor:"", obs:"" });
  const [form, setForm] = useState(pedido || {
    clienteId:"", status:"pendente", dataPedido:hoje(), prazo:"",
    entrada:"", itens:[novoItem()], obs:"", imagemUrl:""
  });
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const fileRef = useRef();

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const setItem = (idx,k,v) => setForm(p=>{ const itens=[...p.itens]; itens[idx]={...itens[idx],[k]:v}; return {...p,itens}; });
  const addItem = () => setForm(p=>({...p,itens:[...p.itens,novoItem()]}));
  const removeItem = (idx) => setForm(p=>({...p,itens:p.itens.filter((_,i)=>i!==idx)}));
  const total = form.itens.reduce((s,i)=>s+(Number(i.valor)||0)*(Number(i.qtd)||0),0);

  const handleImagem = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setUploadando(true);
    try {
      const fd = new FormData();
      fd.append("file",file); fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:"POST",body:fd});
      const data = await res.json();
      if (data.secure_url) set("imagemUrl",data.secure_url);
      else alert("Verifique o upload preset no Cloudinary.");
    } catch(err) { alert("Erro: "+err.message); }
    setUploadando(false);
  };

  const handleSave = async () => {
    if (!form.clienteId) return alert("Selecione o cliente");
    if (form.itens.length===0) return alert("Adicione pelo menos um item");
    setSalvando(true);
    try { await onSave({...form,total}); } finally { setSalvando(false); }
  };

  return (
    <Overlay>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h2 style={modalTitle}>{pedido?"Editar Pedido":"Novo Pedido"}</h2>
        <button onClick={onClose} style={btnX}>✕</button>
      </div>
      <label style={lbl}>Cliente *</label>
      <select value={form.clienteId} onChange={e=>set("clienteId",e.target.value)} style={sel}>
        <option value="">Selecione o cliente</option>
        {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"8px 0"}}>
        <div style={{flex:1,minWidth:120}}>
          <label style={lbl}>Status</label>
          <select value={form.status} onChange={e=>set("status",e.target.value)} style={sel}>
            {Object.entries(STATUS_PEDIDO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{flex:1,minWidth:120}}>
          <label style={lbl}>📋 Data do pedido</label>
          <input type="date" value={form.dataPedido} onChange={e=>set("dataPedido",e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        <div style={{flex:1,minWidth:120}}>
          <label style={lbl}>📅 Prazo de entrega</label>
          <input type="date" value={form.prazo} onChange={e=>set("prazo",e.target.value)} style={inp} />
        </div>
        <div style={{flex:1,minWidth:120}}>
          <label style={lbl}>Entrada (R$)</label>
          <input type="number" step="0.01" placeholder="0,00" value={form.entrada}
            onChange={e=>set("entrada",e.target.value)} style={inp} />
        </div>
      </div>
      <label style={lbl}>Foto de referência</label>
      <div style={{marginBottom:10}}>
        {form.imagemUrl ? (
          <div style={{position:"relative",display:"inline-block",width:"100%"}}>
            <img src={form.imagemUrl} alt="ref" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:8,border:"1px solid #e5e7eb"}} />
            <button onClick={()=>set("imagemUrl","")} style={{position:"absolute",top:6,right:6,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontWeight:700,fontSize:14,lineHeight:1}}>×</button>
          </div>
        ) : (
          <button onClick={()=>fileRef.current.click()} style={{...btnGhost,width:"100%",fontSize:13,padding:"10px 0"}} disabled={uploadando}>
            {uploadando?"Enviando...":"📷 Selecionar imagem"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImagem} style={{display:"none"}} />
      </div>
      <label style={lbl}>Itens do Pedido</label>
      {form.itens.map((item,idx)=>(
        <ItemRow key={item.id} item={item} onChange={(k,v)=>setItem(idx,k,v)} onRemove={()=>removeItem(idx)} />
      ))}
      <button onClick={addItem} style={{...btnGhost,marginBottom:8,width:"100%",fontSize:14}}>+ Adicionar item</button>
      <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 12px",marginBottom:8}}>
        <span style={{fontSize:13,color:"#166534"}}>Total: </span>
        <strong style={{fontSize:16,color:"#166534"}}>{fmt(total)}</strong>
        {Number(form.entrada)>0 && <span style={{fontSize:13,color:"#6b7280",marginLeft:8}}>· Saldo: {fmt(total-Number(form.entrada))}</span>}
      </div>
      <label style={lbl}>Observações gerais</label>
      <textarea value={form.obs} onChange={e=>set("obs",e.target.value)} style={{...inp,height:60,resize:"vertical"}} placeholder="Anotações sobre o pedido..." />
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={handleSave} style={btnPrimary} disabled={salvando}>{salvando?"Salvando...":"Salvar Pedido"}</button>
      </div>
    </Overlay>
  );
}

// ── HistoricoModal ────────────────────────────────────────────────────────────
function HistoricoModal({ cliente, pedidos, onClose }) {
  const pedidosCliente = pedidos.filter(p=>p.clienteId===cliente.id);
  const totalGasto = pedidosCliente.reduce((s,p)=>s+(p.total||0),0);
  return (
    <Overlay>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <h2 style={modalTitle}>Histórico de Pedidos</h2>
          <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{cliente.nome}</div>
        </div>
        <button onClick={onClose} style={btnX}>✕</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1,background:"#f5f3ff",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#7c3aed"}}>{pedidosCliente.length}</div>
          <div style={{fontSize:12,color:"#7c3aed"}}>pedidos</div>
        </div>
        <div style={{flex:1,background:"#f0fdf4",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{fmt(totalGasto)}</div>
          <div style={{fontSize:12,color:"#166534"}}>total gasto</div>
        </div>
      </div>
      {pedidosCliente.length===0 && <Empty texto="Nenhum pedido encontrado" />}
      {pedidosCliente.map(p=>{
        const s=STATUS_PEDIDO[p.status];
        return (
          <div key={p.id} style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",marginBottom:8,borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
              <div>
                <span style={{...badge,background:s.bg,color:s.color}}>{s.label}</span>
                {p.dataPedido && <span style={{fontSize:11,color:"#9ca3af",marginLeft:6}}>📋 {p.dataPedido}</span>}
              </div>
              <span style={{fontSize:15,fontWeight:700,color:"#166534"}}>{fmt(p.total)}</span>
            </div>
            {p.prazo && <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>📅 Prazo: {p.prazo}</div>}
            {p.itens?.map((item,i)=>(
              <div key={i} style={{fontSize:12,color:"#374151",paddingLeft:8,borderLeft:"2px solid #e5e7eb",marginBottom:2}}>
                {[item.categoria,item.genero&&`(${item.genero})`,item.tamanho,item.qtd>1&&`x${item.qtd}`].filter(Boolean).join(" ")}
                {item.valor&&` — ${fmt(Number(item.valor)*Number(item.qtd))}`}
                {item.obs&&<span style={{color:"#9ca3af"}}> · {item.obs}</span>}
              </div>
            ))}
            {p.entrada>0&&<div style={{fontSize:12,color:"#6b7280",marginTop:4}}>Entrada: {fmt(Number(p.entrada))} · Saldo: {fmt(p.total-Number(p.entrada))}</div>}
            {p.obs&&<div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",marginTop:4}}>{p.obs}</div>}
            {p.imagemUrl&&<img src={p.imagemUrl} alt="ref" style={{marginTop:6,width:"100%",maxHeight:120,objectFit:"cover",borderRadius:6}} />}
          </div>
        );
      })}
    </Overlay>
  );
}

// ── TelaClientes ──────────────────────────────────────────────────────────────
function TelaClientes({ clientes, pedidos, onAdd, onEdit, onDelete }) {
  const [busca, setBusca] = useState("");
  const [historico, setHistorico] = useState(null);
  const filtrados = clientes.filter(c=>c.nome.toLowerCase().includes(busca.toLowerCase())||c.telefone?.includes(busca));
  return (
    <div>
      <div style={topBar}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar cliente..." style={{...inp,flex:1}} />
        <button onClick={onAdd} style={btnPrimary}>+ Novo</button>
      </div>
      {filtrados.length===0&&<Empty texto="Nenhum cliente encontrado" />}
      {filtrados.map(c=>{
        const qtdPedidos=pedidos.filter(p=>p.clienteId===c.id).length;
        return (
          <div key={c.id} style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={cardTitle}>{c.nome}</div>
                {c.telefone&&<div style={cardSub}>📱 {c.telefone}</div>}
                {c.endereco&&<div style={cardSub}>📍 {c.endereco}</div>}
                {c.obs&&<div style={{...cardSub,fontStyle:"italic",marginTop:4}}>{c.obs}</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>onEdit(c)} style={btnIcon}>✏️</button>
                <button onClick={()=>{if(window.confirm("Excluir cliente?"))onDelete(c.id);}} style={btnIcon}>🗑️</button>
              </div>
            </div>
            <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
              <button onClick={()=>setHistorico(c)}
                style={{fontSize:13,padding:"5px 12px",borderRadius:7,border:"1px solid #7c3aed",background:"#f5f3ff",color:"#7c3aed",cursor:"pointer",fontWeight:500}}>
                📋 Ver histórico {qtdPedidos>0&&`(${qtdPedidos} pedido${qtdPedidos>1?"s":""})`}
              </button>
            </div>
          </div>
        );
      })}
      {historico&&<HistoricoModal cliente={historico} pedidos={pedidos} onClose={()=>setHistorico(null)} />}
    </div>
  );
}

// ── TelaPedidos ───────────────────────────────────────────────────────────────
function TelaPedidos({ pedidos, clientes, onAdd, onEdit, onDelete, onStatus }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("dataPedido_desc");
  const [pedidoImagem, setPedidoImagem] = useState(null);
  const getNome = (id) => clientes.find(c=>c.id===id)?.nome??"Cliente";

  const ordenados = [...pedidos].sort((a,b)=>{
    const [campo,dir] = ordenacao.split("_");
    let va, vb;
    if (campo==="dataPedido") {
      va = getDataPedido(a); vb = getDataPedido(b);
    } else {
      va = a.prazo ? new Date(a.prazo+"T12:00:00") : null;
      vb = b.prazo ? new Date(b.prazo+"T12:00:00") : null;
    }
    if (!va&&!vb) return 0; if (!va) return 1; if (!vb) return -1;
    return dir==="asc" ? va-vb : vb-va;
  });

  const filtrados = ordenados.filter(p=>{
    const nome=getNome(p.clienteId).toLowerCase();
    return (nome.includes(busca.toLowerCase())||p.obs?.toLowerCase().includes(busca.toLowerCase()))
      && (filtroStatus==="todos"||p.status===filtroStatus);
  });

  return (
    <div>
      <div style={topBar}>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar pedido..." style={{...inp,flex:1}} />
        <button onClick={onAdd} style={btnPrimary}>+ Novo</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        <button onClick={()=>setFiltroStatus("todos")} style={filtroStatus==="todos"?chipAtivo:chip}>Todos</button>
        {Object.entries(STATUS_PEDIDO).map(([k,v])=>(
          <button key={k} onClick={()=>setFiltroStatus(k)}
            style={filtroStatus===k?{...chipAtivo,background:v.bg,color:v.color,borderColor:v.color}:chip}>{v.label}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,color:"#6b7280",whiteSpace:"nowrap"}}>Ordenar:</span>
        <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} style={{...sel,fontSize:12,padding:"5px 8px"}}>
          <option value="dataPedido_desc">Data pedido (mais recente)</option>
          <option value="dataPedido_asc">Data pedido (mais antigo)</option>
          <option value="prazo_asc">Prazo entrega (mais urgente)</option>
          <option value="prazo_desc">Prazo entrega (mais distante)</option>
        </select>
      </div>
      {filtrados.length===0&&<Empty texto="Nenhum pedido encontrado" />}
      {filtrados.map(p=>{
        const s=STATUS_PEDIDO[p.status];
        return (
          <div key={p.id} style={{...card,borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              {p.imagemUrl&&(
                <img src={p.imagemUrl} alt="ref" onClick={()=>setPedidoImagem(p.imagemUrl)}
                  style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:"1px solid #e5e7eb",cursor:"pointer",flexShrink:0}} />
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={cardTitle}>{getNome(p.clienteId)}</span>
                      <span style={{...badge,background:s.bg,color:s.color}}>{s.label}</span>
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:2}}>
                      {p.dataPedido&&<span style={cardSub}>📋 {p.dataPedido}</span>}
                      {p.prazo&&<span style={cardSub}>📅 Prazo: {p.prazo}</span>}
                    </div>
                    {p.itens?.map((item,i)=>(
                      <div key={i} style={{fontSize:12,color:"#374151",marginTop:2,paddingLeft:8,borderLeft:"2px solid #e5e7eb"}}>
                        {[item.categoria,item.genero&&`(${item.genero})`,item.tamanho,item.qtd>1&&`x${item.qtd}`].filter(Boolean).join(" ")}
                        {item.valor&&` — ${fmt(Number(item.valor)*Number(item.qtd))}`}
                        {item.obs&&<span style={{color:"#9ca3af"}}> · {item.obs}</span>}
                      </div>
                    ))}
                    <div style={{marginTop:6,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:14,fontWeight:600,color:"#166534"}}>{fmt(p.total)}</span>
                      {p.entrada>0&&<span style={{fontSize:12,color:"#6b7280"}}>Entrada: {fmt(Number(p.entrada))} · Saldo: {fmt(p.total-Number(p.entrada))}</span>}
                    </div>
                    {p.obs&&<div style={{...cardSub,fontStyle:"italic",marginTop:4}}>{p.obs}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginLeft:8}}>
                    <button onClick={()=>onEdit(p)} style={btnIcon}>✏️</button>
                    <button onClick={()=>{if(window.confirm("Excluir pedido?"))onDelete(p.id);}} style={btnIcon}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8,paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
              {Object.entries(STATUS_PEDIDO).filter(([k])=>k!==p.status).map(([k,v])=>(
                <button key={k} onClick={()=>onStatus(p.id,k)}
                  style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${v.color}`,background:v.bg,color:v.color,cursor:"pointer"}}>
                  → {v.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {pedidoImagem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setPedidoImagem(null)}>
          <img src={pedidoImagem} alt="ref" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:10}} />
        </div>
      )}
    </div>
  );
}

// ── GraficoMensal ─────────────────────────────────────────────────────────────
function GraficoMensal({ pedidos }) {
  const anoAtual = new Date().getFullYear();
  const dados = Array(12).fill(0).map((_,mes)=>{
    return pedidos
      .filter(p=>["pronto","entregue"].includes(p.status))
      .filter(p=>{
        const d = getDataPedido(p);
        return d && d.getFullYear()===anoAtual && d.getMonth()===mes;
      })
      .reduce((s,p)=>s+(p.total||0),0);
  });
  const maximo = Math.max(...dados,1);
  const totalAno = dados.reduce((s,v)=>s+v,0);
  const mesAtual = new Date().getMonth();

  return (
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
        <div style={{fontWeight:600,fontSize:15}}>Faturamento {anoAtual}</div>
        <div style={{fontSize:13,color:"#166534",fontWeight:700}}>{fmt(totalAno)}</div>
      </div>
      <div style={{fontSize:11,color:"#9ca3af",marginBottom:12}}>Pedidos prontos e entregues · hover para ver valor</div>
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height:110}}>
        {dados.map((v,i)=>{
          const altura = v>0 ? Math.max((v/maximo)*90,6) : 0;
          const ativo = mesAtual===i;
          return (
            <div key={i} title={`${MESES[i]}: ${fmt(v)}`}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"default"}}>
              {v>0&&(
                <div style={{fontSize:8,color:"#166534",fontWeight:600,whiteSpace:"nowrap",textAlign:"center"}}>
                  {v>=1000?`${(v/1000).toFixed(1)}k`:v.toFixed(0)}
                </div>
              )}
              <div style={{flex:1,display:"flex",alignItems:"flex-end",width:"100%"}}>
                <div style={{
                  width:"100%",height:altura,
                  background:ativo?"#7c3aed":v>0?"#a78bfa":"#f3f4f6",
                  borderRadius:"3px 3px 0 0",
                  transition:"height .5s ease"
                }} />
              </div>
              <div style={{fontSize:9,color:ativo?"#7c3aed":"#9ca3af",fontWeight:ativo?700:400}}>{MESES[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calculadora de Custo ──────────────────────────────────────────────────────
const CONSUMO_TECIDO_M = {
  "Camisa infantil 1-4":0.6,"Camisa infantil 5-10":0.8,
  "Camisa Baby Look PP-P":0.8,"Camisa Baby Look M-G":1.0,"Camisa Baby Look GG-EXG":1.2,
  "Camisa masc PP-M":1.0,"Camisa masc G-GG":1.2,
  "Calça infantil":0.9,"Calça adulto":1.4,
  "Short infantil":0.5,"Short adulto":0.7,
  "Short-Saia":0.7,"Outros":1.0
};

function TelaCalculadora() {
  const [tecido, setTecido] = useState({ precoKg:"", gramaturaPorMetro:"", consumoM:"" });
  const [impressao, setImpressao] = useState({ papel:"0.30", tinta:"1.50", energia:"0.20" });
  const [insumos, setInsumos] = useState({ gola:"2.00", linha:"0.50", botoes:"0.80", outros:"0.00" });
  const [maoObra, setMaoObra] = useState({ horasTrab:"8", salarioDia:"80", pecasPorDia:"8" });
  const [energia, setEnergia] = useState({ kwhMes:"120", tarifaKwh:"0.85", pecasMes:"150" });
  const [referencia, setReferencia] = useState("Camisa masc PP-M");
  const [consumoPersonalizado, setConsumoPersonalizado] = useState(false);

  const setT=(k,v)=>setTecido(p=>({...p,[k]:v}));
  const setIm=(k,v)=>setImpressao(p=>({...p,[k]:v}));
  const setIn=(k,v)=>setInsumos(p=>({...p,[k]:v}));
  const setM=(k,v)=>setMaoObra(p=>({...p,[k]:v}));
  const setE=(k,v)=>setEnergia(p=>({...p,[k]:v}));

  // Cálculos de tecido
  const consumoM = consumoPersonalizado ? Number(tecido.consumoM)||0 : (CONSUMO_TECIDO_M[referencia]||1.0);
  const gramatura = Number(tecido.gramaturaPorMetro)||200; // g/m²
  const pesoMetro = gramatura/1000; // kg/m
  const precoKg = Number(tecido.precoKg)||0;
  const precoMetro = precoKg * pesoMetro;
  const custoTecido = precoMetro * consumoM;

  // Impressão
  const custoImpressao = Number(impressao.papel)+Number(impressao.tinta)+Number(impressao.energia);

  // Insumos
  const custoInsumos = Number(insumos.gola)+Number(insumos.linha)+Number(insumos.botoes)+Number(insumos.outros);

  // Mão de obra
  const custoMaoObra = Number(maoObra.pecasPorDia)>0 ? Number(maoObra.salarioDia)/Number(maoObra.pecasPorDia) : 0;

  // Energia máquinas
  const custoEnergia = Number(energia.pecasMes)>0 ? (Number(energia.kwhMes)*Number(energia.tarifaKwh))/Number(energia.pecasMes) : 0;

  const custoTotal = custoTecido+custoImpressao+custoInsumos+custoMaoObra+custoEnergia;
  const precoSugerido30 = custoTotal*1.3;
  const precoSugerido50 = custoTotal*1.5;
  const precoSugerido100 = custoTotal*2.0;

  const ItemCusto = ({label, valor, cor="#374151"}) => (
    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6"}}>
      <span style={{fontSize:13,color:"#6b7280"}}>{label}</span>
      <span style={{fontSize:13,fontWeight:600,color:cor}}>{fmt(valor)}</span>
    </div>
  );

  return (
    <div>
      <div style={{...card,borderTop:"4px solid #7c3aed"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>🧮 Calculadora de Custo</div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:12}}>Calcule o custo real de cada peça</div>

        {/* TECIDO */}
        <div style={{fontWeight:600,fontSize:14,color:"#7c3aed",marginBottom:8,marginTop:4}}>🧵 Tecido</div>
        <div style={{background:"#fafafa",borderRadius:8,padding:10,marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:130}}>
              <label style={lbl}>Preço do kg (R$)</label>
              <input type="number" step="0.01" placeholder="Ex: 25,00" value={tecido.precoKg}
                onChange={e=>setT("precoKg",e.target.value)} style={inp} />
            </div>
            <div style={{flex:1,minWidth:130}}>
              <label style={lbl}>Gramatura (g/m²)</label>
              <input type="number" placeholder="Ex: 200" value={tecido.gramaturaPorMetro}
                onChange={e=>setT("gramaturaPorMetro",e.target.value)} style={inp} />
              <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Malha fina≈160 · Moletom≈300</div>
            </div>
          </div>
          <div style={{marginTop:8}}>
            <label style={lbl}>Tipo de peça (consumo de tecido)</label>
            <select value={referencia} onChange={e=>{setReferencia(e.target.value);setConsumoPersonalizado(false);}} style={sel}>
              {Object.keys(CONSUMO_TECIDO_M).map(k=><option key={k}>{k}</option>)}
            </select>
          </div>
          <div style={{marginTop:8}}>
            <label style={{...lbl,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={consumoPersonalizado} onChange={e=>setConsumoPersonalizado(e.target.checked)} />
              Informar consumo manualmente (metros)
            </label>
            {consumoPersonalizado&&(
              <input type="number" step="0.1" placeholder="Ex: 1.2" value={tecido.consumoM}
                onChange={e=>setT("consumoM",e.target.value)} style={{...inp,marginTop:4}} />
            )}
          </div>
          {precoKg>0&&(
            <div style={{marginTop:8,fontSize:12,color:"#374151",background:"#ede9fe",borderRadius:6,padding:"6px 10px"}}>
              📐 {consumoM}m × {pesoMetro.toFixed(3)}kg/m × {fmt(precoKg)}/kg = <strong>{fmt(custoTecido)}</strong> de tecido
            </div>
          )}
        </div>

        {/* IMPRESSÃO */}
        <div style={{fontWeight:600,fontSize:14,color:"#7c3aed",marginBottom:8}}>🖨️ Impressão / Estampa</div>
        <div style={{background:"#fafafa",borderRadius:8,padding:10,marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["Papel/transfer (R$)","papel"],["Tinta/ink (R$)","tinta"],["Energia impressora (R$)","energia"]].map(([label,key])=>(
              <div key={key} style={{flex:1,minWidth:120}}>
                <label style={lbl}>{label}</label>
                <input type="number" step="0.01" value={impressao[key]} onChange={e=>setIm(key,e.target.value)} style={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* INSUMOS */}
        <div style={{fontWeight:600,fontSize:14,color:"#7c3aed",marginBottom:8}}>🪡 Insumos</div>
        <div style={{background:"#fafafa",borderRadius:8,padding:10,marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["Gola (R$)","gola"],["Linha (R$)","linha"],["Botões (R$)","botoes"],["Outros (R$)","outros"]].map(([label,key])=>(
              <div key={key} style={{flex:1,minWidth:110}}>
                <label style={lbl}>{label}</label>
                <input type="number" step="0.01" value={insumos[key]} onChange={e=>setIn(key,e.target.value)} style={inp} />
              </div>
            ))}
          </div>
        </div>

        {/* MÃO DE OBRA */}
        <div style={{fontWeight:600,fontSize:14,color:"#7c3aed",marginBottom:8}}>👩‍🦱 Mão de Obra</div>
        <div style={{background:"#fafafa",borderRadius:8,padding:10,marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:120}}>
              <label style={lbl}>Diária / salário dia (R$)</label>
              <input type="number" step="0.01" value={maoObra.salarioDia} onChange={e=>setM("salarioDia",e.target.value)} style={inp} />
            </div>
            <div style={{flex:1,minWidth:120}}>
              <label style={lbl}>Peças produzidas/dia</label>
              <input type="number" value={maoObra.pecasPorDia} onChange={e=>setM("pecasPorDia",e.target.value)} style={inp} />
            </div>
          </div>
          {Number(maoObra.pecasPorDia)>0&&(
            <div style={{marginTop:8,fontSize:12,color:"#374151",background:"#ede9fe",borderRadius:6,padding:"6px 10px"}}>
              {fmt(Number(maoObra.salarioDia))} ÷ {maoObra.pecasPorDia} peças = <strong>{fmt(custoMaoObra)}</strong> por peça
            </div>
          )}
        </div>

        {/* ENERGIA MÁQUINAS */}
        <div style={{fontWeight:600,fontSize:14,color:"#7c3aed",marginBottom:8}}>⚡ Energia (máquinas)</div>
        <div style={{background:"#fafafa",borderRadius:8,padding:10,marginBottom:16}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:110}}>
              <label style={lbl}>kWh/mês consumido</label>
              <input type="number" value={energia.kwhMes} onChange={e=>setE("kwhMes",e.target.value)} style={inp} />
            </div>
            <div style={{flex:1,minWidth:110}}>
              <label style={lbl}>Tarifa kWh (R$)</label>
              <input type="number" step="0.01" value={energia.tarifaKwh} onChange={e=>setE("tarifaKwh",e.target.value)} style={inp} />
            </div>
            <div style={{flex:1,minWidth:110}}>
              <label style={lbl}>Peças/mês produzidas</label>
              <input type="number" value={energia.pecasMes} onChange={e=>setE("pecasMes",e.target.value)} style={inp} />
            </div>
          </div>
          {Number(energia.pecasMes)>0&&(
            <div style={{marginTop:8,fontSize:12,color:"#374151",background:"#ede9fe",borderRadius:6,padding:"6px 10px"}}>
              {energia.kwhMes}kWh × {fmt(Number(energia.tarifaKwh))} ÷ {energia.pecasMes} peças = <strong>{fmt(custoEnergia)}</strong> por peça
            </div>
          )}
        </div>

        {/* RESULTADO */}
        <div style={{background:"#1e1b4b",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#c4b5fd",marginBottom:10}}>📊 Resultado</div>
          <ItemCusto label="Tecido" valor={custoTecido} />
          <ItemCusto label="Impressão/estampa" valor={custoImpressao} />
          <ItemCusto label="Insumos (gola, linha...)" valor={custoInsumos} />
          <ItemCusto label="Mão de obra" valor={custoMaoObra} />
          <ItemCusto label="Energia máquinas" valor={custoEnergia} />
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,padding:"8px 0",borderTop:"1px solid #4c1d95"}}>
            <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>Custo total</span>
            <span style={{fontSize:18,fontWeight:800,color:"#a78bfa"}}>{fmt(custoTotal)}</span>
          </div>
          <div style={{marginTop:12,fontSize:13,fontWeight:600,color:"#c4b5fd",marginBottom:6}}>Preço de venda sugerido:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {[[30,"#22c55e"],[50,"#f59e0b"],[100,"#ef4444"]].map(([pct,cor])=>(
              <div key={pct} style={{background:"rgba(255,255,255,0.07)",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#a78bfa",marginBottom:2}}>+{pct}% lucro</div>
                <div style={{fontSize:15,fontWeight:800,color:cor}}>{fmt(custoTotal*(1+pct/100))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ pedidos, clientes }) {
  const total = pedidos.reduce((s,p)=>s+(p.total||0),0);
  const pendentes = pedidos.filter(p=>["pendente","producao","pronto"].includes(p.status));
  const aReceber = pendentes.reduce((s,p)=>s+Math.max(0,(p.total||0)-(Number(p.entrada)||0)),0);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <StatCard titulo="Total de pedidos" valor={pedidos.length} sub="pedidos cadastrados" cor="#4f46e5" />
        <StatCard titulo="Clientes" valor={clientes.length} sub="cadastrados" cor="#0891b2" />
        <StatCard titulo="Faturamento total" valor={fmt(total)} sub="todos os pedidos" cor="#059669" />
        <StatCard titulo="A receber" valor={fmt(aReceber)} sub="saldo pendente" cor="#d97706" />
      </div>
      <GraficoMensal pedidos={pedidos} />
      <div style={card}>
        <div style={{fontWeight:600,marginBottom:10,fontSize:15}}>Pedidos por status</div>
        {Object.entries(STATUS_PEDIDO).map(([k,v])=>{
          const count=pedidos.filter(p=>p.status===k).length;
          const pct=pedidos.length?Math.round((count/pedidos.length)*100):0;
          return (
            <div key={k} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:13,color:v.color}}>{v.label}</span>
                <span style={{fontSize:13,fontWeight:500}}>{count} ({pct}%)</span>
              </div>
              <div style={{height:6,background:"#f3f4f6",borderRadius:3}}>
                <div style={{height:"100%",width:`${pct}%`,background:v.color,borderRadius:3,transition:"width .4s"}} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={card}>
        <div style={{fontWeight:600,marginBottom:10,fontSize:15}}>Últimos pedidos</div>
        {pedidos.slice(0,5).map(p=>{
          const s=STATUS_PEDIDO[p.status];
          const cliente=clientes.find(c=>c.id===p.clienteId);
          return (
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div>
                <div style={{fontSize:14,fontWeight:500}}>{cliente?.nome??"—"}</div>
                <span style={{...badge,background:s.bg,color:s.color}}>{s.label}</span>
                {p.dataPedido&&<span style={{fontSize:11,color:"#9ca3af",marginLeft:6}}>{p.dataPedido}</span>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#166534"}}>{fmt(p.total)}</div>
                {p.prazo&&<div style={{fontSize:11,color:"#9ca3af"}}>Prazo: {p.prazo}</div>}
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
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`4px solid ${cor}`}}>
      <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>{titulo}</div>
      <div style={{fontSize:18,fontWeight:700,color:"#111827",lineHeight:1.2}}>{valor}</div>
      <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{sub}</div>
    </div>
  );
}

function Empty({ texto }) {
  return (
    <div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af",fontSize:14}}>
      <div style={{fontSize:40,marginBottom:8}}>🧵</div>{texto}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [modalCliente, setModalCliente] = useState(null);
  const [modalPedido, setModalPedido] = useState(null);

  useEffect(()=>{
    const q1=query(collection(db,"clientes"),orderBy("nome"));
    const q2=query(collection(db,"pedidos"),orderBy("criadoEm","desc"));
    const u1=onSnapshot(q1,s=>setClientes(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(q2,s=>setPedidos(s.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>{u1();u2();};
  },[]);

  const salvarCliente = async (form) => {
    const data={nome:form.nome,telefone:form.telefone||"",endereco:form.endereco||"",obs:form.obs||""};
    if(modalCliente?.id) await updateDoc(doc(db,"clientes",modalCliente.id),data);
    else await addDoc(collection(db,"clientes"),{...data,criadoEm:serverTimestamp()});
    setModalCliente(null);
  };

  const salvarPedido = async (form) => {
    const data={
      clienteId:form.clienteId,status:form.status,
      dataPedido:form.dataPedido||"",prazo:form.prazo||"",
      entrada:Number(form.entrada)||0,itens:form.itens,total:form.total,
      obs:form.obs||"",imagemUrl:form.imagemUrl||"",
      atualizadoEm:serverTimestamp()
    };
    if(modalPedido?.id) await updateDoc(doc(db,"pedidos",modalPedido.id),data);
    else await addDoc(collection(db,"pedidos"),{...data,criadoEm:serverTimestamp()});
    setModalPedido(null);
  };

  const abas=[
    {key:"dashboard",icon:"📊",label:"Resumo"},
    {key:"pedidos",  icon:"🧵",label:"Pedidos"},
    {key:"clientes", icon:"👥",label:"Clientes"},
    {key:"calc",     icon:"🧮",label:"Custos"},
  ];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:540,margin:"0 auto",background:"#f9fafb",minHeight:"100vh"}}>
      <div style={{background:"#7c3aed",color:"#fff",padding:"14px 16px 10px",position:"sticky",top:0,zIndex:50}}>
        <div style={{fontSize:20,fontWeight:800,letterSpacing:0.5}}>✂️ MAHUS Confecções</div>
        <div style={{fontSize:12,opacity:0.8}}>Gerenciamento de pedidos</div>
      </div>
      <div style={{padding:"12px 12px 80px"}}>
        {aba==="dashboard"&&<Dashboard pedidos={pedidos} clientes={clientes} />}
        {aba==="clientes"&&(
          <TelaClientes clientes={clientes} pedidos={pedidos}
            onAdd={()=>setModalCliente("novo")}
            onEdit={c=>setModalCliente(c)}
            onDelete={async(id)=>{await deleteDoc(doc(db,"clientes",id));}} />
        )}
        {aba==="pedidos"&&(
          <TelaPedidos pedidos={pedidos} clientes={clientes}
            onAdd={()=>setModalPedido("novo")}
            onEdit={p=>setModalPedido(p)}
            onDelete={async(id)=>{await deleteDoc(doc(db,"pedidos",id));}}
            onStatus={async(id,status)=>{await updateDoc(doc(db,"pedidos",id),{status,atualizadoEm:serverTimestamp()});}} />
        )}
        {aba==="calc"&&<TelaCalculadora />}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"center"}}>
        <div style={{display:"flex",maxWidth:540,width:"100%"}}>
          {abas.map(a=>(
            <button key={a.key} onClick={()=>setAba(a.key)}
              style={{flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",
                borderTop:aba===a.key?"3px solid #7c3aed":"3px solid transparent",
                color:aba===a.key?"#7c3aed":"#6b7280"}}>
              <div style={{fontSize:20}}>{a.icon}</div>
              <div style={{fontSize:10,fontWeight:aba===a.key?600:400}}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
      {modalCliente&&(
        <ClienteModal cliente={modalCliente==="novo"?null:modalCliente}
          onSave={salvarCliente} onClose={()=>setModalCliente(null)} />
      )}
      {modalPedido&&(
        <PedidoModal pedido={modalPedido==="novo"?null:modalPedido}
          clientes={clientes} onSave={salvarPedido} onClose={()=>setModalPedido(null)} />
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const inp={border:"1px solid #d1d5db",borderRadius:7,padding:"8px 10px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",background:"#fff"};
const sel={...inp,cursor:"pointer"};
const lbl={display:"block",fontSize:13,fontWeight:500,color:"#374151",marginBottom:4,marginTop:10};
const card={background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",marginBottom:10};
const cardTitle={fontSize:15,fontWeight:600,color:"#111827"};
const cardSub={fontSize:12,color:"#6b7280",marginTop:2};
const badge={fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,display:"inline-block"};
const btnPrimary={background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:14,fontWeight:600,cursor:"pointer"};
const btnGhost={background:"#fff",color:"#374151",border:"1px solid #d1d5db",borderRadius:8,padding:"9px 16px",fontSize:14,cursor:"pointer"};
const btnDanger={background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600};
const btnIcon={background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:16};
const btnX={background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:16,color:"#6b7280",lineHeight:1};
const topBar={display:"flex",gap:8,marginBottom:12};
const chip={fontSize:12,padding:"4px 10px",borderRadius:20,border:"1px solid #d1d5db",background:"#fff",color:"#6b7280",cursor:"pointer"};
const chipAtivo={...chip,background:"#7c3aed",color:"#fff",borderColor:"#7c3aed",fontWeight:600};
const modalTitle={fontSize:17,fontWeight:700,color:"#111827",margin:0};
