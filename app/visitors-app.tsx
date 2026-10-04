"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, MonitorPlay, Share2, RefreshCw, Maximize, Trash2, LockKeyhole, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type Visitor={id:string;name:string;phone:string;visitDate:string;service:string;notes:string;approved:boolean|number;createdAt:string};
const today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"America/Sao_Paulo"});
const pretty=(s:string)=>{const [y,m,d]=s.split("-");return y&&m&&d?`${d}/${m}/${y}`:s};
const errorText=async(r:Response)=>{try{const j=await r.json() as {error?:string};return j.error||"Não foi possível concluir."}catch{return "Não foi possível concluir."}};
export default function VisitorsApp(){
  const [date,setDate]=useState(today);
  const [rows,setRows]=useState<Visitor[]>([]);
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[service,setService]=useState("Culto"),[notes,setNotes]=useState(""),[approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [screen,setScreen]=useState(false);
  const [authRequired,setAuthRequired]=useState(false),[password,setPassword]=useState(""),[loginBusy,setLoginBusy]=useState(false);
  useEffect(()=>{setScreen(new URLSearchParams(location.search).has("tela"));},[]);
  useEffect(()=>{const saved=localStorage.getItem("admsbc:last-service");if(saved)setService(saved)},[]);
  const load=useCallback(async(silent=false)=>{
    if(!silent)setLoading(true);
    try{const r=await fetch(`/api/visitors?date=${encodeURIComponent(date)}`,{cache:"no-store"});if(r.status===401){setRows([]);setAuthRequired(true);setError("");return}if(!r.ok)throw new Error(await errorText(r));const j=await r.json() as {visitors:Visitor[]};setRows(j.visitors);setAuthRequired(false);setError("");}
    catch(e){if(!silent)setError(e instanceof Error?e.message:"Falha ao carregar.");}
    finally{if(!silent)setLoading(false);}
  },[date]);
  useEffect(()=>{void load();if(authRequired)return;const id=setInterval(()=>{void load(true)},15000);return()=>clearInterval(id)},[load,authRequired]);
  const visible=useMemo(()=>rows.filter(x=>!!x.approved),[rows]);
  const projectionUrl=()=>`/?tela=1&date=${encodeURIComponent(date)}`;
  useEffect(()=>{const params=new URLSearchParams(location.search);const d=params.get("date");if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d))setDate(d)},[]);
  async function create(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try{const r=await fetch("/api/visitors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,phone,visitDate:date,service,notes,approved})});if(r.status===401){setAuthRequired(true);return}if(!r.ok)throw new Error(await errorText(r));localStorage.setItem("admsbc:last-service",service.trim());setName("");setPhone("");setNotes("");setApproved(false);setMessage("Visitante cadastrado. O nome do culto ficou salvo para o próximo registro.");await load(true)}
    catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.")}finally{setBusy(false)}
  }
  async function login(e:React.FormEvent){
    e.preventDefault();setLoginBusy(true);setError("");
    try{const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});if(!r.ok)throw new Error(await errorText(r));setPassword("");setAuthRequired(false);await load()}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.")}finally{setLoginBusy(false)}
  }
  async function logout(){await fetch("/api/auth",{method:"DELETE"});setRows([]);setAuthRequired(true);setMessage("")}
  async function toggle(v:Visitor){
    setError("");setMessage("");
    try{const r=await fetch("/api/visitors",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:v.id,approved:!v.approved})});if(r.status===401){setAuthRequired(true);return}if(!r.ok)throw new Error(await errorText(r));await load(true);setMessage(v.approved?"Nome removido da projeção.":"Nome aprovado para projeção.")}
    catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar.")}
  }
  async function remove(v:Visitor){
    if(!confirm(`Excluir ${v.name} do cadastro?`))return;
    try{const r=await fetch(`/api/visitors?id=${encodeURIComponent(v.id)}`,{method:"DELETE"});if(r.status===401){setAuthRequired(true);return}if(!r.ok)throw new Error(await errorText(r));await load(true);setMessage("Cadastro excluído.")}
    catch(e){setError(e instanceof Error?e.message:"Falha ao excluir.")}
  }
  async function share(){
    if(!visible.length)return;
    const text=`Visitantes para o telão — ${pretty(date)}\n\n${visible.map((v,i)=>`${i+1}. ${v.name}`).join("\n")}\n\nADMSBC • Recepção`;
    try{if(navigator.share)await navigator.share({title:"Visitantes para o telão",text});else{await navigator.clipboard.writeText(text);setMessage("Lista copiada. Cole na conversa da equipe de mídia.")}}
    catch(e){if((e as Error).name!=="AbortError")setError("Não foi possível compartilhar. Tente copiar a lista novamente.")}
  }
  useEffect(()=>{
    const ctx=(document as Document & {modelContext?:{registerTool:(tool:unknown,opts:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!ctx?.registerTool)return;const c=new AbortController();
    void Promise.resolve(ctx.registerTool({name:"list_approved_visitors",title:"Listar visitantes para o telão",description:"Lista apenas os nomes aprovados na data selecionada, sem telefone ou observações.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({date,names:visible.map(v=>v.name)})},{signal:c.signal})).catch(()=>{});
    return()=>c.abort();
  },[date,visible]);
  if(authRequired)return <main className="login-shell"><section className="login-card"><img className="login-logo" src="/logo-admsbc.png" alt="Assembleia de Deus — Ministério São Bernardo do Campo"/><div className="login-icon"><LockKeyhole size={24}/></div><h1>Gestão de Visitantes</h1><p>Digite a senha da equipe para acessar o cadastro e o telão.</p>{error&&<div className="message error" role="alert">{error}</div>}<form onSubmit={login}><label className="field">Senha<Input autoFocus required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha de acesso"/></label><Button type="submit" disabled={loginBusy} className="button primary full">{loginBusy?"Entrando...":"Entrar"}</Button></form></section></main>;
  if(screen)return <main className="screen">
    <div className="screen-controls"><Button className="button" onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize size={18}/> Tela cheia</Button><Button className="button" onClick={()=>{location.href="/"}}>Sair</Button></div>
    <div className="screen-top"><div className="screen-brand"><img className="screen-logo" src="/logo-admsbc.png" alt="Assembleia de Deus — Ministério São Bernardo do Campo"/><strong>ADMSBC</strong></div><span>{pretty(date)}</span></div>
    <div className="screen-title"><label>Recepção</label><h1>Sejam bem-vindos!</h1><p>É uma alegria receber vocês em nossa igreja.</p></div>
    <div className={`screen-names ${visible.length>6?"many":""}`}>{loading?<div className="screen-empty">Carregando...</div>:visible.length?visible.map(v=><div className="screen-visitor" key={v.id}><span className="screen-name">{v.name}</span><span className={`screen-note ${v.notes?"":"screen-note-empty"}`}>{v.notes||"Visitante"}</span></div>):<div className="screen-empty">Bem-vindos à nossa igreja!</div>}</div>
    <div className="screen-bottom"><span>Uma casa de fé para toda a família</span><span>Atualização automática</span></div>
  </main>;
  return <main className="shell">
    <header className="top"><div className="brand"><img className="brand-logo" src="/logo-admsbc.png" alt="Assembleia de Deus — Ministério São Bernardo do Campo"/><span>Gestão de Visitantes<small>ADMSBC · RECEPÇÃO</small></span></div><div className="actions"><Button variant="ghost" className="button" onClick={()=>void logout()}><LogOut size={17}/> Sair</Button><Button variant="outline" className="button" onClick={()=>void share()} disabled={!visible.length}><Share2 size={17}/> Enviar à mídia</Button><Button className="button primary" onClick={()=>window.open(projectionUrl(),"_blank","noopener,noreferrer")}><MonitorPlay size={18}/> Abrir telão</Button></div></header>
    <div className="heading"><div><h1>Visitantes</h1><p>Cadastre, revise e prepare os nomes para o culto.</p></div><span style={{color:"#5b7892",fontWeight:700}}>{rows.length} cadastrado{rows.length===1?"":"s"} · {visible.length} no telão</span></div>
    {error&&<div className="message error" role="alert">{error}</div>}{message&&<div className="message" role="status">{message}</div>}
    <div className="grid"><section className="panel form-panel"><h2 className="panel-title"><UserPlus size={20} style={{verticalAlign:"middle",marginRight:8,color:"#1264a6"}}/>Novo visitante</h2>
      <form onSubmit={create}><label className="field">Nome para apresentação *<Input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome e sobrenome"/></label>
      <div className="form-row"><label className="field">Data do culto *<Input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field">Culto / reunião *<Input required maxLength={80} value={service} onChange={e=>setService(e.target.value)} placeholder="Culto da família"/></label></div>
      <label className="field">Telefone <span className="hint">Opcional; uso interno da recepção.</span><Input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(11) 99999-9999"/></label>
      <label className="field">Observações para o telão <span className="hint">Aparecem ao lado do nome no telão. Não inclua telefone ou informações pessoais.</span><Textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: Visitando pela primeira vez"/></label>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20}}><Checkbox id="approved" checked={approved} onCheckedChange={v=>setApproved(v===true)}/><label htmlFor="approved" style={{fontWeight:700,fontSize:".9rem"}}>Aprovar nome para o telão</label></div>
      <Button type="submit" disabled={busy} className="button primary full">{busy?"Salvando...":"Cadastrar visitante"}</Button></form>
      <p className="privacy">O telão mostra o nome e a observação dos visitantes aprovados. A lista compartilhada com a mídia continua mostrando somente os nomes. Confirme com a pessoa antes da exibição.</p>
    </section>
    <section className="panel list-panel"><div className="list-head"><div><h2>Lista do culto</h2><p>Os nomes aprovados aparecem automaticamente no telão.</p></div><Input aria-label="Filtrar data da lista" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:175}}/></div>
      {loading?<div className="empty">Carregando visitantes...</div>:rows.length?rows.map(v=><div className="row" key={v.id}><div className="row-main"><strong>{v.name}</strong><span className="meta">{v.service} · {pretty(v.visitDate)}{v.phone?` · ${v.phone}`:""}</span>{v.notes&&<span className="note">{v.notes}</span>}</div><div className="row-actions"><span className={`chip ${v.approved?"":"off"}`}>{v.approved?"No telão":"Pendente"}</span><Button variant="outline" className="button" onClick={()=>void toggle(v)}>{v.approved?"Retirar":"Aprovar"}</Button><Button variant="ghost" className="button danger" title={`Excluir ${v.name}`} aria-label={`Excluir ${v.name}`} onClick={()=>void remove(v)}><Trash2 size={16}/></Button></div></div>):<div className="empty"><strong>Nenhum visitante nesta data</strong>Preencha o cadastro ao lado para começar.</div>}
      <div style={{padding:"16px 26px",borderTop:"1px solid #e7edf3",color:"#70869b",fontSize:".8rem",display:"flex",alignItems:"center",gap:7}}><RefreshCw size={14}/> Lista atualizada automaticamente a cada 15 segundos</div>
    </section></div>
  </main>;
}
