# GC HOGAR.NET — Servicios App

## ⚡ Pasos para correr el proyecto

### 1. Instala las dependencias
```bash
npm install
```

### 2. Configura Supabase
Abre `src/App.jsx` y reemplaza las líneas 9 y 10:

```js
const SUPABASE_URL  = "https://TU_PROYECTO.supabase.co";
const SUPABASE_ANON = "TU_ANON_KEY";
```

Encuéntralas en: **Supabase → Project Settings → API**

### 3. Corre la app
```bash
npm run dev
```

Abre tu navegador en: http://localhost:5173

---

## 📦 Dependencias
- React 18
- @supabase/supabase-js 2
- Vite 6

## 👤 Usuarios demo
| Usuario      | Clave   | Rol         |
|-------------|---------|-------------|
| admin        | admin123 | Admin      |
| secretaria1  | sec123   | Secretario |
| tecnico1     | tec123   | Técnico    |
| 12345678     | 1234     | Cliente    |
| empresa1     | emp123   | Empresa    |
