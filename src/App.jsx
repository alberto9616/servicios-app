import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════════════
// SUPABASE — configuración
// Reemplaza estos valores con los de tu proyecto en
// https://app.supabase.com → Project Settings → API
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL  = "https://fwimnbieduydfsjwljjv.supabase.co";
const SUPABASE_ANON = "sb_publishable_uHtXEsYeYfnSzKU3maqPOw_rutBeBjh";

// ── Logo de la empresa ─────────────────────────────────────
// Pega aquí la URL de tu logo (imagen subida a internet)
// Ejemplo: "https://i.imgur.com/tulogo.png"
// Si lo dejas vacío ("") se mostrará el ícono 📡 por defecto
const LOGO_URL = "https://imgur.com/a/iX5gd48";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ──────────────────────────────────────────────────────────
// HELPERS: convierten snake_case (BD) ↔ camelCase (app)
// ──────────────────────────────────────────────────────────
const mapZona = r => r ? ({ id: r.id, nombre: r.nombre, color: r.color, activa: r.activa, nombreEmpresa: r.nombre_empresa }) : null;
const mapPlan = r => r ? ({ id: r.id, nombre: r.nombre, precio: r.precio, descripcion: r.descripcion, activo: r.activo }) : null;
const mapUsuario = r => r ? ({
  id: r.id, usuario: r.usuario, clave: r.clave, rol: r.rol, nombre: r.nombre, activo: r.activo,
  zonaId: r.zona_id, secretarioId: r.secretario_id, tipo: r.tipo, cedula: r.cedula,
  telefono: r.telefono, servicio: r.servicio, plan: r.plan, planId: r.plan_id,
  monto: r.monto ? Number(r.monto) : null, fechaPago: r.fecha_pago, estado: r.estado,
  direccion: r.direccion, claveWifi: r.clave_wifi, nombreEmpresa: r.nombre_empresa,
  privilegios: r.privilegios || []
}) : null;
const mapAviso = r => r ? ({ id: r.id, tipo: r.tipo, titulo: r.titulo, mensaje: r.mensaje, fecha: r.fecha, afecta: r.afecta, activo: r.activo }) : null;
const mapTicket = (r, mensajes = []) => r ? ({
  id: r.id, clienteId: r.cliente_id, clienteNombre: r.cliente_nombre,
  tipo: r.tipo, titulo: r.titulo, categoria: r.categoria, estado: r.estado,
  prioridad: r.prioridad, ordenId: r.orden_id,
  numero: r.numero || null,
  fechaCreacion: new Date(r.fecha_creacion).getTime(),
  mensajes: mensajes.map(m => ({ autor: m.autor, texto: m.texto, ts: new Date(m.ts).getTime() }))
}) : null;
const mapOrden = r => r ? ({
  id: r.id, ticketId: r.ticket_id, clienteId: r.cliente_id, clienteNombre: r.cliente_nombre,
  secretarioId: r.secretario_id, tecnicoId: r.tecnico_id, tipo: r.tipo,
  descripcion: r.descripcion, direccion: r.direccion, telefonoCliente: r.telefono_cliente,
  direccionAnterior: r.direccion_anterior, direccionNueva: r.direccion_nueva,
  fecha: r.fecha, hora: r.hora, estado: r.estado, prioridad: r.prioridad,
  esManual: r.es_manual, zonaId: r.zona_id, datosInstalacion: r.datos_instalacion,
  notas: Array.isArray(r.notas) ? r.notas : [],
  fechaCreacion: new Date(r.fecha_creacion).getTime()
}) : null;
const mapPropaganda = r => r ? ({ id: r.id, categoria: r.categoria, titulo: r.titulo, descripcion: r.descripcion, activo: r.activo, fecha: r.fecha, imagen: r.imagen, color: r.color }) : null;

// ──────────────────────────────────────────────────────────
// CAPA DE DATOS — todas las operaciones con Supabase
// ──────────────────────────────────────────────────────────
const db = {
  // ZONAS
  async getZonas() { const { data, error } = await sb.from("zonas").select("*").order("nombre"); if (error) throw error; return data.map(mapZona); },
  async upsertZona(z) { const { data, error } = await sb.from("zonas").upsert({ id: z.id||undefined, nombre: z.nombre, color: z.color, activa: z.activa, nombre_empresa: z.nombreEmpresa||null }).select().single(); if (error) throw error; return mapZona(data); },
  async deleteZona(id) { const { error } = await sb.from("zonas").delete().eq("id", id); if (error) throw error; },
  async toggleZona(id, activa) { const { error } = await sb.from("zonas").update({ activa }).eq("id", id); if (error) throw error; },
  async patchZonaNombreEmpresa(id, nombreEmpresa) { const { error } = await sb.from("zonas").update({ nombre_empresa: nombreEmpresa }).eq("id", id); if (error) throw error; },

  // PLANES
  async getPlanes() { const { data, error } = await sb.from("planes").select("*").order("precio"); if (error) throw error; return data.map(mapPlan); },
  async upsertPlan(p) { const { data, error } = await sb.from("planes").upsert({ id: p.id||undefined, nombre: p.nombre, precio: p.precio, descripcion: p.descripcion, activo: p.activo }).select().single(); if (error) throw error; return mapPlan(data); },
  async deletePlan(id) { const { error } = await sb.from("planes").delete().eq("id", id); if (error) throw error; },
  async togglePlan(id, activo) { const { error } = await sb.from("planes").update({ activo }).eq("id", id); if (error) throw error; },

  // USUARIOS
  async getUsuarios() { const { data, error } = await sb.from("usuarios").select("*").order("nombre"); if (error) throw error; return data.map(mapUsuario); },
  async upsertUsuario(u) {
    const row = { id: u.id||undefined, usuario: u.usuario, clave: u.clave, rol: u.rol, nombre: u.nombre, activo: u.activo??true, zona_id: u.zonaId||null, secretario_id: u.secretarioId||null, tipo: u.tipo||null, cedula: u.cedula||null, telefono: u.telefono||null, servicio: u.servicio||null, plan: u.plan||null, plan_id: u.planId||null, monto: u.monto||null, fecha_pago: u.fechaPago||null, estado: u.estado||null, direccion: u.direccion||null, clave_wifi: u.claveWifi||null, nombre_empresa: u.nombreEmpresa||null, privilegios: u.privilegios||[] };
    const { data, error } = await sb.from("usuarios").upsert(row).select().single();
    if (error) throw error; return mapUsuario(data);
  },
  async deleteUsuario(id) { const { error } = await sb.from("usuarios").delete().eq("id", id); if (error) throw error; },
  async toggleUsuario(id, activo) { const { error } = await sb.from("usuarios").update({ activo }).eq("id", id); if (error) throw error; },
  async updateClaveWifi(id, claveWifi) { const { data, error } = await sb.from("usuarios").update({ clave_wifi: claveWifi }).eq("id", id).select().single(); if (error) throw error; return mapUsuario(data); },

  // AVISOS
  async getAvisos() { const { data, error } = await sb.from("avisos").select("*").order("created_at", { ascending: false }); if (error) throw error; return data.map(mapAviso); },
  async upsertAviso(a) { const { data, error } = await sb.from("avisos").upsert({ id: a.id||undefined, tipo: a.tipo, titulo: a.titulo, mensaje: a.mensaje, fecha: a.fecha||null, afecta: a.afecta, activo: a.activo }).select().single(); if (error) throw error; return mapAviso(data); },
  async deleteAviso(id) { const { error } = await sb.from("avisos").delete().eq("id", id); if (error) throw error; },
  async toggleAviso(id, activo) { const { error } = await sb.from("avisos").update({ activo }).eq("id", id); if (error) throw error; },

  // TICKETS
  async getTickets() {
    const { data: tks, error: e1 } = await sb.from("tickets").select("*").order("fecha_creacion", { ascending: false });
    if (e1) throw e1;
    const { data: msgs, error: e2 } = await sb.from("ticket_mensajes").select("*").order("ts");
    if (e2) throw e2;
    return tks.map(t => mapTicket(t, msgs.filter(m => m.ticket_id === t.id)));
  },
  async crearTicket(t) {
    const { data: tk, error: e1 } = await sb.from("tickets").insert({ cliente_id: t.clienteId, cliente_nombre: t.clienteNombre, tipo: t.tipo, titulo: t.titulo, categoria: t.categoria, estado: t.estado||"Abierto", prioridad: t.prioridad||"normal" }).select().single();
    if (e1) throw e1;
    if (t.mensajes?.length) { const { error: e2 } = await sb.from("ticket_mensajes").insert(t.mensajes.map(m => ({ ticket_id: tk.id, autor: m.autor, texto: m.texto, ts: m.ts ? new Date(m.ts).toISOString() : new Date().toISOString() }))); if (e2) throw e2; }
    return mapTicket(tk, t.mensajes || []);
  },
  async actualizarEstadoTicket(id, estado) { const { error } = await sb.from("tickets").update({ estado }).eq("id", id); if (error) throw error; },
  async actualizarOrdenIdTicket(id, ordenId) { const { error } = await sb.from("tickets").update({ orden_id: ordenId }).eq("id", id); if (error) throw error; },
  async enviarMensaje(ticketId, autor, texto) { const { data, error } = await sb.from("ticket_mensajes").insert({ ticket_id: ticketId, autor, texto }).select().single(); if (error) throw error; return { autor: data.autor, texto: data.texto, ts: new Date(data.ts).getTime() }; },
  async editarTituloTicket(id, titulo) { const { error } = await sb.from("tickets").update({ titulo }).eq("id", id); if (error) throw error; },
  async eliminarTicket(id) { const { error } = await sb.from("tickets").delete().eq("id", id); if (error) throw error; },

  // ÓRDENES
  async getOrdenes() { const { data, error } = await sb.from("ordenes").select("*").order("fecha_creacion", { ascending: false }); if (error) throw error; return data.map(mapOrden); },
  async crearOrden(o) {
    const { data, error } = await sb.from("ordenes").insert({ ticket_id: o.ticketId||null, cliente_id: o.clienteId||null, cliente_nombre: o.clienteNombre, secretario_id: o.secretarioId||null, tecnico_id: o.tecnicoId||null, tipo: o.tipo, descripcion: o.descripcion||null, direccion: o.direccion||null, telefono_cliente: o.telefonoCliente||null, direccion_anterior: o.direccionAnterior||null, direccion_nueva: o.direccionNueva||null, fecha: o.fecha, hora: o.hora, estado: o.estado||"Pendiente", prioridad: o.prioridad||"normal", es_manual: o.esManual||false, zona_id: o.zonaId||null, datos_instalacion: o.datosInstalacion||null, notas: o.notas||[] }).select().single();
    if (error) throw error; return mapOrden(data);
  },
  async actualizarEstadoOrden(id, estado) { const { error } = await sb.from("ordenes").update({ estado }).eq("id", id); if (error) throw error; },
  async agregarNotaOrden(id, notas) { const { error } = await sb.from("ordenes").update({ notas }).eq("id", id); if (error) throw error; },

  // PROPAGANDA
  async getPropaganda() { const { data, error } = await sb.from("propaganda").select("*").order("created_at"); if (error) throw error; return data.map(mapPropaganda); },
  async upsertPropaganda(p) { const { data, error } = await sb.from("propaganda").upsert({ id: p.id||undefined, categoria: p.categoria, titulo: p.titulo, descripcion: p.descripcion, activo: p.activo, fecha: p.fecha||null, imagen: p.imagen, color: p.color }).select().single(); if (error) throw error; return mapPropaganda(data); },
  async deletePropaganda(id) { const { error } = await sb.from("propaganda").delete().eq("id", id); if (error) throw error; },
  async togglePropaganda(id, activo) { const { error } = await sb.from("propaganda").update({ activo }).eq("id", id); if (error) throw error; },
};

// ══════════════════════════════════════════════════════════════
// ZONAS
// ══════════════════════════════════════════════════════════════
const initialZonas = [
  { id: "z001", nombre: "Vijes", color: "#0ea5e9", activa: true },
  { id: "z002", nombre: "Yumbo", color: "#22c55e", activa: true },
  { id: "z003", nombre: "La Cumbre", color: "#f59e0b", activa: true },
];

// ══════════════════════════════════════════════════════════════
// PLANES (creados por admin, asignados por secretario)
// ══════════════════════════════════════════════════════════════
const initialPlanes = [
  { id: "p001", nombre: "Básico 30MB", precio: 45000, descripcion: "Internet 30MB simétrico", activo: true },
  { id: "p002", nombre: "Estándar 50MB", precio: 65000, descripcion: "Internet 50MB simétrico", activo: true },
  { id: "p003", nombre: "Premium 100MB", precio: 85000, descripcion: "Internet + TV 100MB", activo: true },
  { id: "p004", nombre: "Empresarial 200MB", precio: 250000, descripcion: "Fibra dedicada 200MB + TV + soporte 24/7", activo: true },
];

// ══════════════════════════════════════════════════════════════
// DATOS INICIALES
// ══════════════════════════════════════════════════════════════
const initialUsuarios = [
  { id: "u001", usuario: "admin", clave: "admin123", rol: "admin", nombre: "Administrador", activo: true },
  { id: "u002", usuario: "secretaria1", clave: "sec123", rol: "secretario", nombre: "Laura Pérez", activo: true, zonaId: "z001" },
  { id: "u003", usuario: "tecnico1", clave: "tec123", rol: "tecnico", nombre: "Jorge Ramírez", activo: true, zonaId: "z001" },
  { id: "u004", usuario: "tecnico2", clave: "tec456", rol: "tecnico", nombre: "Andrés Suárez", activo: true, zonaId: "z002" },
  {
    id: "u005", usuario: "12345678", clave: "1234", rol: "cliente", nombre: "Carlos Martínez",
    cedula: "12345678", servicio: "Internet + TV", plan: "Premium 100MB", monto: 85000,
    fechaPago: "2026-04-05", estado: "Al día", tipo: "final", zonaId: "z001",
    direccion: "Calle 5 #3-12 Vijes", claveWifi: "carlos2024", secretarioId: "u002"
  },
  {
    id: "u006", usuario: "87654321", clave: "5678", rol: "cliente", nombre: "Ana López",
    cedula: "87654321", servicio: "Internet", plan: "Básico 30MB", monto: 45000,
    fechaPago: "2026-03-30", estado: "Pendiente", tipo: "final", zonaId: "z001",
    direccion: "Carrera 8 #12-45 Vijes", claveWifi: "ana2024wifi", secretarioId: "u002"
  },
  {
    id: "u007", usuario: "empresa1", clave: "emp123", rol: "cliente", nombre: "Comercial El Éxito Ltda",
    cedula: "900123456", servicio: "Internet + TV", plan: "Empresarial 200MB", monto: 250000,
    fechaPago: "2026-04-01", estado: "Al día", tipo: "empresa", zonaId: "z002",
    direccion: "Av. Industrial #45-67 Yumbo", claveWifi: "exitoltda2024", secretarioId: "u002",
    nombreEmpresa: "GC HOGAR.NET Yumbo"
  },
];

const initialAvisos = [
  { id: 1, tipo: "Mantenimiento", titulo: "Mantenimiento programado", mensaje: "Servicio de Internet suspendido el 27 de marzo 2:00–4:00 AM.", fecha: "2026-03-25", afecta: "Internet", activo: true },
  { id: 2, tipo: "Falla", titulo: "Falla en señal de TV", mensaje: "Trabajamos para restablecer señal canales 15–20. Estimado: 3 horas.", fecha: "2026-03-25", afecta: "TV", activo: true },
];

const initialTickets = [];
const initialOrdenes = [];
const initialPropaganda = [
  {
    id: "pr001", categoria: "promocion", titulo: "🎉 Promoción Especial Abril", descripcion: "Contrata nuestro plan Estándar 50MB y obtén el primer mes gratis. ¡Oferta por tiempo limitado!", activo: true, fecha: "2026-04-30", imagen: "📡", color: "#0ea5e9"
  },
  {
    id: "pr002", categoria: "equipos", titulo: "💻 Venta de Routers", descripcion: "Routers WiFi 6 doble banda disponibles desde $150,000. Compatibles con todos nuestros planes.", activo: true, fecha: "2026-12-31", imagen: "📶", color: "#22c55e"
  },
  {
    id: "pr003", categoria: "camaras", titulo: "📷 Kits de Cámaras de Seguridad", descripcion: "Kits desde 2 hasta 8 cámaras HD con grabación en la nube. Instalación incluida en tu zona.", activo: true, fecha: "2026-12-31", imagen: "🎥", color: "#8b5cf6"
  },
];

// ══════════════════════════════════════════════════════════════
// CONSTANTES Y UTILIDADES
// ══════════════════════════════════════════════════════════════
const ROLES = { admin: "Administrador", secretario: "Secretario/a", tecnico: "Técnico", cliente: "Cliente" };
const ROL_COLOR = { admin: "#8b5cf6", secretario: "#0ea5e9", tecnico: "#f59e0b", cliente: "#22c55e" };
const ESTADO_COLOR = { "Al día": "#22c55e", Pendiente: "#f59e0b", Vencido: "#ef4444" };
const TICKET_COLOR = { Abierto: "#f59e0b", "En proceso": "#3b82f6", Resuelto: "#22c55e" };
const ORDEN_COLOR = { Pendiente: "#f59e0b", "En camino": "#3b82f6", Completada: "#22c55e", Cancelada: "#ef4444" };
const TIPO_COLOR = { Mantenimiento: "#3b82f6", Falla: "#ef4444", Información: "#8b5cf6" };

const TIPOS_ORDEN = ["Revisión / diagnóstico", "Instalación nueva", "Punto adicional de TV", "Punto adicional de Internet", "Cotización", "Traslado / cambio de domicilio", "Reubicación de router", "Otro"];

// Categorías del chat de soporte
const CATEGORIAS_SOPORTE = [
  { id: "solicitudes", emoji: "📋", label: "Solicitudes de servicio" },
  { id: "reportes", emoji: "⚠️", label: "Reportes de daños / fallas" },
];

const SOLICITUDES = [
  { id: "traslado", emoji: "🏠", label: "Traslado / cambio de domicilio", categoria: "solicitudes" },
  { id: "reubicacion_router", emoji: "📶", label: "Reubicación de router", categoria: "solicitudes" },
  { id: "cambio_clave_wifi", emoji: "🔑", label: "Cambio de clave WiFi", categoria: "solicitudes" },
  { id: "instalacion_nueva", emoji: "🔌", label: "Instalación de punto adicional", categoria: "solicitudes" },
];

const PROBLEMAS = [
  { id: "sin_internet", emoji: "🌐", label: "No tengo Internet", afecta: "Internet", categoria: "reportes" },
  { id: "sin_tv", emoji: "📺", label: "No tengo señal de TV", afecta: "TV", categoria: "reportes" },
  { id: "lento", emoji: "🐢", label: "Internet muy lento", afecta: "Internet", categoria: "reportes" },
  { id: "intermitente", emoji: "⚡", label: "Servicio intermitente", afecta: "Internet", categoria: "reportes" },
  { id: "canales", emoji: "📡", label: "Faltan canales de TV", afecta: "TV", categoria: "reportes" },
  { id: "pago", emoji: "💳", label: "Consulta de pago", afecta: null, categoria: "reportes" },
];

const ALL_OPCIONES = [...SOLICITUDES, ...PROBLEMAS];

const PASOS = {
  sin_internet: ["Apaga el router y espera 30 segundos antes de volver a encenderlo.", "Verifica que todos los cables estén bien conectados al router.", "Si persiste puede haber una falla en tu zona.", "Si no se restablece en 10 minutos, reporta la falla abajo."],
  sin_tv: ["Verifica que el decodificador esté encendido y los cables conectados.", "Cambia la entrada HDMI/AV en tu televisor.", "Apaga el decodificador, espera 20 segundos y enciéndelo.", "Si continúa, puede ser falla técnica en tu sector. Repórtala."],
  lento: ["Reinicia el router: apágalo 30 segundos y vuélvelo a encender.", "Conecta tu dispositivo por cable si es posible.", "Verifica que no haya muchos dispositivos en la red.", "Si persiste, repórtalo abajo."],
  intermitente: ["Revisa que el cable no esté doblado ni dañado.", "Reinicia el router y espera 2 minutos.", "Ubica el router lejos de paredes gruesas y electrodomésticos.", "Si se repite, repórtalo para visita técnica."],
  canales: ["Haz búsqueda automática de canales desde el menú del decodificador.", "Verifica que tu plan incluya esos canales.", "Reinicia el decodificador y espera 1-2 min.", "Si siguen faltando, repórtalo abajo."],
  traslado: ["Para solicitar el traslado necesitamos la nueva dirección exacta.", "Indica la fecha deseada de mudanza con al menos 3 días de anticipación.", "Un técnico visitará el nuevo domicilio para revisar viabilidad.", "Completa la solicitud abajo para que el equipo te contacte."],
  reubicacion_router: ["Indica la nueva ubicación deseada del router dentro de tu hogar.", "El técnico evaluará la señal y longitud de cable disponible.", "Esta visita suele durar 30-60 minutos.", "Completa la solicitud y te asignaremos un turno."],
  cambio_clave_wifi: ["Puedes solicitar el cambio de tu clave WiFi aquí.", "La nueva clave debe tener mínimo 8 caracteres.", "Una vez cambiada, todos tus dispositivos deberán reconectarse con la nueva clave.", "Ingresa la nueva clave deseada abajo."],
  instalacion_nueva: ["Indica en qué habitación o espacio deseas el punto adicional.", "El técnico verificará la factibilidad técnica.", "El costo adicional será informado antes de proceder.", "Completa la solicitud abajo."],
};

const formatCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
const formatDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
const formatTime = (ts) => new Date(ts).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const genId = () => Date.now().toString() + Math.random().toString(36).slice(2, 6);

// ══════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ══════════════════════════════════════════════════════════════
const Badge = ({ text, color }) => (
  <span style={{ background: color + "22", color, border: "1px solid " + color + "44", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 20, ...style }}>{children}</div>
);

const Inp = ({ style: s = {}, ...props }) => (
  <input style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", ...s }} {...props} />
);

const Sel = ({ children, style: s = {}, ...props }) => (
  <select style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", ...s }} {...props}>{children}</select>
);

const Btn = ({ children, variant = "primary", style: s = {}, ...props }) => {
  const bg = variant === "primary" ? "#0ea5e9" : variant === "danger" ? "#ef4444" : variant === "success" ? "#22c55e" : variant === "purple" ? "#8b5cf6" : "#1e293b";
  return <button style={{ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, ...s }} {...props}>{children}</button>;
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════
// CHAT TICKET
// ══════════════════════════════════════════════════════════════
function ChatTicket({ ticket, onSend, autorActual, nombreActual, usuarios }) {
  const [texto, setTexto] = useState("");
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket.mensajes]);

  const getNombre = (autorId) => {
    if (autorId === "cliente") return ticket.clienteNombre?.split(" ")[0] || "Cliente";
    const u = usuarios.find(x => x.id === autorId);
    return u ? u.nombre.split(" ")[0] : autorId;
  };

  const enviar = () => {
    if (!texto.trim()) return;
    onSend(ticket.id, texto.trim(), autorActual);
    setTexto("");
  };

  const opcion = ALL_OPCIONES.find(p => p.id === ticket.tipo);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e293b", background: "#0a1628" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16 }}>{opcion?.emoji || "🔧"}</span>
          <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14, flex: 1 }}>{ticket.titulo}</span>
          <Badge text={ticket.estado} color={TICKET_COLOR[ticket.estado]} />
          {ticket.categoria === "solicitudes" && <Badge text="📋 SOLICITUD" color="#0ea5e9" />}
          {ticket.prioridad === "alta" && <Badge text="🔴 EMPRESA" color="#ef4444" />}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          {ticket.clienteNombre} · {formatTime(ticket.fechaCreacion)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {ticket.mensajes.map((m, i) => {
          const esPropio = m.autor === autorActual;
          const esSistema = m.autor === "sistema";
          if (esSistema) return (
            <div key={i} style={{ textAlign: "center" }}>
              <span style={{ background: "#1e293b", color: "#64748b", fontSize: 11, borderRadius: 20, padding: "3px 12px" }}>{m.texto}</span>
            </div>
          );
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: esPropio ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>
                {getNombre(m.autor)} · {formatTime(m.ts)}
              </div>
              <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: esPropio ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: esPropio ? "#0ea5e9" : "#1e293b", color: "#f1f5f9", fontSize: 14, lineHeight: 1.5 }}>
                {m.texto}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {ticket.estado !== "Resuelto" ? (
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b", display: "flex", gap: 8 }}>
          <Inp value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()} placeholder="Escribe un mensaje..." />
          <Btn onClick={enviar} style={{ padding: "10px 16px" }}>Enviar</Btn>
        </div>
      ) : (
        <div style={{ padding: 12, borderTop: "1px solid #1e293b", textAlign: "center", color: "#22c55e", fontSize: 13, fontWeight: 600 }}>✅ Ticket resuelto</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PORTAL CLIENTE (final y empresa)
// ══════════════════════════════════════════════════════════════
function PortalCliente({ usuario, tickets, setTickets, avisos, usuarios, setUsuarios, zonas, propaganda }) {
  const [tab, setTab] = useState("info");
  // Navegación del chat: null = categorías, "solicitudes"/"reportes" = subcategorias, objeto = detalle
  const [categoriaChat, setCategoriaChat] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [reportado, setReportado] = useState(false);
  const [ticketAbierto, setTicketAbierto] = useState(null);
  const [nuevaClave, setNuevaClave] = useState("");
  const [claveEnviada, setClaveEnviada] = useState(false);
  const [editandoTicket, setEditandoTicket] = useState(null); // { id, texto }
  const [confirmDeleteTicket, setConfirmDeleteTicket] = useState(null);

  const esEmpresa = usuario.tipo === "empresa";
  const misTickets = tickets.filter(t => t.clienteId === usuario.id);
  const conRespuesta = misTickets.filter(t => t.estado !== "Resuelto" && t.mensajes[t.mensajes.length - 1]?.autor !== "cliente").length;
  const avisosActivos = avisos.filter(a => a.activo);
  const zonaUsuario = zonas.find(z => z.id === usuario.zonaId);

  const crearTicket = async (extra = {}) => {
    const nuevo = {
      clienteId: usuario.id, clienteNombre: usuario.nombre,
      tipo: seleccion.id, titulo: seleccion.label,
      categoria: seleccion.categoria,
      estado: "Abierto",
      prioridad: esEmpresa ? "alta" : "normal",
      mensajes: [{ autor: "cliente", texto: extra.texto || ("Solicitud: " + seleccion.label + ". " + (seleccion.categoria === "solicitudes" ? "Por favor gestionar." : "Ya intenté los pasos básicos.")), ts: Date.now() }],
      ...extra
    };
    try {
      const guardado = await db.crearTicket(nuevo);
      setTickets(p => [...p, guardado]);
      setReportado(true);
    } catch (err) { console.error("Error creando ticket:", err); }
  };

  const solicitarCambioWifi = async () => {
    if (!nuevaClave.trim() || nuevaClave.length < 8) return;
    try {
      const uActualizado = await db.updateClaveWifi(usuario.id, nuevaClave.trim());
      setUsuarios(p => p.map(u => u.id === usuario.id ? uActualizado : u));
      const nuevoTicket = {
        clienteId: usuario.id, clienteNombre: usuario.nombre,
        tipo: "cambio_clave_wifi", titulo: "Cambio de clave WiFi",
        categoria: "solicitudes", estado: "Abierto",
        prioridad: esEmpresa ? "alta" : "normal",
        mensajes: [
          { autor: "cliente", texto: `Solicito cambio de clave WiFi. Nueva clave registrada: ${nuevaClave.trim()}`, ts: Date.now() },
          { autor: "sistema", texto: `Clave WiFi actualizada y registrada en el sistema.`, ts: Date.now() + 1 }
        ]
      };
      const guardado = await db.crearTicket(nuevoTicket);
      setTickets(p => [...p, guardado]);
      setClaveEnviada(true);
    } catch (err) { console.error("Error cambio WiFi:", err); }
  };

  const enviarMsg = async (ticketId, texto, autor) => {
    try {
      const msg = await db.enviarMensaje(ticketId, autor, texto);
      setTickets(p => p.map(t => t.id === ticketId ? { ...t, mensajes: [...t.mensajes, msg] } : t));
    } catch (err) { console.error("Error enviando mensaje:", err); }
  };

  const resetChat = () => { setCategoriaChat(null); setSeleccion(null); setReportado(false); setClaveEnviada(false); setNuevaClave(""); };

  const eliminarTicket = async (id) => {
    try { await db.eliminarTicket(id); setTickets(p => p.filter(t => t.id !== id)); setConfirmDeleteTicket(null); }
    catch (err) { console.error("Error eliminando ticket:", err); }
  };
  const guardarEdicionTicket = async () => {
    if (!editandoTicket || !editandoTicket.texto.trim()) return;
    try {
      await db.editarTituloTicket(editandoTicket.id, editandoTicket.texto.trim());
      setTickets(p => p.map(t => t.id === editandoTicket.id ? { ...t, titulo: editandoTicket.texto.trim() } : t));
      setEditandoTicket(null);
    } catch (err) { console.error("Error editando ticket:", err); }
  };

  if (ticketAbierto) {
    const t = tickets.find(x => x.id === ticketAbierto);
    if (!t) { setTicketAbierto(null); return null; }
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px" }}>
        <button onClick={() => setTicketAbierto(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 12 }}>← Mis reportes</button>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", height: 500 }}>
          <ChatTicket ticket={t} onSend={enviarMsg} autorActual="cliente" nombreActual={usuario.nombre} usuarios={usuarios} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
      {esEmpresa && (
        <div style={{ background: "#8b5cf622", border: "1px solid #8b5cf644", borderLeft: "4px solid #8b5cf6", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>🏢</span>
          <div>
            <span style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 600 }}>Cliente Empresarial · Atención prioritaria garantizada</span>
            {usuario.nombreEmpresa && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{usuario.nombreEmpresa}</div>}
          </div>
        </div>
      )}

      {avisosActivos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {avisosActivos.map(a => (
            <div key={a.id} style={{ background: TIPO_COLOR[a.tipo] + "22", border: "1px solid " + TIPO_COLOR[a.tipo] + "44", borderLeft: "4px solid " + TIPO_COLOR[a.tipo], borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                <span>{a.tipo === "Falla" ? "⚠️" : a.tipo === "Mantenimiento" ? "🔧" : "ℹ️"}</span>
                <span style={{ fontWeight: 700, color: TIPO_COLOR[a.tipo], fontSize: 13 }}>{a.titulo}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>Afecta: {a.afecta}</span>
              </div>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13 }}>{a.mensaje}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#0f172a", borderRadius: 10, padding: 4 }}>
        {[["info", "📋 Mi cuenta"], ["soporte", "🛠️ Soporte"], ["promo", "🎁 Promociones"]].map(([k, v]) => (
          <button key={k} onClick={() => { setTab(k); resetChat(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? "#0ea5e9" : "transparent", color: tab === k ? "#fff" : "#64748b", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {v}
            {k === "soporte" && conRespuesta > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{conRespuesta}</span>}
          </button>
        ))}
      </div>

      {tab === "promo" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🎁</div>
            <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 17 }}>Promociones y Servicios</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Descubre nuestras ofertas exclusivas</div>
          </div>
          {propaganda.filter(p => p.activo).length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569", padding: 40, fontSize: 14 }}>Sin promociones activas por el momento.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {propaganda.filter(p => p.activo).map(p => (
                <div key={p.id} style={{ background: "#0f172a", border: "1px solid " + p.color + "44", borderLeft: "4px solid " + p.color, borderRadius: 14, padding: 18, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 10, right: 14, fontSize: 40, opacity: 0.12 }}>{p.imagen}</div>
                  <div style={{ display: "flex", align: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{p.imagen}</span>
                    <div>
                      <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 15 }}>{p.titulo}</div>
                      <Badge text={p.categoria === "promocion" ? "🏷️ Promoción" : p.categoria === "equipos" ? "🖥️ Equipos" : "📷 Cámaras"} color={p.color} />
                    </div>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>{p.descripcion}</p>
                  {p.fecha && <div style={{ fontSize: 11, color: "#475569" }}>⏳ Válido hasta: {formatDate(p.fecha)}</div>}
                  <div style={{ marginTop: 12 }}>
                    <Btn style={{ fontSize: 13, padding: "8px 16px", background: p.color }}>📞 Consultar ahora</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Servicio activo</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{usuario.servicio}</div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>Plan: {usuario.plan}</div>
            {zonaUsuario && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>📍 Zona: <span style={{ color: zonaUsuario.color }}>{zonaUsuario.nombre}</span></div>}
          </Card>
          <Card style={{ border: "1px solid " + ESTADO_COLOR[usuario.estado] + "44" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Próximo pago</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{formatCOP(usuario.monto)}</div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Vence: {formatDate(usuario.fechaPago)}</div>
              </div>
              <Badge text={usuario.estado} color={ESTADO_COLOR[usuario.estado]} />
            </div>
          </Card>
          {usuario.direccion && (
            <Card>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Dirección de instalación</div>
              <div style={{ fontSize: 14, color: "#f1f5f9" }}>📍 {usuario.direccion}</div>
            </Card>
          )}
          {usuario.claveWifi && (
            <Card style={{ border: "1px solid #0ea5e944" }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Clave WiFi registrada</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0ea5e9", letterSpacing: 2 }}>🔑 {usuario.claveWifi}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Para cambiarla ve a Soporte → Cambio de clave WiFi</div>
            </Card>
          )}
        </div>
      )}

      {tab === "soporte" && (
        <>
          {/* NIVEL 1: Selección de categoría */}
          {!categoriaChat && !seleccion && (
            <div>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 14px", textAlign: "center" }}>
                Hola <strong style={{ color: "#f1f5f9" }}>{usuario.nombre.split(" ")[0]}</strong>, ¿qué necesitas?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
                {CATEGORIAS_SOPORTE.map(cat => (
                  <button key={cat.id} onClick={() => setCategoriaChat(cat.id)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, color: "#f1f5f9", padding: "16px 18px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontSize: 15, fontWeight: 700 }}>
                    <span style={{ fontSize: 24 }}>{cat.emoji}</span>
                    <div>
                      <div>{cat.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400, marginTop: 2 }}>
                        {cat.id === "solicitudes" ? "Traslados, reubicaciones, cambio de clave WiFi" : "Problemas técnicos, consultas de pago"}
                      </div>
                    </div>
                    <span style={{ marginLeft: "auto", color: "#475569" }}>›</span>
                  </button>
                ))}
              </div>
              {misTickets.length > 0 && (
                <div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Mis solicitudes y reportes</div>
                  {[...misTickets].reverse().map(t => {
                    const ult = t.mensajes[t.mensajes.length - 1];
                    const hay = ult?.autor !== "cliente" && ult?.autor !== "sistema" && t.estado !== "Resuelto";
                    const puedeEditar = t.estado === "Abierto";
                    return (
                      <div key={t.id}>
                        {editandoTicket?.id === t.id ? (
                          <div style={{ background: "#1e293b", border: "1px solid #0ea5e944", borderRadius: 12, padding: 14, marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>✏️ Editar solicitud:</div>
                            <Inp value={editandoTicket.texto} onChange={e => setEditandoTicket({ ...editandoTicket, texto: e.target.value })} style={{ marginBottom: 10 }} />
                            <div style={{ display: "flex", gap: 8 }}>
                              <Btn onClick={guardarEdicionTicket} style={{ fontSize: 12, padding: "6px 14px" }}>Guardar</Btn>
                              <Btn variant="ghost" onClick={() => setEditandoTicket(null)} style={{ fontSize: 12, padding: "6px 14px" }}>Cancelar</Btn>
                            </div>
                          </div>
                        ) : (
                          <div key={t.id} style={{ background: hay ? "#1e293b" : "#0f172a", border: hay ? "1px solid #0ea5e944" : "1px solid #1e293b", borderLeft: "4px solid " + (hay ? "#0ea5e9" : TICKET_COLOR[t.estado]), borderRadius: 12, padding: "11px 14px", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span onClick={() => setTicketAbierto(t.id)} style={{ cursor: "pointer" }}>{ALL_OPCIONES.find(p => p.id === t.tipo)?.emoji || "🔧"}</span>
                              <span onClick={() => setTicketAbierto(t.id)} style={{ fontWeight: 600, color: "#f1f5f9", flex: 1, fontSize: 13, cursor: "pointer" }}>{t.titulo}</span>
                              {t.categoria === "solicitudes" && <Badge text="Solicitud" color="#0ea5e9" />}
                              <Badge text={t.estado} color={TICKET_COLOR[t.estado]} />
                              {puedeEditar && (
                                <>
                                  <button onClick={() => setEditandoTicket({ id: t.id, texto: t.titulo })} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                                  <button onClick={() => setConfirmDeleteTicket(t.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>🗑️</button>
                                </>
                              )}
                            </div>
                            {hay && <div style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700, marginTop: 4 }}>● Nueva respuesta del soporte</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Modal confirmación eliminar */}
                  {confirmDeleteTicket && (
                    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: 28, maxWidth: 360, textAlign: "center" }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
                        <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>¿Eliminar esta solicitud?</div>
                        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>Esta acción no se puede deshacer.</div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                          <Btn variant="danger" onClick={() => eliminarTicket(confirmDeleteTicket)} style={{ fontSize: 13 }}>Sí, eliminar</Btn>
                          <Btn variant="ghost" onClick={() => setConfirmDeleteTicket(null)} style={{ fontSize: 13 }}>Cancelar</Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NIVEL 2: Subcategoría seleccionada */}
          {categoriaChat && !seleccion && (
            <div>
              <button onClick={() => setCategoriaChat(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 14 }}>← Volver</button>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 12px" }}>
                {categoriaChat === "solicitudes" ? "📋 Selecciona el tipo de solicitud:" : "⚠️ ¿Cuál es el problema?"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {ALL_OPCIONES.filter(o => o.categoria === categoriaChat).map(op => (
                  <button key={op.id} onClick={() => { setSeleccion(op); setReportado(false); setClaveEnviada(false); }} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, color: "#f1f5f9", padding: "13px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}>
                    <span style={{ fontSize: 20 }}>{op.emoji}</span>{op.label}
                    <span style={{ marginLeft: "auto", color: "#475569" }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NIVEL 3: Detalle de consulta de pago */}
          {seleccion && seleccion.id === "pago" && (
            <div>
              <button onClick={() => setSeleccion(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 14 }}>← Volver</button>
              <Card>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tu próximo pago</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#f1f5f9" }}>{formatCOP(usuario.monto)}</div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Vence: {formatDate(usuario.fechaPago)}</div>
                <div style={{ marginTop: 10 }}><Badge text={usuario.estado} color={ESTADO_COLOR[usuario.estado]} /></div>
              </Card>
            </div>
          )}

          {/* NIVEL 3: Cambio de clave WiFi */}
          {seleccion && seleccion.id === "cambio_clave_wifi" && (
            <div>
              <button onClick={() => setSeleccion(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 14 }}>← Volver</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>🔑</span>
                <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 16 }}>Cambio de clave WiFi</h3>
              </div>
              {usuario.claveWifi && (
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Clave actual registrada:</div>
                  <div style={{ fontSize: 16, color: "#f59e0b", fontWeight: 700 }}>{usuario.claveWifi}</div>
                </Card>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {(PASOS[seleccion.id] || []).map((paso, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, background: "#1e293b", borderRadius: 12, padding: "10px 14px", alignItems: "flex-start" }}>
                    <span style={{ background: "#0ea5e9", color: "#fff", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>{paso}</span>
                  </div>
                ))}
              </div>
              {claveEnviada ? (
                <div style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#22c55e" }}>¡Clave registrada exitosamente!</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Tu nueva clave WiFi ha sido guardada y el equipo técnico la aplicará en tu router.</div>
                  <Btn onClick={resetChat} style={{ marginTop: 12, fontSize: 13 }}>Ver mis solicitudes</Btn>
                </div>
              ) : (
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 14 }}>
                  <Field label="Nueva clave WiFi (mínimo 8 caracteres)">
                    <Inp value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Ej: MiClave2024" type="text" />
                  </Field>
                  {nuevaClave.length > 0 && nuevaClave.length < 8 && (
                    <div style={{ color: "#f59e0b", fontSize: 12, marginBottom: 8 }}>⚠️ La clave debe tener mínimo 8 caracteres</div>
                  )}
                  <Btn onClick={solicitarCambioWifi} disabled={nuevaClave.length < 8} style={{ width: "100%", fontSize: 14 }}>🔑 Guardar nueva clave WiFi</Btn>
                </div>
              )}
            </div>
          )}

          {/* NIVEL 3: Solicitudes (traslado, reubicación, instalación) */}
          {seleccion && seleccion.categoria === "solicitudes" && seleccion.id !== "cambio_clave_wifi" && (
            <div>
              <button onClick={() => setSeleccion(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 14 }}>← Volver</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>{seleccion.emoji}</span>
                <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 16 }}>{seleccion.label}</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {(PASOS[seleccion.id] || []).map((paso, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, background: "#1e293b", borderRadius: 12, padding: "10px 14px", alignItems: "flex-start" }}>
                    <span style={{ background: "#8b5cf6", color: "#fff", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>{paso}</span>
                  </div>
                ))}
              </div>
              {reportado ? (
                <div style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#22c55e" }}>¡Solicitud enviada!</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>El equipo te contactará pronto para coordinar.</div>
                  <Btn onClick={resetChat} style={{ marginTop: 12, fontSize: 13 }}>Ver mis solicitudes</Btn>
                </div>
              ) : (
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <Btn variant="purple" onClick={() => crearTicket()} style={{ width: "100%", fontSize: 14 }}>{seleccion.emoji} Enviar solicitud</Btn>
                </div>
              )}
            </div>
          )}

          {/* NIVEL 3: Reportes de problemas técnicos */}
          {seleccion && seleccion.categoria === "reportes" && seleccion.id !== "pago" && (
            <div>
              <button onClick={() => { setSeleccion(null); setReportado(false); }} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 14 }}>← Volver</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>{seleccion.emoji}</span>
                <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 16 }}>{seleccion.label}</h3>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Intenta estos pasos primero:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {(PASOS[seleccion.id] || []).map((paso, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, background: "#1e293b", borderRadius: 12, padding: "10px 14px", alignItems: "flex-start" }}>
                    <span style={{ background: "#0ea5e9", color: "#fff", borderRadius: "50%", width: 22, height: 22, minWidth: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>{paso}</span>
                  </div>
                ))}
              </div>
              {reportado ? (
                <div style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "#22c55e" }}>¡Reporte enviado!</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>El equipo te responderá pronto.</div>
                  <Btn onClick={resetChat} style={{ marginTop: 12, fontSize: 13 }}>Ver mis reportes</Btn>
                </div>
              ) : (
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 10px" }}>¿No se resolvió?</p>
                  <Btn variant="danger" onClick={() => crearTicket()} style={{ width: "100%", fontSize: 14 }}>📢 Reportar falla al soporte</Btn>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PORTAL SECRETARIO
// ══════════════════════════════════════════════════════════════
function PortalSecretario({ usuario, tickets, setTickets, ordenes, setOrdenes, usuarios, setUsuarios, avisos, setAvisos, planes, zonas, propaganda }) {
  const [tab, setTab] = useState("tickets");
  const [ticketAbierto, setTicketAbierto] = useState(null);
  const [modalOrden, setModalOrden] = useState(null);
  const [nuevaOrden, setNuevaOrden] = useState({ tipo: "Revisión / diagnóstico", descripcion: "", tecnicoId: "", fecha: new Date().toISOString().split("T")[0], hora: "08:00", otro: "" });
  const [showModalOrdenManual, setShowModalOrdenManual] = useState(false);
  const [ordenManual, setOrdenManual] = useState({ tipo: "Revisión / diagnóstico", descripcion: "", tecnicoId: "", fecha: new Date().toISOString().split("T")[0], hora: "08:00", otro: "", clienteExistente: "", esInstalacionNueva: false, nuevoNombre: "", nuevaCedula: "", nuevoTelefono: "", nuevaDireccion: "", nuevoCorreo: "" });
  const [erroresOrdenManual, setErroresOrdenManual] = useState({});
  const [editCliente, setEditCliente] = useState(null);
  const [showFormCliente, setShowFormCliente] = useState(false);
  const [editAviso, setEditAviso] = useState(null);
  const [showFormAviso, setShowFormAviso] = useState(false);
  const [busqCliente, setBusqCliente] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // La zona del secretario
  const zonaSecretario = zonas.find(z => z.id === usuario.zonaId);

  const emptyCliente = {
    id: "", usuario: "", clave: "", rol: "cliente", nombre: "", tipo: "final",
    cedula: "", servicio: "Internet", plan: "", monto: "", fechaPago: "",
    estado: "Al día", activo: true, zonaId: usuario.zonaId, secretarioId: usuario.id,
    direccion: "", claveWifi: "", telefono: ""
  };
  const emptyAviso = { id: "", tipo: "Información", titulo: "", mensaje: "", fecha: new Date().toISOString().split("T")[0], afecta: "Internet", activo: true };

  const saveCliente = async (u) => {
    const clienteConZona = { ...u, zonaId: usuario.zonaId, secretarioId: usuario.id };
    try {
      const guardado = await db.upsertUsuario(clienteConZona);
      setUsuarios(p => p.find(x => x.id === guardado.id) ? p.map(x => x.id === guardado.id ? guardado : x) : [...p, guardado]);
      setShowFormCliente(false); setEditCliente(null);
    } catch (err) { console.error("Error guardando cliente:", err); }
  };
  const deleteCliente = async (id) => {
    try { await db.deleteUsuario(id); setUsuarios(p => p.filter(u => u.id !== id)); }
    catch (err) { console.error("Error eliminando cliente:", err); }
  };
  const toggleCliente = async (id) => {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    try { await db.toggleUsuario(id, !u.activo); setUsuarios(p => p.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling cliente:", err); }
  };

  const saveAviso = async (a) => {
    try {
      const guardado = await db.upsertAviso(a);
      setAvisos(p => p.find(x => x.id === guardado.id) ? p.map(x => x.id === guardado.id ? guardado : x) : [...p, guardado]);
      setShowFormAviso(false); setEditAviso(null);
    } catch (err) { console.error("Error guardando aviso:", err); }
  };
  const deleteAviso = async (id) => {
    try { await db.deleteAviso(id); setAvisos(p => p.filter(a => a.id !== id)); }
    catch (err) { console.error("Error eliminando aviso:", err); }
  };
  const toggleAviso = async (id) => {
    const a = avisos.find(x => x.id === id);
    if (!a) return;
    try { await db.toggleAviso(id, !a.activo); setAvisos(p => p.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling aviso:", err); }
  };

  // Solo tecnicos de la misma zona
  const tecnicos = usuarios.filter(u => u.rol === "tecnico" && u.activo && u.zonaId === usuario.zonaId);
  // Solo clientes de la misma zona
  const clientes = usuarios.filter(u => u.rol === "cliente" && u.zonaId === usuario.zonaId);
  const clientesFiltrados = clientes.filter(c => {
    const q = busqCliente.toLowerCase().trim();
    const matchQ = !q || c.nombre?.toLowerCase().includes(q) || c.cedula?.toLowerCase().includes(q) || c.usuario?.toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" ? true : filtroTipo === "inactivo" ? !c.activo : c.tipo === filtroTipo;
    return matchQ && matchTipo;
  });
  const pendientes = tickets.filter(t => t.estado === "Abierto").sort((a, b) => (b.prioridad === "alta" ? 1 : 0) - (a.prioridad === "alta" ? 1 : 0));
  const enProceso = tickets.filter(t => t.estado === "En proceso");
  const resueltos = tickets.filter(t => t.estado === "Resuelto").sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  const misOrdenes = ordenes.filter(o => o.secretarioId === usuario.id);

  const enviarMsg = async (ticketId, texto, autor) => {
    try {
      const msg = await db.enviarMensaje(ticketId, autor, texto);
      await db.actualizarEstadoTicket(ticketId, "En proceso");
      setTickets(p => p.map(t => t.id === ticketId
        ? { ...t, mensajes: [...t.mensajes, msg], estado: "En proceso" }
        : t
      ));
    } catch (err) { console.error("Error enviando mensaje:", err); }
  };

  const cambiarEstadoTicket = async (ticketId, estado) => {
    try { await db.actualizarEstadoTicket(ticketId, estado); setTickets(p => p.map(t => t.id === ticketId ? { ...t, estado } : t)); }
    catch (err) { console.error("Error cambiando estado ticket:", err); }
  };

  const crearOrden = async () => {
    if (!nuevaOrden.tecnicoId) return;
    const cliente = usuarios.find(u => u.id === modalOrden.clienteId);
    const esTraslado = nuevaOrden.tipo === "Traslado / cambio de domicilio";
    const ordenData = {
      ticketId: modalOrden.id, clienteId: modalOrden.clienteId,
      clienteNombre: modalOrden.clienteNombre, secretarioId: usuario.id,
      tecnicoId: nuevaOrden.tecnicoId,
      tipo: nuevaOrden.tipo === "Otro" ? (nuevaOrden.otro || "Otro") : nuevaOrden.tipo,
      descripcion: nuevaOrden.descripcion,
      direccion: cliente?.direccion || "Sin dirección registrada",
      telefonoCliente: cliente?.telefono || null,
      ...(esTraslado && nuevaOrden.nuevaDireccionTraslado ? { direccionAnterior: cliente?.direccion, direccionNueva: nuevaOrden.nuevaDireccionTraslado } : {}),
      fecha: nuevaOrden.fecha, hora: nuevaOrden.hora,
      estado: "Pendiente", prioridad: modalOrden.prioridad,
      notas: [], zonaId: usuario.zonaId
    };
    try {
      const orden = await db.crearOrden(ordenData);
      setOrdenes(p => [...p, orden]);
      await db.actualizarEstadoTicket(modalOrden.id, "En proceso");
      await db.actualizarOrdenIdTicket(modalOrden.id, orden.id);
      setTickets(p => p.map(t => t.id === modalOrden.id ? { ...t, estado: "En proceso", ordenId: orden.id } : t));
      setModalOrden(null);
      setNuevaOrden({ tipo: "Revisión / diagnóstico", descripcion: "", tecnicoId: "", fecha: new Date().toISOString().split("T")[0], hora: "08:00", otro: "", nuevaDireccionTraslado: "" });
    } catch (err) { console.error("Error creando orden:", err); }
  };

  // Seleccionar plan y auto-llenar monto
  const aplicarPlan = (planId) => {
    const plan = planes.find(p => p.id === planId);
    if (plan) setEditCliente(prev => ({ ...prev, plan: plan.nombre, monto: plan.precio }));
  };

  const crearOrdenManual = async () => {
    const errs = {};
    const esNueva = ordenManual.tipo === "Instalación nueva";
    if (esNueva) {
      if (!ordenManual.nuevoNombre.trim()) errs.nuevoNombre = true;
      if (!ordenManual.nuevaCedula.trim()) errs.nuevaCedula = true;
      if (!ordenManual.nuevoTelefono.trim()) errs.nuevoTelefono = true;
      if (!ordenManual.nuevaDireccion.trim()) errs.nuevaDireccion = true;
    } else {
      if (!ordenManual.clienteExistente) errs.clienteExistente = true;
    }
    if (!ordenManual.tecnicoId) errs.tecnicoId = true;
    if (Object.keys(errs).length > 0) { setErroresOrdenManual(errs); return; }
    setErroresOrdenManual({});

    let clienteNombre, clienteDireccion, clienteId, telefonoCliente;
    if (esNueva) {
      clienteNombre = ordenManual.nuevoNombre.trim();
      clienteDireccion = ordenManual.nuevaDireccion.trim();
      clienteId = null;
      telefonoCliente = ordenManual.nuevoTelefono.trim();
    } else {
      const c = usuarios.find(u => u.id === ordenManual.clienteExistente);
      clienteNombre = c?.nombre || "Sin nombre";
      clienteDireccion = c?.direccion || "Sin dirección";
      clienteId = c?.id || null;
      telefonoCliente = c?.telefono || null;
    }

    const esTraslado = ordenManual.tipo === "Traslado / cambio de domicilio";
    const orden = {
      id: genId(), ticketId: null, clienteId,
      clienteNombre, secretarioId: usuario.id,
      tecnicoId: ordenManual.tecnicoId,
      tipo: ordenManual.tipo === "Otro" ? (ordenManual.otro || "Otro") : ordenManual.tipo,
      descripcion: ordenManual.descripcion,
      direccion: clienteDireccion,
      telefonoCliente,
      ...(esTraslado && ordenManual.nuevaDireccionTraslado ? { direccionAnterior: clienteDireccion, direccionNueva: ordenManual.nuevaDireccionTraslado } : {}),
      fecha: ordenManual.fecha, hora: ordenManual.hora,
      estado: "Pendiente", prioridad: "normal",
      fechaCreacion: Date.now(), notas: [], zonaId: usuario.zonaId,
      esManual: true,
      ...(esNueva ? {
        datosInstalacion: {
          nombre: ordenManual.nuevoNombre.trim(),
          cedula: ordenManual.nuevaCedula.trim(),
          telefono: ordenManual.nuevoTelefono.trim(),
          direccion: ordenManual.nuevaDireccion.trim(),
          correo: ordenManual.nuevoCorreo.trim() || null,
        }
      } : {})
    };
    try {
      const guardada = await db.crearOrden(orden);
      setOrdenes(p => [...p, guardada]);
      setShowModalOrdenManual(false);
      setOrdenManual({ tipo: "Revisión / diagnóstico", descripcion: "", tecnicoId: "", fecha: new Date().toISOString().split("T")[0], hora: "08:00", otro: "", clienteExistente: "", esInstalacionNueva: false, nuevoNombre: "", nuevaCedula: "", nuevoTelefono: "", nuevaDireccion: "", nuevoCorreo: "", nuevaDireccionTraslado: "" });
    } catch (err) { console.error("Error creando orden manual:", err); }
  };

  if (ticketAbierto) {
    const t = tickets.find(x => x.id === ticketAbierto);
    if (!t) { setTicketAbierto(null); return null; }
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setTicketAbierto(null)} style={{ background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, padding: 0 }}>← Tickets</button>
          <div style={{ flex: 1 }} />
          <Sel style={{ width: "auto" }} value={t.estado} onChange={e => cambiarEstadoTicket(t.id, e.target.value)}>
            <option>Abierto</option><option>En proceso</option><option>Resuelto</option>
          </Sel>
          {!t.ordenId && <Btn onClick={() => setModalOrden(t)} style={{ fontSize: 13, padding: "7px 14px" }}>🔧 Crear orden</Btn>}
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", height: 500 }}>
          <ChatTicket ticket={t} onSend={enviarMsg} autorActual={usuario.id} nombreActual={usuario.nombre} usuarios={usuarios} />
        </div>
      </div>
    );
  }

  const TabTickets = ({ lista, titulo }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{titulo} ({lista.length})</div>
      {lista.length === 0 ? <div style={{ color: "#334155", fontSize: 13, padding: "10px 0" }}>Sin tickets</div> : lista.map(t => {
        const ult = t.mensajes[t.mensajes.length - 1];
        const opcion = ALL_OPCIONES.find(p => p.id === t.tipo);
        return (
          <div key={t.id} onClick={() => setTicketAbierto(t.id)} style={{ background: "#0f172a", border: "1px solid " + (t.prioridad === "alta" ? "#8b5cf644" : "#1e293b"), borderLeft: "4px solid " + (t.prioridad === "alta" ? "#8b5cf6" : TICKET_COLOR[t.estado]), borderRadius: 12, padding: "11px 14px", cursor: "pointer", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{opcion?.emoji || "🔧"}</span>
              {t.numero && <span style={{ fontSize: 11, color: "#475569", fontWeight: 700, background: "#1e293b", borderRadius: 6, padding: "1px 7px" }}>#{t.numero}</span>}
              <span style={{ fontWeight: 700, color: "#f1f5f9", flex: 1, fontSize: 14 }}>{t.titulo}</span>
              {t.categoria === "solicitudes" && <Badge text="📋 Solicitud" color="#0ea5e9" />}
              {t.prioridad === "alta" && <Badge text="🏢 PRIORIDAD" color="#8b5cf6" />}
              <Badge text={t.estado} color={TICKET_COLOR[t.estado]} />
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t.clienteNombre} · {formatTime(t.fechaCreacion)}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{ult?.texto?.slice(0, 60)}{(ult?.texto?.length || 0) > 60 ? "..." : ""}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
      {zonaSecretario && (
        <div style={{ background: zonaSecretario.color + "22", border: "1px solid " + zonaSecretario.color + "44", borderRadius: 10, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📍</span>
          <span style={{ color: zonaSecretario.color, fontSize: 13, fontWeight: 700 }}>Zona: {zonaSecretario.nombre}</span>
          <span style={{ color: "#64748b", fontSize: 12 }}>· Solo ves clientes y técnicos de tu zona</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0f172a", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {[["tickets", "🎫 Tickets", pendientes.length], ["ordenes", "📋 Órdenes", 0], ["clientes", "👥 Clientes", 0], ["avisos", "📢 Avisos", 0], ["promo", "🎁 Promos", 0]].map(([k, v, badge]) => (
          <button key={k} onClick={() => { setTab(k); setShowFormCliente(false); setShowFormAviso(false); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? "#0ea5e9" : "transparent", color: tab === k ? "#fff" : "#64748b", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 60 }}>
            {v}{badge > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{badge}</span>}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        <div>
          <TabTickets lista={pendientes} titulo="🔴 Abiertos (prioridad empresa primero)" />
          <TabTickets lista={enProceso} titulo="🔵 En proceso" />
          <TabTickets lista={resueltos} titulo="✅ Resueltos" />
        </div>
      )}

      {tab === "ordenes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{misOrdenes.length} órdenes creadas por ti</div>
            <Btn onClick={() => setShowModalOrdenManual(true)} style={{ fontSize: 13, padding: "8px 14px" }}>➕ Nueva orden manual</Btn>
          </div>
          {misOrdenes.length === 0 ? <div style={{ color: "#334155", textAlign: "center", padding: 40 }}>Aún no has creado órdenes.<br /><span style={{ fontSize: 13 }}>Usa "Nueva orden manual" o abre un ticket y presiona "Crear orden".</span></div> : [...misOrdenes].reverse().map(o => {
            const tecnico = usuarios.find(u => u.id === o.tecnicoId);
            return (
              <div key={o.id} style={{ background: "#0f172a", border: "1px solid " + (o.prioridad === "alta" ? "#8b5cf633" : "#1e293b"), borderLeft: "4px solid " + ORDEN_COLOR[o.estado], borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{o.tipo}</span>
                  {o.esManual && <Badge text="✍️ Manual" color="#f59e0b" />}
                  {o.prioridad === "alta" && <Badge text="🏢 Empresa" color="#8b5cf6" />}
                  <Badge text={o.estado} color={ORDEN_COLOR[o.estado]} />
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  👤 {o.clienteNombre} · 🔧 {tecnico?.nombre || "Sin asignar"} · 📅 {o.fecha} {o.hora}
                </div>
                {o.direccion && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>📍 {o.direccion}</div>}
                {o.descripcion && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{o.descripcion}</div>}
                {o.datosInstalacion && (
                  <div style={{ background: "#0ea5e911", border: "1px solid #0ea5e922", borderRadius: 8, padding: "8px 10px", marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: "#0ea5e9", fontWeight: 700 }}>📋 Datos instalación nueva: </span>
                    <span style={{ color: "#94a3b8" }}>CC: {o.datosInstalacion.cedula} · Tel: {o.datosInstalacion.telefono}{o.datosInstalacion.correo ? " · " + o.datosInstalacion.correo : ""}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "clientes" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Inp placeholder="🔍  Buscar..." value={busqCliente} onChange={e => setBusqCliente(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            {busqCliente && <button onClick={() => setBusqCliente("")} style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>}
            <Sel value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
              <option value="todos">Todos</option>
              <option value="final">Solo finales</option>
              <option value="empresa">Solo empresas</option>
              <option value="inactivo">Inactivos</option>
            </Sel>
            <Btn onClick={() => { setEditCliente(emptyCliente); setShowFormCliente(true); }} style={{ fontSize: 13 }}>+ Nuevo</Btn>
          </div>
          <div style={{ color: "#475569", fontSize: 12, marginBottom: 10 }}>{clientesFiltrados.length} de {clientes.length} clientes</div>
          {showFormCliente && editCliente && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>{editCliente.id ? "Editar cliente" : "Nuevo cliente"} — Zona: {zonaSecretario?.nombre}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="Nombre completo"><Inp value={editCliente.nombre} onChange={e => setEditCliente({ ...editCliente, nombre: e.target.value })} /></Field>
                <Field label="Tipo de cliente">
                  <Sel value={editCliente.tipo || "final"} onChange={e => setEditCliente({ ...editCliente, tipo: e.target.value })}>
                    <option value="final">Cliente final</option>
                    <option value="empresa">Cliente empresa</option>
                  </Sel>
                </Field>
                <Field label="Usuario (login)"><Inp value={editCliente.usuario} onChange={e => setEditCliente({ ...editCliente, usuario: e.target.value })} placeholder="Ej: 12345678" /></Field>
                <Field label="Clave de acceso"><Inp value={editCliente.clave} onChange={e => setEditCliente({ ...editCliente, clave: e.target.value })} placeholder="Clave de acceso" /></Field>
                <Field label="Cédula / NIT"><Inp value={editCliente.cedula || ""} onChange={e => setEditCliente({ ...editCliente, cedula: e.target.value })} /></Field>
                <Field label="Teléfono"><Inp value={editCliente.telefono || ""} onChange={e => setEditCliente({ ...editCliente, telefono: e.target.value })} placeholder="Ej: 3001234567" /></Field>
                <Field label="Dirección de domicilio"><Inp value={editCliente.direccion || ""} onChange={e => setEditCliente({ ...editCliente, direccion: e.target.value })} placeholder="Calle / Carrera, barrio" /></Field>
                <Field label="Servicio">
                  <Sel value={editCliente.servicio || "Internet"} onChange={e => setEditCliente({ ...editCliente, servicio: e.target.value })}>
                    <option>Internet</option><option>TV</option><option>Internet + TV</option>
                  </Sel>
                </Field>
                <Field label="Plan">
                  <Sel value={planes.find(p => p.nombre === editCliente.plan)?.id || ""} onChange={e => aplicarPlan(e.target.value)}>
                    <option value="">— Seleccionar plan —</option>
                    {planes.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} · {formatCOP(p.precio)}</option>
                    ))}
                  </Sel>
                  {editCliente.plan && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✓ Plan seleccionado: <strong>{editCliente.plan}</strong></div>}
                </Field>
                <Field label="Monto (COP)"><Inp type="number" value={editCliente.monto || ""} onChange={e => setEditCliente({ ...editCliente, monto: Number(e.target.value) })} readOnly style={{ background: "#0a1628", opacity: 0.8, cursor: "not-allowed" }} /></Field>
                <Field label="Fecha de pago"><Inp type="date" value={editCliente.fechaPago || ""} onChange={e => setEditCliente({ ...editCliente, fechaPago: e.target.value })} /></Field>
                <Field label="Estado de cuenta">
                  <Sel value={editCliente.estado || "Al día"} onChange={e => setEditCliente({ ...editCliente, estado: e.target.value })}>
                    <option>Al día</option><option>Pendiente</option><option>Vencido</option>
                  </Sel>
                </Field>
                <Field label="Clave WiFi"><Inp value={editCliente.claveWifi || ""} onChange={e => setEditCliente({ ...editCliente, claveWifi: e.target.value })} placeholder="Clave del router del cliente" /></Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => saveCliente(editCliente)}>Guardar</Btn>
                <Btn variant="ghost" onClick={() => { setShowFormCliente(false); setEditCliente(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clientesFiltrados.map(c => (
              <div key={c.id} style={{ background: "#0f172a", border: "1px solid " + (c.tipo === "empresa" ? "#8b5cf633" : "#1e293b"), borderLeft: "4px solid " + (c.tipo === "empresa" ? "#8b5cf6" : "#0ea5e9"), borderRadius: 12, padding: "12px 16px", opacity: c.activo ? 1 : 0.5, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    {c.nombre}
                    {c.tipo === "empresa" && <Badge text="🏢 Empresa" color="#8b5cf6" />}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>@{c.usuario} · CC/NIT: {c.cedula}</div>
                  {c.telefono && <div style={{ fontSize: 11, color: "#0ea5e9" }}>📞 {c.telefono}</div>}
                  {c.direccion && <div style={{ fontSize: 11, color: "#475569" }}>📍 {c.direccion}</div>}
                  {c.claveWifi && <div style={{ fontSize: 11, color: "#0ea5e9" }}>🔑 WiFi: {c.claveWifi}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#0ea5e9", fontSize: 14 }}>{c.monto ? formatCOP(c.monto) : "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{c.plan}</div>
                </div>
                {c.estado && <Badge text={c.estado} color={ESTADO_COLOR[c.estado] || "#64748b"} />}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => toggleCliente(c.id)} style={{ background: c.activo ? "#22c55e22" : "#1e293b", color: c.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{c.activo ? "Activo" : "Inactivo"}</button>
                  <button onClick={() => { setEditCliente(c); setShowFormCliente(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                  <button onClick={() => deleteCliente(c.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "avisos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{avisos.length} avisos</span>
            <Btn onClick={() => { setEditAviso({ ...emptyAviso, id: genId() }); setShowFormAviso(true); }} style={{ fontSize: 13 }}>+ Nuevo aviso</Btn>
          </div>
          {showFormAviso && editAviso && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>Nuevo aviso general</h3>
              <Field label="Tipo">
                <Sel value={editAviso.tipo} onChange={e => setEditAviso({ ...editAviso, tipo: e.target.value })}>
                  <option>Información</option><option>Mantenimiento</option><option>Falla</option>
                </Sel>
              </Field>
              <Field label="Título"><Inp value={editAviso.titulo} onChange={e => setEditAviso({ ...editAviso, titulo: e.target.value })} /></Field>
              <Field label="Mensaje">
                <textarea value={editAviso.mensaje} onChange={e => setEditAviso({ ...editAviso, mensaje: e.target.value })} style={{ background: "#0a1628", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 70, resize: "vertical" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Field label="Afecta">
                  <Sel value={editAviso.afecta} onChange={e => setEditAviso({ ...editAviso, afecta: e.target.value })}>
                    <option>Internet</option><option>TV</option><option>Ambos</option>
                  </Sel>
                </Field>
                <Field label="Fecha"><Inp type="date" value={editAviso.fecha} onChange={e => setEditAviso({ ...editAviso, fecha: e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => saveAviso(editAviso)}>Publicar aviso</Btn>
                <Btn variant="ghost" onClick={() => { setShowFormAviso(false); setEditAviso(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {avisos.map(a => (
              <div key={a.id} style={{ background: "#0f172a", border: "1px solid " + TIPO_COLOR[a.tipo] + "33", borderLeft: "4px solid " + TIPO_COLOR[a.tipo], borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Badge text={a.tipo} color={TIPO_COLOR[a.tipo]} />
                  <span style={{ fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{a.titulo}</span>
                  <button onClick={() => toggleAviso(a.id)} style={{ background: a.activo ? "#22c55e22" : "#1e293b", color: a.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 20, padding: "3px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{a.activo ? "Activo" : "Inactivo"}</button>
                  <button onClick={() => deleteAviso(a.id)} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>
                <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>{a.mensaje}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "promo" && (
        <div>
          <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span>👁️</span>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Vista previa de las promociones visibles para los clientes. Solo el administrador puede editar este contenido.</span>
          </div>
          {propaganda.filter(p => p.activo).length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569", padding: 40, fontSize: 14 }}>Sin promociones activas.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {propaganda.filter(p => p.activo).map(p => (
                <div key={p.id} style={{ background: "#0f172a", border: "1px solid " + p.color + "44", borderLeft: "4px solid " + p.color, borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{p.imagen}</span>
                    <div>
                      <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 15 }}>{p.titulo}</div>
                      <Badge text={p.categoria === "promocion" ? "🏷️ Promoción" : p.categoria === "equipos" ? "🖥️ Equipos" : "📷 Cámaras"} color={p.color} />
                    </div>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{p.descripcion}</p>
                  {p.fecha && <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>⏳ Válido hasta: {formatDate(p.fecha)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal crear orden desde ticket */}
      {modalOrden && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 16px", fontSize: 16 }}>🔧 Crear orden de trabajo</h3>
            <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 14 }}>{modalOrden.titulo}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Cliente: {modalOrden.clienteNombre}</div>
              {(() => { const c = usuarios.find(u => u.id === modalOrden.clienteId); return c ? (
                <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {c.telefono && <span style={{ fontSize: 12, color: "#0ea5e9" }}>📞 {c.telefono}</span>}
                  {c.direccion && <span style={{ fontSize: 12, color: "#94a3b8" }}>📍 {c.direccion}</span>}
                </div>
              ) : null; })()}
            </div>
            <Field label="Tipo de orden">
              <Sel value={nuevaOrden.tipo} onChange={e => setNuevaOrden({ ...nuevaOrden, tipo: e.target.value })}>
                {TIPOS_ORDEN.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </Field>
            {nuevaOrden.tipo === "Otro" && (
              <Field label="Especificar">
                <Inp value={nuevaOrden.otro} onChange={e => setNuevaOrden({ ...nuevaOrden, otro: e.target.value })} placeholder="Describe el trabajo a realizar..." />
              </Field>
            )}
            {nuevaOrden.tipo === "Traslado / cambio de domicilio" && (
              <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginBottom: 10 }}>🏠 Nueva dirección de destino</div>
                {(() => { const c = usuarios.find(u => u.id === modalOrden.clienteId); return c?.direccion ? <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Dir. actual: {c.direccion}</div> : null; })()}
                <Inp value={nuevaOrden.nuevaDireccionTraslado || ""} onChange={e => setNuevaOrden({ ...nuevaOrden, nuevaDireccionTraslado: e.target.value })} placeholder="Nueva dirección a donde se traslada el cliente" />
              </div>
            )}
            <Field label="Descripción / instrucciones">
              <textarea value={nuevaOrden.descripcion} onChange={e => setNuevaOrden({ ...nuevaOrden, descripcion: e.target.value })} placeholder="Detalles para el técnico..." style={{ background: "#0a1628", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 70, resize: "vertical" }} />
            </Field>
            <Field label={`Asignar técnico · Zona: ${zonaSecretario?.nombre || ""}`}>
              <Sel value={nuevaOrden.tecnicoId} onChange={e => setNuevaOrden({ ...nuevaOrden, tecnicoId: e.target.value })}>
                <option value="">— Seleccionar técnico —</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Sel>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Field label="Fecha"><Inp type="date" value={nuevaOrden.fecha} onChange={e => setNuevaOrden({ ...nuevaOrden, fecha: e.target.value })} /></Field>
              <Field label="Hora"><Inp type="time" value={nuevaOrden.hora} onChange={e => setNuevaOrden({ ...nuevaOrden, hora: e.target.value })} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn onClick={crearOrden} disabled={!nuevaOrden.tecnicoId}>Crear orden</Btn>
              <Btn variant="ghost" onClick={() => setModalOrden(null)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal orden manual */}
      {showModalOrdenManual && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto" }}>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 16 }}>➕ Nueva orden manual</h3>
            <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 16px" }}>Asigna una orden sin necesidad de que exista un ticket</p>

            <Field label="Tipo de orden">
              <Sel value={ordenManual.tipo} onChange={e => setOrdenManual({ ...ordenManual, tipo: e.target.value })}>
                {TIPOS_ORDEN.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </Field>
            {ordenManual.tipo === "Otro" && (
              <Field label="Especificar">
                <Inp value={ordenManual.otro} onChange={e => setOrdenManual({ ...ordenManual, otro: e.target.value })} placeholder="Describe el trabajo a realizar..." />
              </Field>
            )}

            {/* INSTALACIÓN NUEVA: datos del nuevo cliente */}
            {ordenManual.tipo === "Instalación nueva" ? (
              <div style={{ background: "#0ea5e911", border: "1px solid #0ea5e933", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>📋 Datos del nuevo cliente</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                  <Field label="Nombre completo *">
                    <Inp value={ordenManual.nuevoNombre} onChange={e => setOrdenManual({ ...ordenManual, nuevoNombre: e.target.value })} placeholder="Nombres y apellidos" style={{ borderColor: erroresOrdenManual.nuevoNombre ? "#ef4444" : undefined }} />
                    {erroresOrdenManual.nuevoNombre && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Campo obligatorio</div>}
                  </Field>
                  <Field label="N° de cédula *">
                    <Inp value={ordenManual.nuevaCedula} onChange={e => setOrdenManual({ ...ordenManual, nuevaCedula: e.target.value })} placeholder="Ej: 1234567890" style={{ borderColor: erroresOrdenManual.nuevaCedula ? "#ef4444" : undefined }} />
                    {erroresOrdenManual.nuevaCedula && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Campo obligatorio</div>}
                  </Field>
                  <Field label="N° de teléfono *">
                    <Inp value={ordenManual.nuevoTelefono} onChange={e => setOrdenManual({ ...ordenManual, nuevoTelefono: e.target.value })} placeholder="Ej: 3001234567" style={{ borderColor: erroresOrdenManual.nuevoTelefono ? "#ef4444" : undefined }} />
                    {erroresOrdenManual.nuevoTelefono && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Campo obligatorio</div>}
                  </Field>
                  <Field label="Correo electrónico (opcional)">
                    <Inp type="email" value={ordenManual.nuevoCorreo} onChange={e => setOrdenManual({ ...ordenManual, nuevoCorreo: e.target.value })} placeholder="correo@ejemplo.com" />
                  </Field>
                </div>
                <Field label="Dirección de instalación *">
                  <Inp value={ordenManual.nuevaDireccion} onChange={e => setOrdenManual({ ...ordenManual, nuevaDireccion: e.target.value })} placeholder="Calle / Carrera, barrio, municipio" style={{ borderColor: erroresOrdenManual.nuevaDireccion ? "#ef4444" : undefined }} />
                  {erroresOrdenManual.nuevaDireccion && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Campo obligatorio</div>}
                </Field>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>* Campos obligatorios · El correo electrónico es opcional</div>
              </div>
            ) : (
              /* OTROS TIPOS: seleccionar cliente existente */
              <Field label="Cliente existente">
                <Sel value={ordenManual.clienteExistente} onChange={e => setOrdenManual({ ...ordenManual, clienteExistente: e.target.value })} style={{ borderColor: erroresOrdenManual.clienteExistente ? "#ef4444" : undefined }}>
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.cedula}</option>)}
                </Sel>
                {erroresOrdenManual.clienteExistente && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Debes seleccionar un cliente</div>}
                {ordenManual.clienteExistente && (() => {
                  const c = usuarios.find(u => u.id === ordenManual.clienteExistente);
                  return c ? (
                    <div style={{ background: "#1e293b", borderRadius: 8, padding: "7px 10px", marginTop: 8, fontSize: 12 }}>
                      {c.telefono && <div style={{ color: "#94a3b8" }}>📞 {c.telefono}</div>}
                      {c.direccion && <div style={{ color: "#94a3b8" }}>📍 {c.direccion}</div>}
                    </div>
                  ) : null;
                })()}
              </Field>
            )}

            {/* Campo nueva dirección para traslados */}
            {ordenManual.tipo === "Traslado / cambio de domicilio" && (
              <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>🏠 Traslado de domicilio</div>
                {ordenManual.clienteExistente && (() => {
                  const c = usuarios.find(u => u.id === ordenManual.clienteExistente);
                  return c?.direccion ? <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>📍 Dirección actual: <span style={{ color: "#f1f5f9" }}>{c.direccion}</span></div> : null;
                })()}
                <Field label="Nueva dirección de destino *">
                  <Inp value={ordenManual.nuevaDireccionTraslado || ""} onChange={e => setOrdenManual({ ...ordenManual, nuevaDireccionTraslado: e.target.value })} placeholder="Calle / Carrera, barrio, municipio del nuevo domicilio" />
                </Field>
              </div>
            )}

            <Field label="Descripción / instrucciones">
              <textarea value={ordenManual.descripcion} onChange={e => setOrdenManual({ ...ordenManual, descripcion: e.target.value })} placeholder="Detalles para el técnico..." style={{ background: "#0a1628", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 60, resize: "vertical" }} />
            </Field>
            <Field label={`Asignar técnico · Zona: ${zonaSecretario?.nombre || ""}`}>
              <Sel value={ordenManual.tecnicoId} onChange={e => setOrdenManual({ ...ordenManual, tecnicoId: e.target.value })} style={{ borderColor: erroresOrdenManual.tecnicoId ? "#ef4444" : undefined }}>
                <option value="">— Seleccionar técnico —</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Sel>
              {erroresOrdenManual.tecnicoId && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 3 }}>Debes asignar un técnico</div>}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Field label="Fecha"><Inp type="date" value={ordenManual.fecha} onChange={e => setOrdenManual({ ...ordenManual, fecha: e.target.value })} /></Field>
              <Field label="Hora"><Inp type="time" value={ordenManual.hora} onChange={e => setOrdenManual({ ...ordenManual, hora: e.target.value })} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Btn onClick={crearOrdenManual} variant="success" style={{ flex: 1 }}>✅ Crear orden</Btn>
              <Btn variant="ghost" onClick={() => { setShowModalOrdenManual(false); setErroresOrdenManual({}); }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════
function PortalTecnico({ usuario, ordenes, setOrdenes, tickets, setTickets, zonas }) {
  const [tab, setTab] = useState("hoy");

  const zonaT = zonas.find(z => z.id === usuario.zonaId);
  const hoy = new Date().toISOString().split("T")[0];
  const misOrdenes = ordenes.filter(o => o.tecnicoId === usuario.id);
  const ordenesHoy = misOrdenes.filter(o => o.fecha === hoy && o.estado !== "Completada" && o.estado !== "Cancelada");
  const ordenesActivas = misOrdenes.filter(o => o.estado !== "Completada" && o.estado !== "Cancelada");
  const completadas = misOrdenes.filter(o => o.estado === "Completada");

  const cambiarEstado = async (ordenId, estado) => {
    try {
      await db.actualizarEstadoOrden(ordenId, estado);
      setOrdenes(p => p.map(o => o.id === ordenId ? { ...o, estado } : o));
      if (estado === "Completada") {
        const orden = ordenes.find(o => o.id === ordenId);
        if (orden?.ticketId) {
          await db.actualizarEstadoTicket(orden.ticketId, "Resuelto");
          setTickets(p => p.map(t => t.id === orden.ticketId ? { ...t, estado: "Resuelto" } : t));
        }
      }
    } catch (err) { console.error("Error cambiando estado orden:", err); }
  };

  // OrdenCard con nota local para evitar que el teclado se cierre en móvil
  const OrdenCard = ({ orden }) => {
    const [abierta, setAbierta] = useState(false);
    const [nota, setNota] = useState("");
    const esTraslado = orden.tipo === "Traslado / cambio de domicilio";
    const esInstalacion = orden.tipo === "Instalación nueva";

    const agregarNota = async () => {
      if (!nota.trim()) return;
      const nuevasNotas = [...(orden.notas || []), { texto: nota.trim(), ts: Date.now() }];
      try {
        await db.agregarNotaOrden(orden.id, nuevasNotas);
        setOrdenes(p => p.map(o => o.id === orden.id ? { ...o, notas: nuevasNotas } : o));
        setNota("");
      } catch (err) { console.error("Error agregando nota:", err); }
    };
    return (
      <div style={{ background: "#0f172a", border: "1px solid " + (orden.prioridad === "alta" ? "#8b5cf633" : "#1e293b"), borderLeft: "4px solid " + ORDEN_COLOR[orden.estado], borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
        <div onClick={() => setAbierta(!abierta)} style={{ padding: "12px 16px", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "#f1f5f9", flex: 1, fontSize: 14 }}>{orden.tipo}</span>
            {orden.prioridad === "alta" && <Badge text="🏢 Prioridad" color="#8b5cf6" />}
            <Badge text={orden.estado} color={ORDEN_COLOR[orden.estado]} />
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            👤 {orden.clienteNombre} · 📅 {orden.fecha} {orden.hora}
          </div>
          {/* Teléfono del cliente */}
          {orden.telefonoCliente && (
            <div style={{ fontSize: 12, color: "#0ea5e9", marginTop: 3, fontWeight: 600 }}>📞 {orden.telefonoCliente}</div>
          )}
          {orden.datosInstalacion?.telefono && !orden.telefonoCliente && (
            <div style={{ fontSize: 12, color: "#0ea5e9", marginTop: 3, fontWeight: 600 }}>📞 {orden.datosInstalacion.telefono}</div>
          )}
          {/* Dirección: traslado muestra vieja y nueva, instalación solo la nueva, resto la actual */}
          {esTraslado ? (
            <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 8, padding: "8px 10px", marginTop: 6, fontSize: 12 }}>
              <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>🏠 Traslado de domicilio</div>
              {orden.direccionAnterior && <div style={{ color: "#94a3b8" }}>📍 Dirección anterior: <span style={{ color: "#f1f5f9" }}>{orden.direccionAnterior}</span></div>}
              {orden.direccionNueva && <div style={{ color: "#94a3b8", marginTop: 3 }}>📍 Nueva dirección: <span style={{ color: "#22c55e", fontWeight: 600 }}>{orden.direccionNueva}</span></div>}
              {!orden.direccionNueva && orden.direccion && <div style={{ color: "#94a3b8" }}>📍 {orden.direccion}</div>}
            </div>
          ) : (
            orden.direccion && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>📍 {orden.direccion}</div>
          )}
          {orden.descripcion && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{orden.descripcion}</div>}
          {orden.datosInstalacion && (
            <div style={{ background: "#0ea5e911", border: "1px solid #0ea5e922", borderRadius: 8, padding: "7px 10px", marginTop: 5, fontSize: 12 }}>
              <div style={{ color: "#0ea5e9", fontWeight: 700, marginBottom: 2 }}>📋 Datos instalación nueva</div>
              <div style={{ color: "#94a3b8" }}>CC: {orden.datosInstalacion.cedula} · Tel: {orden.datosInstalacion.telefono}</div>
              {orden.datosInstalacion.correo && <div style={{ color: "#94a3b8" }}>✉️ {orden.datosInstalacion.correo}</div>}
              {orden.datosInstalacion.direccion && <div style={{ color: "#94a3b8" }}>📍 {orden.datosInstalacion.direccion}</div>}
            </div>
          )}
        </div>
        {abierta && (
          <div style={{ borderTop: "1px solid #1e293b", padding: "12px 16px" }}>
            {(orden.notas || []).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Notas</div>
                {orden.notas.map((n, i) => (
                  <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: "7px 10px", marginBottom: 6, fontSize: 13, color: "#cbd5e1" }}>
                    {n.texto} <span style={{ color: "#475569", fontSize: 11 }}>· {formatTime(n.ts)}</span>
                  </div>
                ))}
              </div>
            )}
            {orden.estado !== "Completada" && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Inp value={nota} onChange={e => setNota(e.target.value)} onKeyDown={e => e.key === "Enter" && agregarNota()} placeholder="Agregar nota de campo..." />
                  <Btn onClick={agregarNota} style={{ padding: "9px 14px", fontSize: 13 }}>+</Btn>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {orden.estado === "Pendiente" && <Btn onClick={() => cambiarEstado(orden.id, "En camino")} variant="primary" style={{ fontSize: 13 }}>🚗 En camino</Btn>}
                  {orden.estado === "En camino" && <Btn onClick={() => cambiarEstado(orden.id, "Completada")} variant="success" style={{ fontSize: 13 }}>✅ Marcar completada</Btn>}
                  <Btn onClick={() => cambiarEstado(orden.id, "Cancelada")} variant="danger" style={{ fontSize: 13 }}>Cancelar</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
      {zonaT && (
        <div style={{ background: zonaT.color + "22", border: "1px solid " + zonaT.color + "44", borderRadius: 10, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📍</span>
          <span style={{ color: zonaT.color, fontSize: 13, fontWeight: 700 }}>Zona asignada: {zonaT.nombre}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0f172a", borderRadius: 10, padding: 4 }}>
        {[["hoy", "📅 Hoy", ordenesHoy.length], ["todas", "📋 Todas", ordenesActivas.length], ["historial", "✅ Historial", 0]].map(([k, v, badge]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? "#0ea5e9" : "transparent", color: tab === k ? "#fff" : "#64748b", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {v}{badge > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{badge}</span>}
          </button>
        ))}
      </div>
      {tab === "hoy" && (ordenesHoy.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: 50 }}>🎉 Sin órdenes para hoy</div> : ordenesHoy.sort((a, b) => (b.prioridad === "alta" ? 1 : 0) - (a.prioridad === "alta" ? 1 : 0)).map(o => <OrdenCard key={o.id} orden={o} />))}
      {tab === "todas" && (ordenesActivas.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: 50 }}>Sin órdenes activas</div> : ordenesActivas.map(o => <OrdenCard key={o.id} orden={o} />))}
      {tab === "historial" && (completadas.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: 50 }}>Sin órdenes completadas aún</div> : [...completadas].reverse().map(o => <OrdenCard key={o.id} orden={o} />))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PORTAL ADMIN
// ══════════════════════════════════════════════════════════════
function PortalAdmin({ usuarios, setUsuarios, avisos, setAvisos, tickets, setTickets, ordenes, setOrdenes, planes, setPlanes, zonas, setZonas, propaganda, setPropaganda }) {
  const [tab, setTab] = useState("usuarios");
  const [editU, setEditU] = useState(null);
  const [editA, setEditA] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [editZona, setEditZona] = useState(null);
  const [editPropa, setEditPropa] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busqAdmin, setBusqAdmin] = useState("");
  const [filtroAdminTipo, setFiltroAdminTipo] = useState("todos");
  const [formTipo, setFormTipo] = useState(null); // "usuario" | "aviso" | "plan" | "zona" | "propa"

  const usuariosFiltradosAdmin = (() => {
    const q = busqAdmin.toLowerCase().trim();
    return usuarios.filter(u => {
      const matchQ = !q || u.nombre?.toLowerCase().includes(q) || u.cedula?.toLowerCase().includes(q) || u.usuario?.toLowerCase().includes(q);
      if (filtroAdminTipo === "cliente_final") return matchQ && u.rol === "cliente" && u.tipo === "final";
      if (filtroAdminTipo === "cliente_empresa") return matchQ && u.rol === "cliente" && u.tipo === "empresa";
      if (filtroAdminTipo === "inactivo") return matchQ && !u.activo;
      return matchQ;
    });
  })();

  const emptyU = { id: "", usuario: "", clave: "", rol: "secretario", nombre: "", tipo: "final", cedula: "", servicio: "Internet", plan: "", monto: "", fechaPago: "", estado: "Al día", activo: true, zonaId: "", direccion: "", claveWifi: "", telefono: "", privilegios: [] };
  const emptyA = { id: "", tipo: "Información", titulo: "", mensaje: "", fecha: new Date().toISOString().split("T")[0], afecta: "Internet", activo: true };
  const emptyPlan = { id: "", nombre: "", precio: "", descripcion: "", activo: true };
  const emptyZona = { id: "", nombre: "", color: "#0ea5e9", activa: true };
  const emptyPropa = { id: "", categoria: "promocion", titulo: "", descripcion: "", activo: true, fecha: "", imagen: "🎁", color: "#0ea5e9" };

  const saveU = async (u) => {
    try {
      const guardado = await db.upsertUsuario(u);
      setUsuarios(p => p.find(x => x.id === guardado.id) ? p.map(x => x.id === guardado.id ? guardado : x) : [...p, guardado]);
      setShowForm(false); setEditU(null); setFormTipo(null);
    } catch (err) { console.error("Error guardando usuario:", err); }
  };
  const deleteU = async (id) => {
    try { await db.deleteUsuario(id); setUsuarios(p => p.filter(u => u.id !== id)); }
    catch (err) { console.error("Error eliminando usuario:", err); }
  };
  const toggleU = async (id) => {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    try { await db.toggleUsuario(id, !u.activo); setUsuarios(p => p.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling usuario:", err); }
  };

  const saveA = async (a) => {
    try {
      const guardado = await db.upsertAviso(a);
      setAvisos(p => p.find(x => x.id === guardado.id) ? p.map(x => x.id === guardado.id ? guardado : x) : [...p, guardado]);
      setShowForm(false); setEditA(null); setFormTipo(null);
    } catch (err) { console.error("Error guardando aviso:", err); }
  };
  const deleteA = async (id) => {
    try { await db.deleteAviso(id); setAvisos(p => p.filter(a => a.id !== id)); }
    catch (err) { console.error("Error eliminando aviso:", err); }
  };
  const toggleA = async (id) => {
    const a = avisos.find(x => x.id === id);
    if (!a) return;
    try { await db.toggleAviso(id, !a.activo); setAvisos(p => p.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling aviso:", err); }
  };

  const savePlan = async (p) => {
    try {
      const guardado = await db.upsertPlan(p);
      setPlanes(prev => prev.find(x => x.id === guardado.id) ? prev.map(x => x.id === guardado.id ? guardado : x) : [...prev, guardado]);
      setShowForm(false); setEditPlan(null); setFormTipo(null);
    } catch (err) { console.error("Error guardando plan:", err); }
  };
  const deletePlan = async (id) => {
    try { await db.deletePlan(id); setPlanes(p => p.filter(x => x.id !== id)); }
    catch (err) { console.error("Error eliminando plan:", err); }
  };
  const togglePlan = async (id) => {
    const p = planes.find(x => x.id === id);
    if (!p) return;
    try { await db.togglePlan(id, !p.activo); setPlanes(prev => prev.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling plan:", err); }
  };

  const saveZona = async (z) => {
    try {
      const guardada = await db.upsertZona(z);
      setZonas(prev => prev.find(x => x.id === guardada.id) ? prev.map(x => x.id === guardada.id ? guardada : x) : [...prev, guardada]);
      setShowForm(false); setEditZona(null); setFormTipo(null);
    } catch (err) { console.error("Error guardando zona:", err); }
  };
  const deleteZona = async (id) => {
    try { await db.deleteZona(id); setZonas(p => p.filter(x => x.id !== id)); }
    catch (err) { console.error("Error eliminando zona:", err); }
  };
  const toggleZona = async (id) => {
    const z = zonas.find(x => x.id === id);
    if (!z) return;
    try { await db.toggleZona(id, !z.activa); setZonas(p => p.map(x => x.id === id ? { ...x, activa: !x.activa } : x)); }
    catch (err) { console.error("Error toggling zona:", err); }
  };

  const savePropa = async (p) => {
    try {
      const guardada = await db.upsertPropaganda(p);
      setPropaganda(prev => prev.find(x => x.id === guardada.id) ? prev.map(x => x.id === guardada.id ? guardada : x) : [...prev, guardada]);
      setShowForm(false); setEditPropa(null); setFormTipo(null);
    } catch (err) { console.error("Error guardando propaganda:", err); }
  };
  const deletePropa = async (id) => {
    try { await db.deletePropaganda(id); setPropaganda(p => p.filter(x => x.id !== id)); }
    catch (err) { console.error("Error eliminando propaganda:", err); }
  };
  const togglePropa = async (id) => {
    const p = propaganda.find(x => x.id === id);
    if (!p) return;
    try { await db.togglePropaganda(id, !p.activo); setPropaganda(prev => prev.map(x => x.id === id ? { ...x, activo: !x.activo } : x)); }
    catch (err) { console.error("Error toggling propaganda:", err); }
  };

  const resumen = {
    clientes: usuarios.filter(u => u.rol === "cliente").length,
    tecnicos: usuarios.filter(u => u.rol === "tecnico").length,
    secretarios: usuarios.filter(u => u.rol === "secretario").length,
    ticketsAbiertos: tickets.filter(t => t.estado === "Abierto").length,
    ordenesActivas: ordenes.filter(o => o.estado !== "Completada" && o.estado !== "Cancelada").length,
    zonas: zonas.length,
  };

  const tabsAdmin = [["usuarios", "👥 Usuarios"], ["planes", "📦 Planes"], ["zonas", "🗺️ Zonas"], ["avisos", "📢 Avisos"], ["propaganda", "🎁 Promociones"], ["resumen", "📊 Resumen"]];

  const getNombreZona = (zonaId) => zonas.find(z => z.id === zonaId)?.nombre || "Sin zona";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#0f172a", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {tabsAdmin.map(([k, v]) => (
          <button key={k} onClick={() => { setTab(k); setShowForm(false); setFormTipo(null); }} style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? "#8b5cf6" : "transparent", color: tab === k ? "#fff" : "#64748b", fontWeight: 700, fontSize: 12, minWidth: 80 }}>{v}</button>
        ))}
      </div>

      {/* ── TAB RESUMEN ── */}
      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              ["👥 Clientes", resumen.clientes, "#0ea5e9"],
              ["🔧 Técnicos", resumen.tecnicos, "#f59e0b"],
              ["🗂️ Secretarios", resumen.secretarios, "#8b5cf6"],
              ["🎫 Tickets abiertos", resumen.ticketsAbiertos, "#ef4444"],
              ["📋 Órdenes activas", resumen.ordenesActivas, "#22c55e"],
              ["🗺️ Zonas", resumen.zonas, "#0ea5e9"],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: "#0f172a", border: "1px solid " + color + "33", borderRadius: 14, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Resumen por zonas */}
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Distribución por zona</div>
          {zonas.map(z => {
            const secZ = usuarios.filter(u => u.rol === "secretario" && u.zonaId === z.id).length;
            const tecZ = usuarios.filter(u => u.rol === "tecnico" && u.zonaId === z.id).length;
            const cliZ = usuarios.filter(u => u.rol === "cliente" && u.zonaId === z.id).length;
            return (
              <div key={z.id} style={{ background: "#0f172a", border: "1px solid " + z.color + "33", borderLeft: "4px solid " + z.color, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: z.color, fontSize: 14, minWidth: 80 }}>📍 {z.nombre}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>🗂️ {secZ} secretarios</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>🔧 {tecZ} técnicos</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>👥 {cliZ} clientes</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB PLANES ── */}
      {tab === "planes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{planes.length} planes configurados</span>
            <Btn onClick={() => { setEditPlan({ ...emptyPlan }); setFormTipo("plan"); setShowForm(true); }} style={{ fontSize: 13 }}>+ Nuevo plan</Btn>
          </div>
          {showForm && formTipo === "plan" && editPlan && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>{editPlan.id ? "Editar plan" : "Nuevo plan"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="Nombre del plan"><Inp value={editPlan.nombre} onChange={e => setEditPlan({ ...editPlan, nombre: e.target.value })} placeholder="Ej: Premium 100MB" /></Field>
                <Field label="Precio (COP)"><Inp type="number" value={editPlan.precio} onChange={e => setEditPlan({ ...editPlan, precio: Number(e.target.value) })} placeholder="Ej: 85000" /></Field>
              </div>
              <Field label="Descripción">
                <Inp value={editPlan.descripcion} onChange={e => setEditPlan({ ...editPlan, descripcion: e.target.value })} placeholder="Descripción del plan" />
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => savePlan(editPlan)}>Guardar plan</Btn>
                <Btn variant="ghost" onClick={() => { setShowForm(false); setEditPlan(null); setFormTipo(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {planes.map(p => (
              <div key={p.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderLeft: "4px solid #0ea5e9", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: p.activo ? 1 : 0.5 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{p.descripcion}</div>
                </div>
                <div style={{ fontWeight: 800, color: "#0ea5e9", fontSize: 16 }}>{formatCOP(p.precio)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => togglePlan(p.id)} style={{ background: p.activo ? "#22c55e22" : "#1e293b", color: p.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{p.activo ? "Activo" : "Inactivo"}</button>
                  <button onClick={() => { setEditPlan(p); setFormTipo("plan"); setShowForm(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                  <button onClick={() => deletePlan(p.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB ZONAS ── */}
      {tab === "zonas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{zonas.length} zonas configuradas</span>
            <Btn onClick={() => { setEditZona({ ...emptyZona }); setFormTipo("zona"); setShowForm(true); }} style={{ fontSize: 13 }}>+ Nueva zona</Btn>
          </div>
          {showForm && formTipo === "zona" && editZona && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>{editZona.id ? "Editar zona" : "Nueva zona"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="Nombre de la zona"><Inp value={editZona.nombre} onChange={e => setEditZona({ ...editZona, nombre: e.target.value })} placeholder="Ej: Vijes" /></Field>
                <Field label="Color identificador">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Inp type="color" value={editZona.color} onChange={e => setEditZona({ ...editZona, color: e.target.value })} style={{ width: 50, padding: 4 }} />
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{editZona.color}</span>
                  </div>
                </Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => saveZona(editZona)}>Guardar zona</Btn>
                <Btn variant="ghost" onClick={() => { setShowForm(false); setEditZona(null); setFormTipo(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {zonas.map(z => {
              const miembros = usuarios.filter(u => u.zonaId === z.id);
              const secs = miembros.filter(u => u.rol === "secretario");
              const tecs = miembros.filter(u => u.rol === "tecnico");
              const clis = miembros.filter(u => u.rol === "cliente");
              return (
                <div key={z.id} style={{ background: "#0f172a", border: "1px solid " + z.color + "33", borderLeft: "4px solid " + z.color, borderRadius: 12, padding: "14px 16px", opacity: z.activa ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: z.color, fontSize: 16 }}>📍 {z.nombre}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>🗂️ {secs.length} secretarios: {secs.map(s => s.nombre.split(" ")[0]).join(", ") || "ninguno"}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>🔧 {tecs.length} técnicos: {tecs.map(t => t.nombre.split(" ")[0]).join(", ") || "ninguno"}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>👥 {clis.length} clientes</span>
                      </div>
                      {/* Nombre de empresa asignado por admin */}
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "#475569", marginRight: 6 }}>Nombre empresa en esta zona:</span>
                        <Inp
                          value={z.nombreEmpresa || ""}
                          onChange={e => { const v = e.target.value; setZonas(prev => prev.map(x => x.id === z.id ? { ...x, nombreEmpresa: v } : x)); db.patchZonaNombreEmpresa(z.id, v).catch(console.error); }}
                          placeholder="Ej: GC HOGAR.NET Vijes"
                          style={{ display: "inline-block", width: 240, padding: "5px 10px", fontSize: 12 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleZona(z.id)} style={{ background: z.activa ? "#22c55e22" : "#1e293b", color: z.activa ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{z.activa ? "Activa" : "Inactiva"}</button>
                      <button onClick={() => { setEditZona(z); setFormTipo("zona"); setShowForm(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deleteZona(z.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB USUARIOS ── */}
      {tab === "usuarios" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{usuarios.length} usuarios</span>
            <Btn onClick={() => { setEditU(emptyU); setFormTipo("usuario"); setShowForm(true); }} style={{ fontSize: 13 }}>+ Nuevo usuario</Btn>
          </div>

          {showForm && formTipo === "usuario" && editU && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 4, fontSize: 15 }}>{editU.id ? "Editar usuario" : "Nuevo usuario"}</h3>
              <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 16px" }}>Selecciona el tipo de usuario y configura sus privilegios</p>

              {/* PASO 1: Tipo de usuario */}
              <div style={{ background: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>1 · Tipo de usuario</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[
                    { val: "admin", emoji: "🛡️", label: "Administrador", desc: "Acceso total al sistema" },
                    { val: "secretario", emoji: "🗂️", label: "Secretario/a", desc: "Gestión de clientes y tickets" },
                    { val: "tecnico", emoji: "🔧", label: "Técnico", desc: "Visualiza y ejecuta órdenes" },
                    { val: "cliente", emoji: "👤", label: "Cliente", desc: "Acceso al portal del cliente" },
                  ].map(r => (
                    <button key={r.val} onClick={() => setEditU({ ...editU, rol: r.val, privilegios: [] })}
                      style={{ background: editU.rol === r.val ? ROL_COLOR[r.val] + "33" : "#0f172a", border: "2px solid " + (editU.rol === r.val ? ROL_COLOR[r.val] : "#334155"), borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{r.emoji}</div>
                      <div style={{ fontWeight: 700, color: editU.rol === r.val ? ROL_COLOR[r.val] : "#f1f5f9", fontSize: 13 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PASO 2: Datos básicos */}
              <div style={{ background: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>2 · Datos básicos</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <Field label="Nombre completo"><Inp value={editU.nombre} onChange={e => setEditU({ ...editU, nombre: e.target.value })} /></Field>
                  <Field label="Teléfono"><Inp value={editU.telefono || ""} onChange={e => setEditU({ ...editU, telefono: e.target.value })} placeholder="Ej: 3001234567" /></Field>
                  <Field label="Usuario (login)"><Inp value={editU.usuario} onChange={e => setEditU({ ...editU, usuario: e.target.value })} /></Field>
                  <Field label="Clave"><Inp type="text" value={editU.clave} onChange={e => setEditU({ ...editU, clave: e.target.value })} /></Field>
                  {editU.rol !== "admin" && (
                    <Field label="Zona asignada">
                      <Sel value={editU.zonaId || ""} onChange={e => setEditU({ ...editU, zonaId: e.target.value })}>
                        <option value="">— Sin zona —</option>
                        {zonas.filter(z => z.activa).map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                      </Sel>
                    </Field>
                  )}
                </div>
              </div>

              {/* PASO 3: Privilegios adicionales (no aplica para admin ni cliente) */}
              {(editU.rol === "secretario" || editU.rol === "tecnico") && (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>3 · Privilegios adicionales</div>
                  <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 12px" }}>Marca los permisos extra que tendrá este usuario por encima de su rol base.</p>
                  {[
                    { id: "crear_ordenes", emoji: "📋", label: "Generar órdenes de trabajo", desc: "Puede crear y asignar órdenes manualmente", aplica: ["secretario", "tecnico"] },
                    { id: "editar_clientes", emoji: "✏️", label: "Editar datos de clientes", desc: "Puede modificar dirección, clave WiFi, estado", aplica: ["secretario", "tecnico"] },
                    { id: "crear_avisos", emoji: "📢", label: "Publicar avisos", desc: "Puede crear avisos de mantenimiento o fallas", aplica: ["secretario"] },
                    { id: "ver_pagos", emoji: "💰", label: "Ver información de pagos", desc: "Puede ver montos y estados de pago de clientes", aplica: ["tecnico"] },
                    { id: "cancelar_ordenes", emoji: "🚫", label: "Cancelar órdenes", desc: "Puede cancelar órdenes asignadas a otros", aplica: ["secretario"] },
                  ].filter(p => p.aplica.includes(editU.rol)).map(priv => {
                    const activo = (editU.privilegios || []).includes(priv.id);
                    return (
                      <div key={priv.id} onClick={() => {
                        const privs = editU.privilegios || [];
                        setEditU({ ...editU, privilegios: activo ? privs.filter(p => p !== priv.id) : [...privs, priv.id] });
                      }} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: activo ? "#0ea5e911" : "#0f172a", border: "1px solid " + (activo ? "#0ea5e944" : "#334155") }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: "2px solid " + (activo ? "#0ea5e9" : "#475569"), background: activo ? "#0ea5e9" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          {activo && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: activo ? "#0ea5e9" : "#f1f5f9", fontSize: 13 }}>{priv.emoji} {priv.label}</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{priv.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PASO 4: Datos de cliente */}
              {editU.rol === "cliente" && (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>3 · Datos del servicio</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                    <Field label="Tipo de cliente">
                      <Sel value={editU.tipo || "final"} onChange={e => setEditU({ ...editU, tipo: e.target.value })}>
                        <option value="final">Cliente final</option>
                        <option value="empresa">Cliente empresa</option>
                      </Sel>
                    </Field>
                    <Field label="Cédula / NIT"><Inp value={editU.cedula || ""} onChange={e => setEditU({ ...editU, cedula: e.target.value })} /></Field>
                    <Field label="Dirección de domicilio"><Inp value={editU.direccion || ""} onChange={e => setEditU({ ...editU, direccion: e.target.value })} placeholder="Calle / Carrera, barrio" /></Field>
                    <Field label="Servicio">
                      <Sel value={editU.servicio || "Internet"} onChange={e => setEditU({ ...editU, servicio: e.target.value })}>
                        <option>Internet</option><option>TV</option><option>Internet + TV</option>
                      </Sel>
                    </Field>
                    <Field label="Plan">
                      <Sel value={planes.find(p => p.nombre === editU.plan)?.id || ""} onChange={e => { const plan = planes.find(pl => pl.id === e.target.value); if (plan) setEditU(prev => ({ ...prev, plan: plan.nombre, monto: plan.precio })); }}>
                        <option value="">— Seleccionar plan —</option>
                        {planes.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre} · {formatCOP(p.precio)}</option>)}
                      </Sel>
                      {editU.plan && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✓ {editU.plan}</div>}
                    </Field>
                    <Field label="Monto (COP)"><Inp type="number" value={editU.monto || ""} onChange={e => setEditU({ ...editU, monto: Number(e.target.value) })} style={{ background: "#0a1628", opacity: 0.8 }} /></Field>
                    <Field label="Fecha de pago"><Inp type="date" value={editU.fechaPago || ""} onChange={e => setEditU({ ...editU, fechaPago: e.target.value })} /></Field>
                    <Field label="Estado de cuenta">
                      <Sel value={editU.estado || "Al día"} onChange={e => setEditU({ ...editU, estado: e.target.value })}>
                        <option>Al día</option><option>Pendiente</option><option>Vencido</option>
                      </Sel>
                    </Field>
                    <Field label="Clave WiFi"><Inp value={editU.claveWifi || ""} onChange={e => setEditU({ ...editU, claveWifi: e.target.value })} placeholder="Clave del router" /></Field>
                    {editU.tipo === "empresa" && (
                      <Field label="Nombre empresa (solo admin asigna)">
                        <Sel value={editU.nombreEmpresa || ""} onChange={e => setEditU({ ...editU, nombreEmpresa: e.target.value })}>
                          <option value="">— Sin nombre de empresa —</option>
                          {zonas.filter(z => z.nombreEmpresa).map(z => <option key={z.id} value={z.nombreEmpresa}>{z.nombreEmpresa} ({z.nombre})</option>)}
                        </Sel>
                      </Field>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => saveU(editU)}>Guardar usuario</Btn>
                <Btn variant="ghost" onClick={() => { setShowForm(false); setEditU(null); setFormTipo(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Inp placeholder="🔍  Buscar..." value={busqAdmin} onChange={e => setBusqAdmin(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            {busqAdmin && <button onClick={() => setBusqAdmin("")} style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>}
            <Sel value={filtroAdminTipo} onChange={e => setFiltroAdminTipo(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
              <option value="todos">Todos los roles</option>
              <option value="cliente_final">Clientes finales</option>
              <option value="cliente_empresa">Clientes empresa</option>
              <option value="inactivo">Inactivos</option>
            </Sel>
          </div>

          {busqAdmin || filtroAdminTipo !== "todos" ? (
            <div>
              {usuariosFiltradosAdmin.length === 0 ? (
                <div style={{ textAlign: "center", color: "#475569", padding: 30, fontSize: 14 }}>No se encontraron usuarios</div>
              ) : usuariosFiltradosAdmin.map(u => (
                <div key={u.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: u.activo ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{u.nombre}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      @{u.usuario}
                      {u.rol !== "admin" && u.zonaId && <span style={{ color: zonas.find(z => z.id === u.zonaId)?.color || "#64748b", marginLeft: 6 }}>📍 {getNombreZona(u.zonaId)}</span>}
                      {u.telefono && <span style={{ color: "#0ea5e9", marginLeft: 6 }}>📞 {u.telefono}</span>}
                      {u.rol === "cliente" && u.direccion && <span style={{ marginLeft: 6 }}>· {u.direccion}</span>}
                    </div>
                    <div style={{ marginTop: 3 }}><Badge text={ROLES[u.rol]} color={ROL_COLOR[u.rol]} /></div>
                    {(u.privilegios || []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        {u.privilegios.map(p => (
                          <span key={p} style={{ background: "#0ea5e922", color: "#0ea5e9", border: "1px solid #0ea5e933", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                            {p === "crear_ordenes" ? "📋 Órdenes" : p === "editar_clientes" ? "✏️ Editar clientes" : p === "crear_avisos" ? "📢 Avisos" : p === "ver_pagos" ? "💰 Pagos" : p === "cancelar_ordenes" ? "🚫 Cancelar órdenes" : p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {u.rol === "cliente" && u.monto && <div style={{ fontSize: 13, color: "#0ea5e9", fontWeight: 700 }}>{formatCOP(u.monto)}</div>}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleU(u.id)} style={{ background: u.activo ? "#22c55e22" : "#1e293b", color: u.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{u.activo ? "Activo" : "Inactivo"}</button>
                    <button onClick={() => { setEditU({ ...u, privilegios: u.privilegios || [] }); setFormTipo("usuario"); setShowForm(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                    {u.rol !== "admin" && <button onClick={() => deleteU(u.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {["admin", "secretario", "tecnico", "cliente"].map(rol => {
                const lista = usuarios.filter(u => u.rol === rol);
                if (lista.length === 0) return null;
                return (
                  <div key={rol} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Badge text={ROLES[rol]} color={ROL_COLOR[rol]} />
                      <span style={{ color: "#475569", fontSize: 12 }}>{lista.length}</span>
                    </div>
                    {lista.map(u => (
                      <div key={u.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: u.activo ? 1 : 0.5 }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{u.nombre}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            @{u.usuario}
                            {u.rol !== "admin" && u.zonaId && <span style={{ color: zonas.find(z => z.id === u.zonaId)?.color || "#64748b", marginLeft: 6 }}>📍 {getNombreZona(u.zonaId)}</span>}
                            {u.telefono && <span style={{ color: "#0ea5e9", marginLeft: 6 }}>📞 {u.telefono}</span>}
                          </div>
                          {u.rol === "cliente" && u.direccion && <div style={{ fontSize: 11, color: "#475569" }}>📍 {u.direccion}</div>}
                          {u.rol === "cliente" && u.claveWifi && <div style={{ fontSize: 11, color: "#0ea5e9" }}>🔑 WiFi: {u.claveWifi}</div>}
                          {u.rol === "cliente" && u.tipo === "empresa" && u.nombreEmpresa && <div style={{ fontSize: 11, color: "#8b5cf6" }}>🏢 {u.nombreEmpresa}</div>}
                          {(u.privilegios || []).length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                              {u.privilegios.map(p => (
                                <span key={p} style={{ background: "#0ea5e922", color: "#0ea5e9", border: "1px solid #0ea5e933", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                                  {p === "crear_ordenes" ? "📋 Órdenes" : p === "editar_clientes" ? "✏️ Editar clientes" : p === "crear_avisos" ? "📢 Avisos" : p === "ver_pagos" ? "💰 Pagos" : p === "cancelar_ordenes" ? "🚫 Cancelar órdenes" : p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {u.rol === "cliente" && u.monto && <div style={{ fontSize: 13, color: "#0ea5e9", fontWeight: 700 }}>{formatCOP(u.monto)}</div>}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => toggleU(u.id)} style={{ background: u.activo ? "#22c55e22" : "#1e293b", color: u.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{u.activo ? "Activo" : "Inactivo"}</button>
                          <button onClick={() => { setEditU({ ...u, privilegios: u.privilegios || [] }); setFormTipo("usuario"); setShowForm(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                          {u.rol !== "admin" && <button onClick={() => deleteU(u.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB AVISOS ── */}
      {tab === "avisos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{avisos.length} avisos</span>
            <Btn onClick={() => { setEditA({ ...emptyA, id: genId() }); setFormTipo("aviso"); setShowForm(true); }} style={{ fontSize: 13 }}>+ Nuevo aviso</Btn>
          </div>
          {showForm && formTipo === "aviso" && editA && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>Nuevo aviso</h3>
              <Field label="Tipo">
                <Sel value={editA.tipo} onChange={e => setEditA({ ...editA, tipo: e.target.value })}>
                  <option>Información</option><option>Mantenimiento</option><option>Falla</option>
                </Sel>
              </Field>
              <Field label="Título"><Inp value={editA.titulo} onChange={e => setEditA({ ...editA, titulo: e.target.value })} /></Field>
              <Field label="Mensaje">
                <textarea value={editA.mensaje} onChange={e => setEditA({ ...editA, mensaje: e.target.value })} style={{ background: "#0a1628", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 70, resize: "vertical" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                <Field label="Afecta">
                  <Sel value={editA.afecta} onChange={e => setEditA({ ...editA, afecta: e.target.value })}>
                    <option>Internet</option><option>TV</option><option>Ambos</option>
                  </Sel>
                </Field>
                <Field label="Fecha"><Inp type="date" value={editA.fecha} onChange={e => setEditA({ ...editA, fecha: e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => saveA(editA)}>Guardar</Btn>
                <Btn variant="ghost" onClick={() => { setShowForm(false); setEditA(null); setFormTipo(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {avisos.map(a => (
              <div key={a.id} style={{ background: "#0f172a", border: "1px solid " + TIPO_COLOR[a.tipo] + "33", borderLeft: "4px solid " + TIPO_COLOR[a.tipo], borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Badge text={a.tipo} color={TIPO_COLOR[a.tipo]} />
                  <span style={{ fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{a.titulo}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Afecta: {a.afecta}</span>
                  <button onClick={() => toggleA(a.id)} style={{ background: a.activo ? "#22c55e22" : "#1e293b", color: a.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 20, padding: "3px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{a.activo ? "Activo" : "Inactivo"}</button>
                  <button onClick={() => deleteA(a.id)} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>
                <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>{a.mensaje}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB PROPAGANDA / PROMOCIONES ── */}
      {tab === "propaganda" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>{propaganda.length} publicaciones · Solo el admin puede gestionar esto</span>
            <Btn onClick={() => { setEditPropa({ ...emptyPropa, id: genId() }); setFormTipo("propa"); setShowForm(true); }} variant="purple" style={{ fontSize: 13 }}>+ Nueva publicación</Btn>
          </div>

          {showForm && formTipo === "propa" && editPropa && (
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: "#f1f5f9", marginTop: 0, marginBottom: 16, fontSize: 15 }}>{editPropa.id && propaganda.find(x => x.id === editPropa.id) ? "Editar publicación" : "Nueva publicación"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="Categoría">
                  <Sel value={editPropa.categoria} onChange={e => setEditPropa({ ...editPropa, categoria: e.target.value, imagen: e.target.value === "camaras" ? "📷" : e.target.value === "equipos" ? "📶" : "🎁", color: e.target.value === "camaras" ? "#8b5cf6" : e.target.value === "equipos" ? "#22c55e" : "#0ea5e9" })}>
                    <option value="promocion">🏷️ Promoción</option>
                    <option value="equipos">🖥️ Venta de equipos</option>
                    <option value="camaras">📷 Venta de cámaras</option>
                  </Sel>
                </Field>
                <Field label="Emoji / Ícono">
                  <Inp value={editPropa.imagen} onChange={e => setEditPropa({ ...editPropa, imagen: e.target.value })} placeholder="Ej: 📡" style={{ fontSize: 20, textAlign: "center" }} />
                </Field>
                <Field label="Color de acento">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Inp type="color" value={editPropa.color} onChange={e => setEditPropa({ ...editPropa, color: e.target.value })} style={{ width: 50, padding: 4 }} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{editPropa.color}</span>
                  </div>
                </Field>
                <Field label="Válido hasta (opcional)">
                  <Inp type="date" value={editPropa.fecha} onChange={e => setEditPropa({ ...editPropa, fecha: e.target.value })} />
                </Field>
              </div>
              <Field label="Título de la publicación">
                <Inp value={editPropa.titulo} onChange={e => setEditPropa({ ...editPropa, titulo: e.target.value })} placeholder="Ej: 🎉 Promoción Especial de Abril" />
              </Field>
              <Field label="Descripción / detalle">
                <textarea value={editPropa.descripcion} onChange={e => setEditPropa({ ...editPropa, descripcion: e.target.value })} placeholder="Describe la promoción, equipo o servicio disponible..." style={{ background: "#0a1628", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 80, resize: "vertical" }} />
              </Field>
              {/* Vista previa */}
              {editPropa.titulo && (
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid " + editPropa.color + "44", borderLeft: "4px solid " + editPropa.color }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Vista previa</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>{editPropa.imagen}</span>
                    <span style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 14 }}>{editPropa.titulo}</span>
                  </div>
                  {editPropa.descripcion && <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>{editPropa.descripcion}</p>}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn onClick={() => savePropa(editPropa)} variant="purple">Publicar</Btn>
                <Btn variant="ghost" onClick={() => { setShowForm(false); setEditPropa(null); setFormTipo(null); }}>Cancelar</Btn>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {propaganda.map(p => (
              <div key={p.id} style={{ background: "#0f172a", border: "1px solid " + p.color + "44", borderLeft: "4px solid " + p.color, borderRadius: 14, padding: "14px 16px", opacity: p.activo ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24 }}>{p.imagen}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 14 }}>{p.titulo}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <Badge text={p.categoria === "promocion" ? "🏷️ Promoción" : p.categoria === "equipos" ? "🖥️ Equipos" : "📷 Cámaras"} color={p.color} />
                      {p.fecha && <span style={{ fontSize: 11, color: "#64748b" }}>⏳ hasta {formatDate(p.fecha)}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => togglePropa(p.id)} style={{ background: p.activo ? "#22c55e22" : "#1e293b", color: p.activo ? "#22c55e" : "#64748b", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{p.activo ? "Activo" : "Inactivo"}</button>
                    <button onClick={() => { setEditPropa(p); setFormTipo("propa"); setShowForm(true); }} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>✏️</button>
                    <button onClick={() => deletePropa(p.id)} style={{ background: "#1e293b", color: "#ef4444", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
                <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{p.descripcion}</p>
              </div>
            ))}
            {propaganda.length === 0 && <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>Sin publicaciones. Crea la primera.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [usuarios, setUsuarios] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [propaganda, setPropaganda] = useState([]);
  const [sesion, setSesion] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginClave, setLoginClave] = useState("");
  const [loginError, setLoginError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorBD, setErrorBD] = useState(null);

  // ── Carga inicial desde Supabase ──────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const [z, pl, u, a, t, o, pr] = await Promise.all([
          db.getZonas(), db.getPlanes(), db.getUsuarios(),
          db.getAvisos(), db.getTickets(), db.getOrdenes(), db.getPropaganda()
        ]);
        setZonas(z); setPlanes(pl); setUsuarios(u);
        setAvisos(a); setTickets(t); setOrdenes(o); setPropaganda(pr);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setErrorBD("No se pudo conectar con la base de datos. Verifica tu SUPABASE_URL y SUPABASE_ANON.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Sincronizar sesión cuando cambia el usuario (ej: cambio de clave wifi)
  useEffect(() => {
    if (sesion) {
      const actualizado = usuarios.find(u => u.id === sesion.id);
      if (actualizado) setSesion(actualizado);
    }
  }, [usuarios]);

  const intentarLogin = () => {
    const u = usuarios.find(x => x.usuario === loginUser.trim() && x.clave === loginClave.trim() && x.activo);
    if (u) { setSesion(u); setLoginError(""); }
    else setLoginError("Usuario o clave incorrectos.");
  };

  const cerrarSesion = useCallback(() => { setSesion(null); setLoginUser(""); setLoginClave(""); }, []);

  // ── Cierre automático por inactividad (1 minuto) ──────────
  const timerRef = useRef(null);
  const resetTimer = useCallback(() => {
    if (!sesion) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { cerrarSesion(); }, 60000);
  }, [sesion, cerrarSesion]);

  useEffect(() => {
    if (!sesion) { clearTimeout(timerRef.current); return; }
    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    eventos.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => { eventos.forEach(e => window.removeEventListener(e, resetTimer)); clearTimeout(timerRef.current); };
  }, [sesion, resetTimer]);

  const ticketsNuevos = tickets.filter(t => t.estado === "Abierto").length;
  const ordenesHoyTecnico = sesion?.rol === "tecnico"
    ? ordenes.filter(o => o.tecnicoId === sesion.id && o.fecha === new Date().toISOString().split("T")[0] && o.estado !== "Completada" && o.estado !== "Cancelada").length
    : 0;

  // Nombre de empresa de la zona del usuario (para el header)
  const zonaHeader = sesion ? zonas.find(z => z.id === sesion.zonaId) : null;
  const nombreEmpresaHeader = zonaHeader?.nombreEmpresa || "GC HOGAR.NET S.A.S";

  // Pantalla de carga
  if (cargando) return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Sora','Segoe UI',sans-serif" }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <div style={{ color: "#0ea5e9", fontWeight: 700, fontSize: 16 }}>Conectando con la base de datos…</div>
      <div style={{ color: "#475569", fontSize: 13 }}>GC HOGAR.NET</div>
    </div>
  );

  // Pantalla de error de conexión
  if (errorBD) return (
    <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Sora','Segoe UI',sans-serif" }}>
      <div style={{ background: "#0f172a", border: "1px solid #ef444444", borderRadius: 16, padding: 32, maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ color: "#ef4444", marginBottom: 12 }}>Error de conexión</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{errorBD}</p>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, textAlign: "left", fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
          <div>1. Abre el archivo <strong style={{color:"#f1f5f9"}}>servicios-app-v6.jsx</strong></div>
          <div>2. Edita las constantes <strong style={{color:"#0ea5e9"}}>SUPABASE_URL</strong> y <strong style={{color:"#0ea5e9"}}>SUPABASE_ANON</strong></div>
          <div>3. Ejecuta el schema SQL en Supabase → SQL Editor</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f1f5f9", fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        input:focus, select:focus, textarea:focus { border-color: #0ea5e9 !important; }
        button { transition: opacity 0.15s; } button:hover { opacity: 0.85; }
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid #1e293b", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#020817ee", zIndex: 10, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {LOGO_URL ? (
            <img src={LOGO_URL} alt="Logo" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 8 }} />
          ) : (
            <span style={{ fontSize: 24 }}>📡</span>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9", letterSpacing: -0.5 }}>{nombreEmpresaHeader}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Gestión de servicios{zonaHeader ? ` · Zona ${zonaHeader.nombre}` : ""}
            </div>
          </div>
        </div>
        {sesion && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{sesion.nombre.split(" ")[0]}</div>
              <Badge text={ROLES[sesion.rol]} color={ROL_COLOR[sesion.rol]} />
            </div>
            {sesion.rol === "tecnico" && ordenesHoyTecnico > 0 && <span style={{ background: "#f59e0b", color: "#000", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{ordenesHoyTecnico} hoy</span>}
            {sesion.rol === "secretario" && ticketsNuevos > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{ticketsNuevos} nuevos</span>}
            <button onClick={cerrarSesion} style={{ background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>Salir</button>
          </div>
        )}
      </header>

      {/* LOGIN */}
      {!sesion && (
        <div style={{ maxWidth: 380, margin: "70px auto", padding: 16 }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 18, padding: 32, textAlign: "center" }}>
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="Logo" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 12, borderRadius: 16 }} />
            ) : (
              <div style={{ fontSize: 52, marginBottom: 12 }}>📡</div>
            )}
            <h2 style={{ color: "#f1f5f9", marginBottom: 4, fontSize: 20 }}>GC HOGAR.NET</h2>
            <p style={{ color: "#64748b", marginBottom: 24, fontSize: 13 }}>Ingresa con tu usuario y clave</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <Inp value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="Usuario" onKeyDown={e => e.key === "Enter" && intentarLogin()} />
              <Inp type="password" value={loginClave} onChange={e => setLoginClave(e.target.value)} placeholder="Clave" onKeyDown={e => e.key === "Enter" && intentarLogin()} />
            </div>
            <Btn onClick={intentarLogin} style={{ width: "100%", padding: "12px 0", fontSize: 15 }}>Ingresar</Btn>
            {loginError && <p style={{ color: "#ef4444", marginTop: 12, fontSize: 13 }}>{loginError}</p>}
            <div style={{ marginTop: 20, background: "#1e293b", borderRadius: 10, padding: 12, textAlign: "left" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Usuarios demo</div>
              {[["admin", "admin123", "admin"], ["secretaria1", "sec123", "secretario"], ["tecnico1", "tec123", "tecnico"], ["12345678", "1234", "cliente"], ["empresa1", "emp123", "empresa"]].map(([u, c, r]) => (
                <div key={u} onClick={() => { setLoginUser(u); setLoginClave(c); }} style={{ cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge text={r} color={ROL_COLOR[r === "empresa" ? "cliente" : r]} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{u} / {c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PORTALES */}
      {sesion && sesion.rol === "cliente" && (
        <PortalCliente usuario={sesion} tickets={tickets} setTickets={setTickets} avisos={avisos} usuarios={usuarios} setUsuarios={setUsuarios} zonas={zonas} propaganda={propaganda} />
      )}
      {sesion && sesion.rol === "secretario" && (
        <PortalSecretario usuario={sesion} tickets={tickets} setTickets={setTickets} ordenes={ordenes} setOrdenes={setOrdenes} usuarios={usuarios} setUsuarios={setUsuarios} avisos={avisos} setAvisos={setAvisos} planes={planes} zonas={zonas} propaganda={propaganda} />
      )}
      {sesion && sesion.rol === "tecnico" && (
        <PortalTecnico usuario={sesion} ordenes={ordenes} setOrdenes={setOrdenes} tickets={tickets} setTickets={setTickets} zonas={zonas} />
      )}
      {sesion && sesion.rol === "admin" && (
        <PortalAdmin usuarios={usuarios} setUsuarios={setUsuarios} avisos={avisos} setAvisos={setAvisos} tickets={tickets} setTickets={setTickets} ordenes={ordenes} setOrdenes={setOrdenes} planes={planes} setPlanes={setPlanes} zonas={zonas} setZonas={setZonas} propaganda={propaganda} setPropaganda={setPropaganda} />
      )}
    </div>
  );
}
