import React, { useState, useReducer, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, CartesianGrid } from "recharts";

/* ═══════════════════════════════════════════════════════════════════
   PANADERÍA ERP v3.0 – Sistema de Gestión Integral
   + Gráficos Recharts · IA Anthropic · Clientes · Gastos
   + Empleados · Backup · Roles · Historial de Cambios
   ═══════════════════════════════════════════════════════════════════ */

const C = {
  sb:'#0F1729',sbBd:'#1E2A45',sbTx:'#8BA3C7',sbTxH:'#E2E8F0',
  sbAct:'#2563EB',sbActBg:'#1E3A8A22',
  bg:'#F0F4F8',card:'#FFFFFF',bd:'#E2E8F0',bdD:'#CBD5E1',
  t1:'#0F172A',t2:'#475569',t3:'#94A3B8',
  pr:'#2563EB',prD:'#1D4ED8',prL:'#EFF6FF',prT:'#BFDBFE',
  g:'#16A34A',gL:'#F0FDF4',gT:'#BBF7D0',
  a:'#D97706',aL:'#FFFBEB',aT:'#FDE68A',
  r:'#DC2626',rL:'#FEF2F2',rT:'#FECACA',
  b:'#0284C7',bL:'#E0F2FE',bT:'#BAE6FD',
  p:'#7C3AED',pL:'#F5F3FF',pT:'#DDD6FE',
  tl:'#0D9488',tlL:'#F0FDFA',tlT:'#99F6E4',
  o:'#EA580C',oL:'#FFF7ED',oT:'#FED7AA',
};
const card=(extra={})=>({background:C.card,border:`1px solid ${C.bd}`,borderRadius:12,boxShadow:'0 1px 4px rgba(15,23,42,.07)',...extra});
const inp={width:'100%',padding:'9px 12px',border:`1.5px solid ${C.bd}`,borderRadius:8,fontSize:13,color:C.t1,background:'#fff',outline:'none',boxSizing:'border-box',transition:'border-color .15s, box-shadow .15s'};
const sel={...inp,cursor:'pointer'};
const lbl={display:'block',fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,letterSpacing:'0.02em'};
const bPr={background:C.pr,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'background .15s',whiteSpace:'nowrap'};
const bSc={background:'#fff',color:C.t1,border:`1.5px solid ${C.bd}`,borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all .15s',whiteSpace:'nowrap'};
const bDgr={background:C.rL,color:C.r,border:`1.5px solid ${C.rT}`,borderRadius:7,padding:'6px 12px',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'};
const bSm=(bg,tx,bd2)=>({background:bg,color:tx,border:`1.5px solid ${bd2}`,borderRadius:6,padding:'5px 11px',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'});
const TH={padding:'10px 16px',fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:`2px solid ${C.bd}`,background:'#FAFBFD',textAlign:'left',whiteSpace:'nowrap'};
const TD={padding:'12px 16px',fontSize:13,color:C.t1,borderBottom:`1px solid ${C.bd}`,verticalAlign:'middle'};

// ── UTILITIES ────────────────────────────────────────────────────────
const uid=()=>Math.random().toString(36).substr(2,9);
const todayISO=()=>new Date().toISOString().split('T')[0];
const nowISO=()=>new Date().toISOString().replace('T',' ').substr(0,16);
const f2=n=>Number(n||0).toFixed(2);
const fN=n=>Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
const f1=n=>Number(n||0).toFixed(1);
const thisMonth=()=>todayISO().substring(0,7);
const pName=(products,id)=>products.find(p=>p.id===id)?.name||id;

function filterByPeriod(items,periodMode,periodVal,dateField='date'){
  if(!items?.length)return[];
  return items.filter(item=>{
    const d=(item[dateField]||'').substring(0,10);
    switch(periodMode){
      case'today':return d===todayISO();
      case'date':return d===periodVal.date;
      case'month':return d.startsWith(periodVal.month);
      case'range':return d>=periodVal.from&&d<=periodVal.to;
      default:return true;
    }
  });
}

// Export to CSV
// Descarga robusta: funciona en navegadores normales y dentro de iframes/artefactos.
// El anchor DEBE estar en el DOM y el URL no puede revocarse de inmediato,
// si no la descarga se cancela o la página navega fuera de la app.
function triggerDownload(blob,filename){
  try{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.target='_blank';a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{try{document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){}},2000);
  }catch(e){
    // Último recurso: abrir el contenido en una pestaña nueva para guardarlo manualmente
    try{
      const reader=new FileReader();
      reader.onload=()=>{const w=window.open();if(w)w.document.write('<pre>'+String(reader.result).replace(/</g,'&lt;')+'</pre>');};
      reader.readAsText(blob);
    }catch(e2){}
  }
}

function exportCSV(rows,filename){
  if(!rows.length)return;
  const headers=Object.keys(rows[0]);
  const csv=[headers.join(','),...rows.map(r=>headers.map(h=>{
    const v=r[h]??''; return typeof v==='string'&&v.includes(',')?`"${v}"`:v;
  }).join(','))].join('\n');
  triggerDownload(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),filename);
}

// Download JSON backup
function downloadJSON(data,filename){
  triggerDownload(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8;'}),filename);
}

// Pagination hook
function usePagination(items,pageSize=15){
  const[page,setPage]=useState(1);
  const totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  const paged=items.slice((page-1)*pageSize,page*pageSize);
  useEffect(()=>{if(page>totalPages&&totalPages>0)setPage(1);},[items.length,totalPages]);
  return{paged,page,setPage,totalPages};
}

// Call Anthropic AI
async function callAI(prompt){
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,messages:[{role:'user',content:prompt}]})
    });
    if(!res.ok)throw new Error('no disponible');
    const data=await res.json();
    return data.content?.find(b=>b.type==='text')?.text||'Sin respuesta';
  }catch(e){
    return '⚠ La sugerencia con IA no está disponible en esta instalación. Puedes decidir la producción revisando el historial de ventas de los últimos días en Reportes.';
  }
}

// Fetch exchange rates
async function fetchRates(){
  const res=await fetch('https://open.er-api.com/v6/latest/USD');
  const data=await res.json();
  return data.rates;
}


// ── INITIAL DATA ──────────────────────────────────────────────────────
const INIT={
  currencies:{
    usd:{code:'USD',symbol:'$',name:'Dólar',rate:1},
    eur:{code:'EUR',symbol:'€',name:'Euro',rate:0.93},
    ves:{code:'VES',symbol:'Bs.',name:'Bolívar',rate:36.50},
    ves_int:{code:'VES_INT',symbol:'Bs.I',name:'Cambio Interno',rate:40.00},
  },
  payment_methods:[
    {id:'pos',name:'Punto de Venta',color:C.pr},
    {id:'mobile',name:'Pago Móvil',color:C.p},
    {id:'cash_ves',name:'Efectivo Bs.',color:C.a},
    {id:'cash_usd',name:'Efectivo USD',color:C.g},
  ],
  products:[
    {id:'p1',code:'MP-001',name:'Harina de Trigo',type:'materia_prima',category:'Harinas',unit:'kg',cost:0.65,price:null,stock:200,min_stock:50,active:true,expiry:''},
    {id:'p2',code:'MP-002',name:'Azúcar',type:'materia_prima',category:'Endulzantes',unit:'kg',cost:0.80,price:null,stock:50,min_stock:20,active:true,expiry:''},
    {id:'p3',code:'MP-003',name:'Levadura',type:'materia_prima',category:'Leudantes',unit:'kg',cost:4.50,price:null,stock:8,min_stock:3,active:true,expiry:''},
    {id:'p4',code:'MP-004',name:'Sal',type:'materia_prima',category:'Condimentos',unit:'kg',cost:0.30,price:null,stock:15,min_stock:5,active:true,expiry:''},
    {id:'p5',code:'MP-005',name:'Mantequilla',type:'materia_prima',category:'Lácteos',unit:'kg',cost:5.20,price:null,stock:20,min_stock:10,active:true,expiry:''},
    {id:'p6',code:'MP-006',name:'Huevos',type:'materia_prima',category:'Lácteos',unit:'und',cost:0.15,price:null,stock:120,min_stock:60,active:true,expiry:''},
    {id:'p7',code:'PT-001',name:'Pan Francés',type:'terminado',category:'Panes',unit:'und',cost:0.06,price:0.25,stock:0,min_stock:0,active:true,expiry:''},
    {id:'p8',code:'PT-002',name:'Pan de Mantequilla',type:'terminado',category:'Panes',unit:'und',cost:0.10,price:0.35,stock:0,min_stock:0,active:true,expiry:''},
    {id:'p9',code:'PT-003',name:'Cachito',type:'terminado',category:'Bollería',unit:'und',cost:0.18,price:0.65,stock:0,min_stock:0,active:true,expiry:''},
    {id:'p10',code:'PV-001',name:'Refresco Cola 350ml',type:'venta',category:'Bebidas',unit:'und',cost:0.40,price:0.75,stock:48,min_stock:24,active:true,expiry:''},
    {id:'p11',code:'PV-002',name:'Agua Mineral 500ml',type:'venta',category:'Bebidas',unit:'und',cost:0.20,price:0.50,stock:36,min_stock:24,active:true,expiry:''},
    {id:'p12',code:'PV-003',name:'Jamón de Pierna',type:'venta',category:'Charcutería',unit:'kg',cost:3.50,price:6.00,stock:5,min_stock:2,active:true,expiry:''},
  ],
  suppliers:[
    {id:'s1',code:'PRV-001',name:'Molinos del Sur C.A.',contact:'0412-1234567',rif:'J-12345678-9',category:'Harinas',active:true},
    {id:'s2',code:'PRV-002',name:'Bebidas & Más C.A.',contact:'0414-9876543',rif:'J-98765432-1',category:'Bebidas',active:true},
    {id:'s3',code:'PRV-003',name:'Frigorífico La Granja',contact:'0416-5551234',rif:'J-55512345-0',category:'Charcutería',active:true},
  ],
  formulas:[
    {id:'f1',name:'Pan Francés',product_id:'p7',yield_qty:250,yield_unit:'und',cost_est:14.50,active:true,notes:'Fórmula base. 1 saco 50kg = 250 panes aprox.',
      ingredients:[{product_id:'p1',qty:50,unit:'kg'},{product_id:'p3',qty:0.5,unit:'kg'},{product_id:'p4',qty:0.8,unit:'kg'},{product_id:'p2',qty:0.5,unit:'kg'}]},
    {id:'f2',name:'Pan de Mantequilla',product_id:'p8',yield_qty:200,yield_unit:'und',cost_est:32.00,active:true,notes:'Pan suave y esponjoso.',
      ingredients:[{product_id:'p1',qty:50,unit:'kg'},{product_id:'p2',qty:5,unit:'kg'},{product_id:'p3',qty:0.5,unit:'kg'},{product_id:'p4',qty:0.5,unit:'kg'},{product_id:'p5',qty:3,unit:'kg'},{product_id:'p6',qty:10,unit:'und'}]},
    {id:'f3',name:'Cachito Relleno',product_id:'p9',yield_qty:150,yield_unit:'und',cost_est:40.00,active:true,notes:'Cachito con jamón. Rendimiento por saco.',
      ingredients:[{product_id:'p1',qty:50,unit:'kg'},{product_id:'p2',qty:4,unit:'kg'},{product_id:'p3',qty:0.5,unit:'kg'},{product_id:'p4',qty:0.4,unit:'kg'},{product_id:'p5',qty:5,unit:'kg'},{product_id:'p6',qty:20,unit:'und'}]},
  ],
  production_runs:[],sales:[],purchases:[],cash_closes:[],inv_movements:[],
  // ── NEW IN v3 ──
  clients:[],
  expenses:[],
  employees:[],
  payables:[],
  audit_log:[],
  current_role:'admin',
  // ── USUARIOS Y LOGIN ──
  users:[
    {id:'u_admin',name:'Administrador',username:'admin',password:'admin123',role:'admin',active:true},
  ],
  current_user:null,
};

// ── REDUCER ───────────────────────────────────────────────────────────
function reducer(st,ac){
  const audit=(action,detail)=>({id:uid(),date:nowISO(),action,detail,role:st.current_role,user:st.current_user?.name||'—'});
  switch(ac.type){
    case'LOGIN':return{...st,current_user:ac.user,current_role:ac.user.role,
      audit_log:[{id:uid(),date:nowISO(),action:'LOGIN',detail:`Inició sesión: ${ac.user.name}`,role:ac.user.role,user:ac.user.name},...st.audit_log].slice(0,500)};
    case'LOGOUT':return{...st,current_user:null,
      audit_log:[{id:uid(),date:nowISO(),action:'LOGOUT',detail:`Cerró sesión: ${st.current_user?.name||''}`,role:st.current_role,user:st.current_user?.name||'—'},...st.audit_log].slice(0,500)};
    case'ADD_USER':return{...st,users:[...st.users,ac.p],audit_log:[audit('NUEVO_USUARIO',ac.p.name),...st.audit_log].slice(0,500)};
    case'UPD_USER':{
      const users=st.users.map(u=>u.id===ac.p.id?ac.p:u);
      const current_user=st.current_user?.id===ac.p.id?ac.p:st.current_user;
      return{...st,users,current_user,current_role:current_user?.role||st.current_role,audit_log:[audit('EDITAR_USUARIO',ac.p.name),...st.audit_log].slice(0,500)};
    }
    case'DEL_USER':return{...st,users:st.users.filter(u=>u.id!==ac.id),audit_log:[audit('ELIMINAR_USUARIO',ac.name||ac.id),...st.audit_log].slice(0,500)};
    case'LOAD':{
      const p=ac.p||{};
      // Sanitize old saved data to prevent render crashes
      const safeProducts=(Array.isArray(p.products)?p.products:INIT.products).map(x=>({
        ...x,
        id:x.id||uid(),code:String(x.code??''),name:String(x.name??'Sin nombre'),
        type:x.type||'materia_prima',category:String(x.category??''),unit:x.unit||'und',
        cost:Number(x.cost)||0,price:x.price==null?null:Number(x.price)||0,
        stock:Number(x.stock)||0,min_stock:Number(x.min_stock)||0,
        active:x.active!==false,expiry:x.expiry||'',
      }));
      let safeUsers=(Array.isArray(p.users)&&p.users.length?p.users:INIT.users).map(u=>({...u,role:['admin','cajero','produccion'].includes(u.role)?u.role:'cajero'}));
      if(!safeUsers.some(u=>u.role==='admin'&&u.active!==false))safeUsers=[...safeUsers,{...INIT.users[0],id:'u_admin_'+uid()}];
      return{...INIT,...p,
        products:safeProducts,
        formulas:Array.isArray(p.formulas)?p.formulas:INIT.formulas,
        production_runs:Array.isArray(p.production_runs)?p.production_runs:[],
        sales:Array.isArray(p.sales)?p.sales:[],
        purchases:Array.isArray(p.purchases)?p.purchases:[],
        cash_closes:Array.isArray(p.cash_closes)?p.cash_closes:[],
        inv_movements:Array.isArray(p.inv_movements)?p.inv_movements:[],
        clients:Array.isArray(p.clients)?p.clients:[],
        expenses:Array.isArray(p.expenses)?p.expenses:[],
        employees:Array.isArray(p.employees)?p.employees:[],
        payables:Array.isArray(p.payables)?p.payables:[],
        audit_log:Array.isArray(p.audit_log)?p.audit_log:[],
        payment_methods:Array.isArray(p.payment_methods)&&p.payment_methods.length?p.payment_methods:INIT.payment_methods,
        currencies:p.currencies&&typeof p.currencies==='object'?{...INIT.currencies,...p.currencies}:INIT.currencies,
        suppliers:Array.isArray(p.suppliers)?p.suppliers:INIT.suppliers,
        current_role:['admin','cajero','produccion'].includes(p.current_role)?p.current_role:'admin',
        users:safeUsers,
        current_user:null, // siempre pedir login al recargar
      };
    }

    case'ADD_PRODUCT':return{...st,products:[...st.products,ac.p],audit_log:[audit('PRODUCTO_CREADO',ac.p.name),...st.audit_log].slice(0,500)};
    case'UPD_PRODUCT':return{...st,products:st.products.map(p=>p.id===ac.p.id?ac.p:p),audit_log:[audit('PRODUCTO_EDITADO',ac.p.name),...st.audit_log].slice(0,500)};
    case'DEL_PRODUCT':return{...st,products:st.products.filter(p=>p.id!==ac.id)};

    case'ADD_SUPPLIER':return{...st,suppliers:[...st.suppliers,ac.p]};
    case'UPD_SUPPLIER':return{...st,suppliers:st.suppliers.map(s=>s.id===ac.p.id?ac.p:s)};

    case'ADD_FORMULA':return{...st,formulas:[...st.formulas,ac.p],audit_log:[audit('FORMULA_CREADA',ac.p.name),...st.audit_log].slice(0,500)};
    case'UPD_FORMULA':return{...st,formulas:st.formulas.map(f=>f.id===ac.p.id?ac.p:f),audit_log:[audit('FORMULA_EDITADA',ac.p.name),...st.audit_log].slice(0,500)};
    case'DEL_FORMULA':return{...st,formulas:st.formulas.filter(f=>f.id!==ac.id)};

    case'ADD_PRODUCTION':{
      let prods=st.products.map(p=>{const used=ac.p.ingredients_used.find(i=>i.product_id===p.id);return used?{...p,stock:Math.max(0,p.stock-used.qty)}:p;});
      const prodId=ac.p.product_id;
      if(prodId)prods=prods.map(p=>p.id===prodId?{...p,stock:p.stock+ac.p.actual_yield}:p);
      const movs=[
        ...ac.p.ingredients_used.map(ing=>({id:uid(),product_id:ing.product_id,type:'salida',qty:ing.qty,reason:'Producción',ref_id:ac.p.id,ref_type:'production',date:ac.p.date,notes:`Producción: ${ac.p.formula_name}`})),
        ...(prodId?[{id:uid(),product_id:prodId,type:'entrada',qty:ac.p.actual_yield,reason:'Producción terminada',ref_id:ac.p.id,ref_type:'production',date:ac.p.date,notes:`Producción: ${ac.p.formula_name}`}]:[])
      ];
      return{...st,products:prods,production_runs:[ac.p,...st.production_runs],inv_movements:[...movs,...st.inv_movements],audit_log:[audit('PRODUCCION',`${ac.p.formula_name} x${ac.p.actual_yield}`),...st.audit_log].slice(0,500)};
    }

    case'ADD_SALE':{
      const sale={...ac.p,ts:ac.p.ts||Date.now(),sold_by:st.current_user?.name||'—'};
      const prods=st.products.map(p=>{const item=sale.items.find(i=>i.product_id===p.id);return item?{...p,stock:Math.max(0,p.stock-item.qty)}:p;});
      const movs=sale.items.map(item=>({id:uid(),product_id:item.product_id,type:'salida',qty:item.qty,reason:'Venta',ref_id:sale.id,ref_type:'sale',date:sale.date,notes:'Factura venta'}));
      // Update client stats
      let clients=st.clients;
      if(sale.client_id){clients=clients.map(c=>c.id===sale.client_id?{...c,total_purchases:(c.total_purchases||0)+sale.total_usd,last_purchase:sale.date}:c);}
      return{...st,products:prods,sales:[sale,...st.sales],inv_movements:[...movs,...st.inv_movements],clients,audit_log:[audit('VENTA',`$${f2(sale.total_usd)} - ${sale.client||'Mostrador'}`),...st.audit_log].slice(0,500)};
    }

    case'ADD_PURCHASE':{
      const prods=st.products.map(p=>{const item=ac.p.items.find(i=>i.product_id===p.id);return item?{...p,stock:p.stock+item.qty,cost:item.cost_unit}:p;});
      const movs=ac.p.items.map(item=>({id:uid(),product_id:item.product_id,type:'entrada',qty:item.qty,reason:'Compra',ref_id:ac.p.id,ref_type:'purchase',date:ac.p.date,notes:`Factura: ${ac.p.invoice_num}`}));
      const payables=ac.p.is_credit?[{id:uid(),purchase_id:ac.p.id,supplier_id:ac.p.supplier_id,invoice_num:ac.p.invoice_num,amount_usd:ac.p.total_usd,due_date:ac.p.due_date||'',paid:false,date:ac.p.date},...st.payables]:st.payables;
      return{...st,products:prods,purchases:[ac.p,...st.purchases],inv_movements:[...movs,...st.inv_movements],payables,audit_log:[audit('COMPRA',`${ac.p.invoice_num} $${f2(ac.p.total_usd)}`),...st.audit_log].slice(0,500)};
    }

    case'ADD_CASH_CLOSE':return{...st,cash_closes:[{...ac.p,ts:ac.p.ts||Date.now()},...st.cash_closes]};

    case'ADJUST_STOCK':{
      const mov={id:uid(),product_id:ac.product_id,type:Number(ac.qty)>0?'entrada':'salida',qty:Math.abs(Number(ac.qty)),reason:'Ajuste manual',ref_id:null,ref_type:'adjustment',date:todayISO(),notes:ac.notes||'Ajuste de inventario'};
      return{...st,products:st.products.map(p=>p.id===ac.product_id?{...p,stock:Math.max(0,p.stock+Number(ac.qty))}:p),inv_movements:[mov,...st.inv_movements],audit_log:[audit('AJUSTE_STOCK',`${pName(st.products,ac.product_id)} ${ac.qty>0?'+':''}${ac.qty}`),...st.audit_log].slice(0,500)};
    }

    case'SET_CURRENCIES':return{...st,currencies:ac.p,audit_log:[audit('TASAS_ACTUALIZADAS','Monedas actualizadas'),...st.audit_log].slice(0,500)};
    case'SET_PM':return{...st,payment_methods:ac.p};
    case'SET_ROLE':return{...st,current_role:ac.role};
    case'EMPLOYEE_DEDUCTION':{
      const ded={...ac.deduction,ts:ac.deduction.ts||Date.now()};
      const employees=st.employees.map(e=>e.id===ac.employee_id
        ?{...e,salary_deductions:[ded,...(e.salary_deductions||[])]}:e);
      return{...st,employees,audit_log:[audit('DESCUENTO_EMPLEADO',`${employees.find(e=>e.id===ac.employee_id)?.name} -$${f2(ac.deduction.amount_usd)}`),...st.audit_log].slice(0,500)};
    }

    // Clientes
    case'ADD_CLIENT':return{...st,clients:[...st.clients,ac.p]};
    case'UPD_CLIENT':return{...st,clients:st.clients.map(c=>c.id===ac.p.id?ac.p:c)};
    case'DEL_CLIENT':return{...st,clients:st.clients.filter(c=>c.id!==ac.id)};

    // Gastos
    case'ADD_EXPENSE':return{...st,expenses:[{...ac.p,ts:ac.p.ts||Date.now()},...st.expenses],audit_log:[audit('GASTO',`${ac.p.category} $${f2(ac.p.amount_usd)}`),...st.audit_log].slice(0,500)};
    case'UPD_EXPENSE':return{...st,expenses:st.expenses.map(e=>e.id===ac.p.id?ac.p:e)};
    case'DEL_EXPENSE':return{...st,expenses:st.expenses.filter(e=>e.id!==ac.id)};

    // Empleados
    case'ADD_EMPLOYEE':return{...st,employees:[...st.employees,ac.p]};
    case'UPD_EMPLOYEE':return{...st,employees:st.employees.map(e=>e.id===ac.p.id?ac.p:e)};
    case'DEL_EMPLOYEE':{
      const emp=st.employees.find(e=>e.id===ac.id);
      return{...st,employees:st.employees.filter(e=>e.id!==ac.id),audit_log:[audit('ELIMINAR_EMPLEADO',emp?.name||ac.id),...st.audit_log].slice(0,500)};
    }
    case'RESET_SALES_HISTORY':return{...st,sales:[],cash_closes:[],inv_movements:[],
      clients:st.clients.map(c=>({...c,total_purchases:0,last_purchase:''})),
      employees:st.employees.map(e=>({...e,salary_deductions:[]})),
      audit_log:[audit('RESET_HISTORIAL','Ventas, cierres y movimientos borrados'),...st.audit_log].slice(0,500)};

    // Cuentas por Pagar
    case'PAY_PAYABLE':return{...st,payables:st.payables.map(p=>p.id===ac.id?{...p,paid:true,paid_date:todayISO()}:p),audit_log:[audit('PAGO_CxP',`Factura ${ac.invoice_num||ac.id}`),...st.audit_log].slice(0,500)};

    default:return st;
  }
}

// ── UI COMPONENTS ─────────────────────────────────────────────────────
function Toast({msg,type='success',onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3200);return()=>clearTimeout(t);},[]);
  const colors={success:[C.gL,C.g],error:[C.rL,C.r],info:[C.bL,C.b],warning:[C.aL,C.a]};
  const[bg,tx]=colors[type]||colors.success;
  return(<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:bg,border:`1.5px solid ${tx}`,color:tx,borderRadius:10,padding:'12px 18px',fontSize:13,fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',maxWidth:360,display:'flex',alignItems:'center',gap:8}}>
    {type==='success'?'✓':type==='error'?'✕':type==='warning'?'⚠':'ℹ'} {msg}
  </div>);
}
function useToast(){
  const[toast,setToast]=useState(null);
  const show=(msg,type='success')=>setToast({msg,type,k:Date.now()});
  const el=toast&&<Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>;
  return[el,show];
}
function Modal({title,children,onClose,width=580,footer}){
  return(<div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,backdropFilter:'blur(2px)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'#fff',borderRadius:16,width,maxWidth:'95vw',maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(15,23,42,.25)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:16,color:C.t1}}>{title}</div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.t3,fontSize:20,lineHeight:1,padding:4,borderRadius:6}}>×</button>
      </div>
      <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>{children}</div>
      {footer&&<div style={{padding:'14px 24px',borderTop:`1px solid ${C.bd}`,display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0,background:'#FAFBFD',borderRadius:'0 0 16px 16px'}}>{footer}</div>}
    </div>
  </div>);
}
function Badge({txt,color,bg,size=12}){
  return <span style={{background:bg||color+'22',color,padding:'3px 9px',borderRadius:20,fontSize:size,fontWeight:600,whiteSpace:'nowrap',letterSpacing:'0.02em'}}>{txt}</span>;
}
const TYPE_BADGE=t=>{
  if(t==='materia_prima')return <Badge txt="Materia Prima" color={C.b} bg={C.bL}/>;
  if(t==='terminado')return <Badge txt="Producto Final" color={C.g} bg={C.gL}/>;
  if(t==='venta')return <Badge txt="Para Venta" color={C.p} bg={C.pL}/>;
  return <Badge txt={t} color={C.t3}/>;
};
function KPICard({label,value,sub,icon,color,onClick}){
  return(<div onClick={onClick} style={{...card(),padding:'18px 20px',borderLeft:`4px solid ${color}`,display:'flex',flexDirection:'column',gap:6,cursor:onClick?'pointer':'default',transition:'transform .12s'}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{if(onClick)e.currentTarget.style.transform=''}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
      <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      <span style={{fontSize:20}}>{icon}</span>
    </div>
    <div style={{fontSize:26,fontWeight:800,color:C.t1,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:C.t3}}>{sub}</div>}
  </div>);
}
function PageHeader({title,sub,children}){
  return(<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${C.bd}`}}>
    <div>
      <div style={{fontSize:20,fontWeight:800,color:C.t1}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:C.t3,marginTop:2}}>{sub}</div>}
    </div>
    {children&&<div style={{display:'flex',gap:8,alignItems:'center'}}>{children}</div>}
  </div>);
}
function EmptyState({icon,title,sub}){
  return(<div style={{textAlign:'center',padding:'48px 20px',color:C.t3}}>
    <div style={{fontSize:40,marginBottom:12}}>{icon}</div>
    <div style={{fontSize:15,fontWeight:700,color:C.t2,marginBottom:4}}>{title}</div>
    {sub&&<div style={{fontSize:13}}>{sub}</div>}
  </div>);
}
function SortTH({label,skey,sort,onSort}){
  const active=sort.key===skey;
  return(<th style={{...TH,cursor:'pointer',userSelect:'none'}} onClick={()=>onSort(skey)}>
    <span style={{color:active?C.pr:'inherit'}}>{label}</span>
    <span style={{marginLeft:4,opacity:active?1:0.3}}>{active?(sort.dir==='asc'?'↑':'↓'):'↕'}</span>
  </th>);
}
function Pagination({page,totalPages,setPage}){
  if(totalPages<=1)return null;
  return(<div style={{display:'flex',justifyContent:'center',gap:6,padding:'14px',borderTop:`1px solid ${C.bd}`}}>
    <button style={bSm(C.card,C.t2,C.bd)} onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}>‹</button>
    {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
      let p=i+1;
      if(totalPages>5){if(page<=3)p=i+1;else if(page>=totalPages-2)p=totalPages-4+i;else p=page-2+i;}
      return(<button key={p} onClick={()=>setPage(p)} style={bSm(p===page?C.pr:C.card,p===page?'#fff':C.t2,p===page?C.pr:C.bd)}>{p}</button>);
    })}
    <button style={bSm(C.card,C.t2,C.bd)} onClick={()=>setPage(Math.min(totalPages,page+1))} disabled={page===totalPages}>›</button>
    <span style={{fontSize:12,color:C.t3,alignSelf:'center'}}>Pág {page}/{totalPages}</span>
  </div>);
}

// ── NAV ───────────────────────────────────────────────────────────────
const NAV=[
  {id:'dashboard',label:'Dashboard',icon:'◈',group:null},
  {id:'_op',label:'OPERACIONES',group:'header'},
  {id:'formulas',label:'Fórmulas',icon:'📋',group:'op'},
  {id:'produccion',label:'Producción',icon:'🏭',group:'op'},
  {id:'ventas',label:'Ventas',icon:'🛒',group:'op'},
  {id:'compras',label:'Compras',icon:'📦',group:'op'},
  {id:'_inv',label:'INVENTARIO',group:'header'},
  {id:'inventario',label:'Inventario',icon:'🗃',group:'inv'},
  {id:'productos',label:'Productos',icon:'🔖',group:'inv'},
  {id:'_fin',label:'FINANZAS',group:'header'},
  {id:'caja',label:'Cuadre de Caja',icon:'💰',group:'fin'},
  {id:'gastos',label:'Gastos Operativos',icon:'💸',group:'fin'},
  {id:'reportes',label:'Reportes',icon:'📊',group:'fin'},
  {id:'_sys',label:'SISTEMA',group:'header'},
  {id:'clientes',label:'Clientes',icon:'👥',group:'sys'},
  {id:'empleados',label:'Empleados',icon:'👤',group:'sys'},
  {id:'config',label:'Configuración',icon:'⚙',group:'sys'},
];
const ROLE_PAGES={
  admin:['dashboard','formulas','produccion','ventas','compras','inventario','productos','caja','gastos','reportes','clientes','empleados','config'],
  cajero:['dashboard','ventas','caja','clientes'],
  produccion:['dashboard','formulas','produccion','inventario','productos'],
};

function Sidebar({active,setActive,lowStock=0,role}){
  const allowed=ROLE_PAGES[role]||ROLE_PAGES.admin;
  return(<aside style={{width:235,background:C.sb,display:'flex',flexDirection:'column',flexShrink:0,borderRight:`1px solid ${C.sbBd}`,height:'100vh',position:'sticky',top:0}}>
    <div style={{padding:'20px 18px 16px',borderBottom:`1px solid ${C.sbBd}`}}>
      <div style={{fontWeight:800,fontSize:15,color:'#E2E8F0',letterSpacing:'-0.3px'}}>🥐 <span style={{color:'#60A5FA'}}>La Brioche</span></div>
      <div style={{fontSize:10,color:C.sbTx,marginTop:2,letterSpacing:'0.08em',textTransform:'uppercase'}}>Panadería · Sistema de Gestión</div>
    </div>
    <nav style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
      {NAV.map(item=>{
        if(item.group==='header')return(<div key={item.id} style={{padding:'14px 18px 5px',fontSize:10,fontWeight:700,color:'#3B5080',textTransform:'uppercase',letterSpacing:'0.1em'}}>{item.label}</div>);
        if(!allowed.includes(item.id))return null;
        const isActive=active===item.id;
        return(<button key={item.id} onClick={()=>setActive(item.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 18px',background:isActive?C.sbActBg:'transparent',border:'none',cursor:'pointer',textAlign:'left',borderLeft:isActive?`3px solid ${C.sbAct}`:'3px solid transparent',transition:'all .12s'}}>
          <span style={{fontSize:14,opacity:.85}}>{item.icon}</span>
          <span style={{fontSize:13,fontWeight:isActive?700:500,color:isActive?'#E2E8F0':C.sbTx}}>{item.label}</span>
          {item.id==='inventario'&&lowStock>0&&(<span style={{marginLeft:'auto',background:C.r,color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>{lowStock}</span>)}
        </button>);
      })}
    </nav>
    <div style={{padding:'14px 18px',borderTop:`1px solid ${C.sbBd}`}}>
      <div style={{fontSize:11,color:'#3B5080',fontWeight:600}}>Versión 3.0.0</div>
      <div style={{fontSize:11,color:'#3B5080',marginTop:1,textTransform:'capitalize'}}>{role}</div>
    </div>
  </aside>);
}

function PeriodSelector({mode,val,onChange}){
  const tabs=[{id:'today',label:'Hoy'},{id:'date',label:'Fecha'},{id:'month',label:'Mes'},{id:'range',label:'Rango'}];
  return(<div style={{...card(),padding:'14px 20px',marginBottom:20,display:'flex',flexWrap:'wrap',alignItems:'center',gap:12}}>
    <div style={{fontSize:12,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginRight:4}}>Período:</div>
    <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:`1.5px solid ${C.bd}`,flexShrink:0}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>onChange({...val,mode:t.id})} style={{padding:'7px 14px',background:mode===t.id?C.pr:'#fff',color:mode===t.id?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .15s',borderRight:`1px solid ${C.bd}`}}>{t.label}</button>))}
    </div>
    {mode==='date'&&<input type="date" style={{...inp,width:'auto'}} value={val.date||todayISO()} onChange={e=>onChange({...val,date:e.target.value})}/>}
    {mode==='month'&&<input type="month" style={{...inp,width:'auto'}} value={val.month||thisMonth()} onChange={e=>onChange({...val,month:e.target.value})}/>}
    {mode==='range'&&<div style={{display:'flex',alignItems:'center',gap:8}}>
      <input type="date" style={{...inp,width:'auto'}} value={val.from||todayISO()} onChange={e=>onChange({...val,from:e.target.value})}/>
      <span style={{color:C.t3,fontSize:12}}>hasta</span>
      <input type="date" style={{...inp,width:'auto'}} value={val.to||todayISO()} onChange={e=>onChange({...val,to:e.target.value})}/>
    </div>}
    <div style={{marginLeft:'auto',fontSize:12,color:C.t3}}>
      {mode==='today'&&`📅 ${new Date().toLocaleDateString('es-VE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
      {mode==='date'&&val.date&&`📅 ${new Date(val.date+'T12:00').toLocaleDateString('es-VE',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}`}
      {mode==='month'&&val.month&&`📅 ${val.month}`}
      {mode==='range'&&val.from&&val.to&&`📅 ${val.from} → ${val.to}`}
    </div>
  </div>);
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
function Dashboard({st,navigate}){
  const[period,setPeriod]=useState({mode:'today',date:todayISO(),month:thisMonth(),from:todayISO(),to:todayISO()});
  const filteredSales=useMemo(()=>filterByPeriod(st.sales,period.mode,period),[st.sales,period]);
  const filteredPurchases=useMemo(()=>filterByPeriod(st.purchases,period.mode,period),[st.purchases,period]);
  const filteredProds=useMemo(()=>filterByPeriod(st.production_runs,period.mode,period),[st.production_runs,period]);
  const filteredExpenses=useMemo(()=>filterByPeriod(st.expenses||[],period.mode,period),[st.expenses,period]);

  const totalVendido=filteredSales.reduce((a,s)=>a+s.total_usd,0);
  const totalIngresado=filteredPurchases.reduce((a,p)=>a+p.total_usd,0);
  const totalGastos=filteredExpenses.reduce((a,e)=>a+e.amount_usd,0);
  const totalPanes=filteredSales.reduce((a,s)=>a+s.items.filter(i=>{const p=st.products.find(x=>x.id===i.product_id);return p&&p.type==='terminado';}).reduce((b,i)=>b+i.qty,0),0);
  const totalUnidades=filteredSales.reduce((a,s)=>a+s.items.reduce((b,i)=>b+i.qty,0),0);
  const netResult=totalVendido-totalIngresado-totalGastos;

  const byPM=useMemo(()=>{
    const map={};st.payment_methods.forEach(pm=>map[pm.id]=0);
    filteredSales.forEach(s=>{
      if(s.payments&&s.payments.length>0){
        s.payments.forEach(p=>{map[p.method_id]=(map[p.method_id]||0)+p.amount_usd;});
      } else {
        map[s.payment_method]=(map[s.payment_method]||0)+s.total_usd;
      }
    });
    return map;
  },[filteredSales,st.payment_methods]);

  const ventasPorProducto=useMemo(()=>{
    const map={};filteredSales.forEach(sale=>sale.items.forEach(item=>{if(!map[item.product_id])map[item.product_id]={product_id:item.product_id,qty:0,total:0};map[item.product_id].qty+=item.qty;map[item.product_id].total+=item.total_usd;}));
    return Object.values(map).sort((a,b)=>b.total-a.total);
  },[filteredSales]);

  // Last 7 days sales chart
  const salesChartData=useMemo(()=>{
    const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=d.toISOString().split('T')[0];days.push({date:iso.slice(5),total:st.sales.filter(s=>s.date===iso).reduce((a,s)=>a+s.total_usd,0)});}
    return days;
  },[st.sales]);

  // Payment method chart data
  const pmChartData=st.payment_methods.map(pm=>({name:pm.name.split(' ')[0],value:Number(f2(byPM[pm.id]||0)),color:pm.color}));

  const lowStock=st.products.filter(p=>p.active&&p.stock<=p.min_stock&&p.min_stock>0);

  // Expiry alerts
  const nearExpiry=st.products.filter(p=>{if(!p.expiry)return false;const d=new Date(p.expiry);const diff=(d-new Date())/(1000*60*60*24);return diff>=0&&diff<=7;});

  return(<div>
    <PageHeader title="Dashboard" sub="Panel de control y resumen ejecutivo"/>
    <PeriodSelector mode={period.mode} val={period} onChange={setPeriod}/>

    {/* Alerts */}
    {(lowStock.length>0||nearExpiry.length>0)&&(<div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      {lowStock.length>0&&(<div style={{background:C.rL,border:`1.5px solid ${C.rT}`,borderRadius:10,padding:'10px 14px',display:'flex',gap:8,alignItems:'center',cursor:'pointer'}} onClick={()=>navigate('inventario')}>
        <span style={{fontWeight:700,color:C.r,fontSize:13}}>⚠️ {lowStock.length} productos bajo mínimo</span>
        {lowStock.slice(0,3).map(p=><Badge key={p.id} txt={p.name} color={C.r}/>)}
      </div>)}
      {nearExpiry.length>0&&(<div style={{background:C.aL,border:`1.5px solid ${C.aT}`,borderRadius:10,padding:'10px 14px',display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontWeight:700,color:C.a,fontSize:13}}>🗓 {nearExpiry.length} próximos a vencer</span>
        {nearExpiry.slice(0,3).map(p=><Badge key={p.id} txt={`${p.name}: ${p.expiry}`} color={C.a}/>)}
      </div>)}
    </div>)}

    {/* KPIs Row 1 */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
      <KPICard label="Total Vendido" value={`$${fN(totalVendido)}`} sub={`${filteredSales.length} transacciones`} icon="💰" color={C.g} onClick={()=>navigate('ventas')}/>
      <KPICard label="Total Compras" value={`$${fN(totalIngresado)}`} sub={`${filteredPurchases.length} facturas`} icon="📦" color={C.b} onClick={()=>navigate('compras')}/>
      <KPICard label="Gastos Operativos" value={`$${fN(totalGastos)}`} sub={`${filteredExpenses.length} registros`} icon="💸" color={C.o} onClick={()=>navigate('gastos')}/>
      <KPICard label="Resultado Neto" value={`$${fN(netResult)}`} sub={netResult>=0?'Positivo en el período':'Negativo en el período'} icon={netResult>=0?'📈':'📉'} color={netResult>=0?C.g:C.r}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
      <KPICard label="Panes Vendidos" value={totalPanes.toLocaleString()} sub={`${totalUnidades} unidades totales`} icon="🍞" color={C.a}/>
      {st.payment_methods.map(pm=><KPICard key={pm.id} label={pm.name} value={`$${fN(byPM[pm.id]||0)}`} sub="recaudado" icon="💳" color={pm.color}/>)}
    </div>

    {/* Charts Row */}
    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
      {/* Sales 7-day chart */}
      <div style={card({padding:20})}>
        <div style={{fontWeight:700,fontSize:14,color:C.t1,marginBottom:4}}>📈 Ventas Últimos 7 Días</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Tendencia diaria en USD</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={salesChartData} margin={{top:0,right:0,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.bd}/>
            <XAxis dataKey="date" tick={{fontSize:11,fill:C.t3}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.t3}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
            <Tooltip formatter={v=>[`$${fN(v)}`,'Ventas']} contentStyle={{borderRadius:8,border:`1px solid ${C.bd}`,fontSize:12}}/>
            <Bar dataKey="total" fill={C.pr} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment method bar chart */}
      <div style={card({padding:20})}>
        <div style={{fontWeight:700,fontSize:14,color:C.t1,marginBottom:4}}>💳 Por Método de Pago</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Distribución del período</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pmChartData} layout="vertical" margin={{top:0,right:10,left:0,bottom:0}}>
            <XAxis type="number" tick={{fontSize:11,fill:C.t3}} tickFormatter={v=>`$${v}`} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:C.t3}} width={60} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>[`$${fN(v)}`,'Monto']} contentStyle={{borderRadius:8,border:`1px solid ${C.bd}`,fontSize:12}}/>
            <Bar dataKey="value" radius={[0,4,4,0]}>
              {pmChartData.map((e,i)=><rect key={i} fill={e.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Products table */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={card({padding:0,overflow:'hidden'})}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,fontSize:14,color:C.t1}}>📤 Vendido en el Período</div>
          <div style={{fontWeight:800,fontSize:16,color:C.g}}>${fN(totalVendido)}</div>
        </div>
        {ventasPorProducto.length===0?<EmptyState icon="🛒" title="Sin ventas" sub="Registra ventas para ver el resumen"/>
        :<table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Producto</th><th style={{...TH,textAlign:'right'}}>Cant.</th><th style={{...TH,textAlign:'right'}}>Total</th><th style={{...TH,textAlign:'right'}}>%</th></tr></thead>
          <tbody>{ventasPorProducto.map(v=>(
            <tr key={v.product_id}>
              <td style={TD}><div style={{fontWeight:600,fontSize:12}}>{pName(st.products,v.product_id)}</div></td>
              <td style={{...TD,textAlign:'right',color:C.t2}}>{v.qty}</td>
              <td style={{...TD,textAlign:'right',fontWeight:700,color:C.g}}>${fN(v.total)}</td>
              <td style={{...TD,textAlign:'right'}}>
                <div style={{background:`${C.g}22`,height:4,borderRadius:2}}>
                  <div style={{background:C.g,height:4,borderRadius:2,width:`${Math.min(100,v.total/totalVendido*100)}%`}}/>
                </div>
                <span style={{fontSize:11,color:C.t3}}>{f1(v.total/totalVendido*100)}%</span>
              </td>
            </tr>
          ))}</tbody>
        </table>}
      </div>

      {/* Low stock widget */}
      <div style={card({padding:0,overflow:'hidden'})}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.bd}`,fontWeight:700,fontSize:14,color:C.t1}}>🗃 Estado de Inventario</div>
        {st.products.filter(p=>p.active&&p.min_stock>0).slice(0,8).map(p=>{
          const pct=p.min_stock>0?Math.min(100,p.stock/p.min_stock*100):100;
          const col=pct<=50?C.r:pct<=100?C.a:C.g;
          return(<div key={p.id} style={{padding:'10px 20px',borderBottom:`1px solid ${C.bd}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:600,color:C.t1}}>{p.name}</span>
              <span style={{fontSize:12,color:col,fontWeight:700}}>{f2(p.stock)}/{p.min_stock} {p.unit}</span>
            </div>
            <div style={{height:4,background:C.bd,borderRadius:2}}>
              <div style={{height:4,background:col,borderRadius:2,width:`${pct}%`,transition:'width .3s'}}/>
            </div>
          </div>);
        })}
        <div style={{padding:'12px 20px',textAlign:'center'}}>
          <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>navigate('inventario')}>Ver inventario completo</button>
        </div>
      </div>
    </div>
  </div>);
}

// ── PRODUCTOS ─────────────────────────────────────────────────────────
function Productos({st,dispatch}){
  const[showForm,setShowForm]=useState(false);
  const[editing,setEditing]=useState(null);
  const[search,setSearch]=useState('');
  const[typeFilter,setTypeFilter]=useState('all');
  const[sort,setSort]=useState({key:'name',dir:'asc'});
  const[ToastEl,showToast]=useToast();

  function openEdit(p){setEditing(p||{id:uid(),code:'',name:'',type:'materia_prima',category:'',unit:'kg',cost:'',price:'',stock:'0',min_stock:'0',active:true,expiry:''});setShowForm(true);}
  function save(p){
    const exists=st.products.find(x=>x.id===p.id);
    dispatch(exists?{type:'UPD_PRODUCT',p}:{type:'ADD_PRODUCT',p});
    showToast('Producto guardado');setShowForm(false);setEditing(null);
  }

  const onSort=k=>setSort(s=>({key:k,dir:s.key===k&&s.dir==='asc'?'desc':'asc'}));
  let filtered=st.products.filter(p=>(typeFilter==='all'||p.type===typeFilter)&&(!search||(p.name||'').toLowerCase().includes(search.toLowerCase())||(p.code||'').toLowerCase().includes(search.toLowerCase())));
  filtered=[...filtered].sort((a,b)=>{const v=sort.dir==='asc'?1:-1;const av=a[sort.key],bv=b[sort.key];if(typeof av==='string'||typeof bv==='string')return String(av||'').localeCompare(String(bv||''))*v;return((Number(av)||0)-(Number(bv)||0))*v;});

  return(<div>
    {ToastEl}
    <PageHeader title="Productos" sub="Catálogo de materias primas y productos">
      <button style={bPr} onClick={()=>openEdit(null)}>+ Nuevo Producto</button>
    </PageHeader>

    <div style={{...card(),padding:'14px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
      <input style={{...inp,flex:1,minWidth:200}} placeholder="🔍 Buscar por nombre o código..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:'flex',gap:4}}>
        {[{v:'all',l:'Todos'},{v:'materia_prima',l:'Materia Prima'},{v:'terminado',l:'Terminado'},{v:'venta',l:'Venta'}].map(t=>(
          <button key={t.v} onClick={()=>setTypeFilter(t.v)} style={{padding:'7px 12px',background:typeFilter===t.v?C.pr:C.card,color:typeFilter===t.v?'#fff':C.t2,border:`1.5px solid ${typeFilter===t.v?C.pr:C.bd}`,borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600}}>{t.l}</button>
        ))}
      </div>
      <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(filtered.map(p=>({Código:p.code,Nombre:p.name,Tipo:p.type,Categoría:p.category,Unidad:p.unit,Costo:p.cost,Precio:p.price||'',Stock:p.stock,'Stock Mínimo':p.min_stock,Vencimiento:p.expiry||''})),'productos.csv')}>
        ⬇ CSV
      </button>
    </div>

    <div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>
          <SortTH label="Código" skey="code" sort={sort} onSort={onSort}/>
          <SortTH label="Producto" skey="name" sort={sort} onSort={onSort}/>
          <th style={TH}>Tipo</th><th style={TH}>Categoría</th>
          <SortTH label="Costo" skey="cost" sort={sort} onSort={onSort}/>
          <th style={{...TH,textAlign:'right'}}>Precio</th>
          <th style={{...TH,textAlign:'right'}}>Margen</th>
          <SortTH label="Stock" skey="stock" sort={sort} onSort={onSort}/>
          <th style={TH}>Vence</th>
          <th style={{...TH,textAlign:'center'}}>Acciones</th>
        </tr></thead>
        <tbody>
          {filtered.length===0?<tr><td colSpan={10}><EmptyState icon="🔖" title="Sin productos" sub="Agrega el primer producto"/></td></tr>
          :filtered.map(p=>{
            const margin=p.price&&p.cost?((p.price-p.cost)/p.price*100):null;
            const isLow=p.stock<=p.min_stock&&p.min_stock>0;
            const expiryWarn=p.expiry&&(new Date(p.expiry)-new Date())/(1000*60*60*24)<=7;
            return(<tr key={p.id}>
              <td style={{...TD,color:C.t3,fontFamily:'monospace',fontSize:12}}>{p.code}</td>
              <td style={{...TD,fontWeight:600}}>{p.name}</td>
              <td style={TD}>{TYPE_BADGE(p.type)}</td>
              <td style={TD}><Badge txt={p.category} color={C.t2}/></td>
              <td style={{...TD,textAlign:'right'}}>${f2(p.cost)}</td>
              <td style={{...TD,textAlign:'right',fontWeight:600,color:p.price?C.g:C.t3}}>{p.price?`$${f2(p.price)}`:'—'}</td>
              <td style={{...TD,textAlign:'right'}}>
                {margin!==null?<Badge txt={`${f1(margin)}%`} color={margin>=50?C.g:margin>=20?C.a:C.r}/>:<span style={{color:C.t3}}>—</span>}
              </td>
              <td style={{...TD,textAlign:'right'}}>
                <span style={{fontWeight:700,color:isLow?C.r:C.g}}>{f2(p.stock)} {p.unit}</span>
                {isLow&&<div style={{fontSize:10,color:C.r}}>bajo mínimo</div>}
              </td>
              <td style={TD}>
                {p.expiry?<span style={{fontSize:12,color:expiryWarn?C.r:C.t3,fontWeight:expiryWarn?700:400}}>{p.expiry}{expiryWarn&&' ⚠'}</span>:<span style={{color:C.t3}}>—</span>}
              </td>
              <td style={{...TD,textAlign:'center'}}>
                <div style={{display:'flex',gap:5,justifyContent:'center'}}>
                  <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>openEdit(p)}>Editar</button>
                  <button style={bSm(p.active?C.rL:C.gL,p.active?C.r:C.g,p.active?C.rT:C.gT)} onClick={()=>{dispatch({type:'UPD_PRODUCT',p:{...p,active:!p.active}});showToast(`Producto ${p.active?'desactivado':'activado'}`);}}>
                    {p.active?'Desact.':'Activar'}
                  </button>
                </div>
              </td>
            </tr>);
          })}
        </tbody>
      </table>
    </div>
    {showForm&&editing&&<ProductForm p={editing} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
  </div>);
}

function ProductForm({p,onSave,onClose}){
  const[f,setF]=useState(p);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const margin=f.price&&f.cost?(f.price-f.cost)/f.price*100:null;
  return(<Modal title={p.code?`Editar: ${p.name}`:'Nuevo Producto'} onClose={onClose} footer={<><button style={bSc} onClick={onClose}>Cancelar</button><button style={bPr} onClick={()=>onSave(f)}>Guardar</button></>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div><label style={lbl}>Código</label><input style={inp} value={f.code} onChange={e=>set('code',e.target.value)}/></div>
      <div><label style={lbl}>Tipo</label><select style={sel} value={f.type} onChange={e=>set('type',e.target.value)}>
        <option value="materia_prima">Materia Prima</option><option value="terminado">Producto Final</option><option value="venta">Para Venta</option>
      </select></div>
      <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nombre</label><input style={inp} value={f.name} onChange={e=>set('name',e.target.value)}/></div>
      <div><label style={lbl}>Categoría</label><input style={inp} value={f.category} onChange={e=>set('category',e.target.value)} placeholder="Harinas, Bebidas..."/></div>
      <div><label style={lbl}>Unidad</label><select style={sel} value={f.unit} onChange={e=>set('unit',e.target.value)}>{['kg','g','lt','ml','und','saco','caja','bolsa','rollo'].map(u=><option key={u}>{u}</option>)}</select></div>
      <div><label style={lbl}>Costo Unitario (USD)</label><input type="number" step="0.01" style={inp} value={f.cost} onChange={e=>set('cost',e.target.value)}/></div>
      <div>
        <label style={lbl}>Precio de Venta (USD)</label>
        <input type="number" step="0.01" style={inp} value={f.price||''} onChange={e=>set('price',e.target.value)} placeholder="Solo si se vende"/>
        {margin!==null&&<div style={{fontSize:11,color:margin>=30?C.g:C.r,marginTop:4}}>Margen: {f1(margin)}%</div>}
      </div>
      <div><label style={lbl}>Stock Actual</label><input type="number" step="0.01" style={inp} value={f.stock} onChange={e=>set('stock',e.target.value)}/></div>
      <div><label style={lbl}>Stock Mínimo</label><input type="number" step="0.01" style={inp} value={f.min_stock} onChange={e=>set('min_stock',e.target.value)}/></div>
      <div><label style={lbl}>Fecha de Vencimiento</label><input type="date" style={inp} value={f.expiry||''} onChange={e=>set('expiry',e.target.value)}/></div>
    </div>
  </Modal>);
}

// ── FÓRMULAS ──────────────────────────────────────────────────────────
function Formulas({st,dispatch}){
  const[showForm,setShowForm]=useState(false);const[editing,setEditing]=useState(null);const[viewing,setViewing]=useState(null);const[ToastEl,showToast]=useToast();
  function openEdit(f){setEditing(f?{...f,ingredients:f.ingredients.map(i=>({...i}))}:{id:uid(),name:'',product_id:'',yield_qty:'',yield_unit:'und',cost_est:'',active:true,notes:'',ingredients:[{product_id:'',qty:'',unit:'kg'}]});setShowForm(true);}
  function save(f){const exists=st.formulas.find(x=>x.id===f.id);dispatch(exists?{type:'UPD_FORMULA',p:f}:{type:'ADD_FORMULA',p:f});showToast('Fórmula guardada');setShowForm(false);setEditing(null);}
  return(<div>{ToastEl}
    <PageHeader title="Fórmulas de Producción" sub="Recetas y rendimientos">
      <button style={bPr} onClick={()=>openEdit(null)}>+ Nueva Fórmula</button>
    </PageHeader>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      {st.formulas.length===0&&<div style={card({padding:40,textAlign:'center',gridColumn:'1/-1'})}><EmptyState icon="📋" title="Sin fórmulas" sub="Agrega la primera fórmula"/></div>}
      {st.formulas.map(f=>{
        const prod=st.products.find(p=>p.id===f.product_id);
        return(<div key={f.id} style={card({padding:0,overflow:'hidden',borderTop:`3px solid ${f.active?C.pr:C.t3}`})}>
          <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.bd}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{fontWeight:700,fontSize:15}}>{f.name}</div>
              <Badge txt={f.active?'Activa':'Inactiva'} color={f.active?C.g:C.t3}/>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
              <Badge txt={prod?.name||'Sin producto'} color={C.b}/>
              <Badge txt={`${f.yield_qty} ${f.yield_unit}`} color={C.g}/>
              <Badge txt={`$${f2(f.cost_est)} est.`} color={C.a}/>
            </div>
          </div>
          <div style={{padding:'12px 18px'}}>
            {f.ingredients.slice(0,3).map((ing,i)=>{const ip=st.products.find(p=>p.id===ing.product_id);return(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px dashed ${C.bd}`,fontSize:13}}><span style={{color:C.t2}}>{ip?.name||'—'}</span><span style={{fontWeight:600}}>{ing.qty} {ing.unit}</span></div>);})}
            {f.ingredients.length>3&&<div style={{fontSize:11,color:C.t3,marginTop:4}}>+{f.ingredients.length-3} más...</div>}
          </div>
          <div style={{padding:'12px 18px',borderTop:`1px solid ${C.bd}`,display:'flex',gap:6}}>
            <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>setViewing(f)}>Ver</button>
            <button style={bSm(C.aL,C.a,C.aT)} onClick={()=>openEdit(f)}>Editar</button>
            <button style={bSm(f.active?C.rL:C.gL,f.active?C.r:C.g,f.active?C.rT:C.gT)} onClick={()=>{dispatch({type:'UPD_FORMULA',p:{...f,active:!f.active}});showToast('Estado actualizado');}}>
              {f.active?'Desact.':'Activar'}
            </button>
          </div>
        </div>);
      })}
    </div>
    {showForm&&editing&&<FormulaForm f={editing} products={st.products} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
    {viewing&&<FormulaDetail f={viewing} products={st.products} onClose={()=>setViewing(null)}/>}
  </div>);
}

function FormulaForm({f,products,onSave,onClose}){
  const[form,setForm]=useState(f);
  const set=(k,v)=>setForm(x=>({...x,[k]:v}));
  const setIng=(idx,k,v)=>setForm(x=>({...x,ingredients:x.ingredients.map((i,j)=>j===idx?{...i,[k]:v}:i)}));
  const finishedProds=products.filter(p=>p.type==='terminado'||p.type==='venta');
  const rawProds=products.filter(p=>p.type==='materia_prima');
  // Auto-calc cost
  const calcCost=form.ingredients.reduce((a,ing)=>{const p=products.find(x=>x.id===ing.product_id);return a+(p?.cost||0)*Number(ing.qty||0);},0);
  return(<Modal title={f.name?`Editar: ${f.name}`:'Nueva Fórmula'} onClose={onClose} width={660} footer={<><button style={bSc} onClick={onClose}>Cancelar</button><button style={bPr} onClick={()=>onSave({...form,cost_est:form.cost_est||calcCost})}>Guardar</button></>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
      <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nombre</label><input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ej: Pan Francés"/></div>
      <div><label style={lbl}>Producto que genera</label><select style={sel} value={form.product_id} onChange={e=>set('product_id',e.target.value)}><option value="">-- Seleccionar --</option>{finishedProds.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
        <div><label style={lbl}>Rendimiento</label><input type="number" style={inp} value={form.yield_qty} onChange={e=>set('yield_qty',e.target.value)}/></div>
        <div><label style={lbl}>Unidad</label><input style={inp} value={form.yield_unit} onChange={e=>set('yield_unit',e.target.value)} style={{...inp,width:70}}/></div>
      </div>
      <div><label style={lbl}>Costo estimado (USD)</label><input type="number" step="0.01" style={inp} value={form.cost_est} onChange={e=>set('cost_est',e.target.value)} placeholder={`Auto: $${f2(calcCost)}`}/></div>
      <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notas</label><input style={inp} value={form.notes} onChange={e=>set('notes',e.target.value)}/></div>
    </div>
    <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Ingredientes</div>
    {form.ingredients.map((ing,i)=>(
      <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 36px',gap:8,marginBottom:8,alignItems:'end'}}>
        {i===0&&<><label style={lbl}>Material</label><label style={lbl}>Cantidad</label><label style={lbl}>Unidad</label><div/></>}
        <select style={sel} value={ing.product_id} onChange={e=>setIng(i,'product_id',e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {rawProds.map(p=><option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
        </select>
        <input type="number" step="0.01" style={inp} value={ing.qty} onChange={e=>setIng(i,'qty',e.target.value)}/>
        <input style={inp} value={ing.unit} onChange={e=>setIng(i,'unit',e.target.value)}/>
        <button style={{...bDgr,padding:'7px 10px'}} onClick={()=>setForm(x=>({...x,ingredients:x.ingredients.filter((_,j)=>j!==i)}))}>✕</button>
      </div>
    ))}
    <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>setForm(x=>({...x,ingredients:[...x.ingredients,{product_id:'',qty:'',unit:'kg'}]}))}>+ Agregar ingrediente</button>
    {calcCost>0&&<div style={{marginTop:12,padding:10,background:C.prL,borderRadius:8,fontSize:12,color:C.pr}}>💡 Costo calculado automáticamente: <strong>${f2(calcCost)}</strong> USD ({form.yield_qty>0?`$${(calcCost/form.yield_qty).toFixed(4)}/u`:''} )</div>}
  </Modal>);
}

function FormulaDetail({f,products,onClose}){
  return(<Modal title={f.name} onClose={onClose} footer={<button style={bPr} onClick={onClose}>Cerrar</button>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
      <div style={{...card(),padding:14,textAlign:'center',borderLeft:`3px solid ${C.g}`}}><div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Rendimiento</div><div style={{fontSize:24,fontWeight:800,color:C.g,marginTop:4}}>{f.yield_qty}</div><div style={{fontSize:12,color:C.t3}}>{f.yield_unit}</div></div>
      <div style={{...card(),padding:14,textAlign:'center',borderLeft:`3px solid ${C.a}`}}><div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Costo Est.</div><div style={{fontSize:24,fontWeight:800,color:C.a,marginTop:4}}>${f2(f.cost_est)}</div><div style={{fontSize:12,color:C.t3}}>USD</div></div>
      <div style={{...card(),padding:14,textAlign:'center',borderLeft:`3px solid ${C.b}`}}><div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Costo/u</div><div style={{fontSize:22,fontWeight:800,color:C.b,marginTop:4}}>${(f.cost_est/f.yield_qty).toFixed(4)}</div><div style={{fontSize:12,color:C.t3}}>USD</div></div>
    </div>
    {f.notes&&<div style={{...card({padding:12}),marginBottom:16,background:C.aL,border:`1px solid ${C.aT}`,fontSize:13,color:C.t2}}>📝 {f.notes}</div>}
    <table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr><th style={TH}>Ingrediente</th><th style={{...TH,textAlign:'right'}}>Cantidad</th><th style={{...TH,textAlign:'right'}}>Stock</th><th style={{...TH,textAlign:'right'}}>Costo</th><th style={{...TH,textAlign:'center'}}>Estado</th></tr></thead>
      <tbody>{f.ingredients.map((ing,i)=>{
        const p=products.find(x=>x.id===ing.product_id);const ok=(p?.stock||0)>=ing.qty;const ingCost=(p?.cost||0)*ing.qty;
        return(<tr key={i}><td style={{...TD,fontWeight:600}}>{p?.name||'—'}</td><td style={{...TD,textAlign:'right',fontWeight:700}}>{ing.qty} {ing.unit}</td><td style={{...TD,textAlign:'right',color:ok?C.g:C.r,fontWeight:700}}>{p?`${p.stock} ${p.unit}`:'N/D'}</td><td style={{...TD,textAlign:'right'}}>${f2(ingCost)}</td><td style={{...TD,textAlign:'center'}}><Badge txt={ok?'✓ OK':'✕ Falta'} color={ok?C.g:C.r}/></td></tr>);
      })}</tbody>
    </table>
  </Modal>);
}

// ── PRODUCCIÓN ────────────────────────────────────────────────────────
function Produccion({st,dispatch}){
  const[view,setView]=useState('new');
  const[form,setForm]=useState({formula_id:'',multiplier:'1',actual_yield:'',notes:'',date:todayISO()});
  const[ToastEl,showToast]=useToast();
  const[aiSuggestion,setAiSuggestion]=useState('');
  const[aiLoading,setAiLoading]=useState(false);

  const selF=st.formulas.find(f=>f.id===form.formula_id);
  const multi=Math.max(0.5,Number(form.multiplier)||1);
  const expectedYield=selF?Math.round(selF.yield_qty*multi):0;
  const actualYield=Number(form.actual_yield)||0;
  const mermaQty=Math.max(0,expectedYield-actualYield);
  const mermaPct=expectedYield>0?mermaQty/expectedYield*100:0;
  const calcIngs=selF?selF.ingredients.map(ing=>{const p=st.products.find(x=>x.id===ing.product_id);const needed=ing.qty*multi;return{...ing,p,needed,ok:(p?.stock||0)>=needed};}):[];
  const totalCost=calcIngs.reduce((a,ing)=>a+ing.needed*(ing.p?.cost||0),0);
  const costPerUnit=actualYield>0?totalCost/actualYield:0;
  const allOk=calcIngs.every(i=>i.ok);

  function handleProduce(){
    if(!selF||!actualYield)return;
    dispatch({type:'ADD_PRODUCTION',p:{id:uid(),formula_id:selF.id,formula_name:selF.name,product_id:selF.product_id,multiplier:multi,expected_yield:expectedYield,actual_yield:actualYield,merma_qty:mermaQty,merma_pct:mermaPct,date:form.date,notes:form.notes,ingredients_used:calcIngs.map(i=>({product_id:i.product_id,qty:i.needed})),cost_total:totalCost,cost_per_unit:costPerUnit}});
    showToast('Producción registrada. Inventario actualizado.');
    setForm({formula_id:'',multiplier:'1',actual_yield:'',notes:'',date:todayISO()});
    setView('history');
  }

  async function handleAISuggest(){
    setAiLoading(true);setAiSuggestion('');
    try{
      const recent=st.production_runs.slice(0,20).map(r=>({formula:r.formula_name,date:r.date,yield:r.actual_yield,merma:r.merma_pct.toFixed(1)+'%'}));
      const recentSales=st.sales.slice(0,30).map(s=>({date:s.date,items:s.items.map(i=>({producto:pName(st.products,i.product_id),qty:i.qty}))}));
      const stock=st.products.filter(p=>p.type==='materia_prima').map(p=>({nombre:p.name,stock:p.stock,unidad:p.unit,minimo:p.min_stock}));
      const prompt=`Eres el asistente de una panadería venezolana. Analiza los datos y sugiere qué producir hoy.

HISTORIAL DE PRODUCCIÓN (últimos 20 registros):
${JSON.stringify(recent,null,2)}

VENTAS RECIENTES (últimas 30):
${JSON.stringify(recentSales,null,2)}

STOCK DE MATERIAS PRIMAS:
${JSON.stringify(stock,null,2)}

FÓRMULAS DISPONIBLES:
${st.formulas.filter(f=>f.active).map(f=>`- ${f.name}: rinde ${f.yield_qty} ${f.yield_unit}, costo est. $${f.cost_est}`).join('\n')}

Proporciona: 1) Recomendación de qué producir y en qué cantidad 2) Razón basada en datos 3) Advertencias de stock 4) Tip de optimización. Sé concreto y práctico. Responde en español.`;
      const resp=await callAI(prompt);
      setAiSuggestion(resp);
    }catch(e){setAiSuggestion('Error al conectar con IA. Verifica tu conexión.');}
    setAiLoading(false);
  }

  return(<div>{ToastEl}
    <PageHeader title="Producción" sub="Registra producciones y controla rendimiento y merma">
      <button style={bSm(C.pL,C.p,C.pT)} onClick={handleAISuggest} disabled={aiLoading}>
        {aiLoading?'⏳ Analizando...':'🤖 Sugerencia IA'}
      </button>
      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.bd}`,overflow:'hidden'}}>
        {[['new','Nueva Producción'],['history','Historial'],['mermas','Mermas']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:'8px 16px',background:view===v?C.pr:'#fff',color:view===v?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>
        ))}
      </div>
    </PageHeader>

    {/* AI Suggestion Panel */}
    {aiSuggestion&&(<div style={{...card({padding:20}),marginBottom:20,background:C.pL,border:`1.5px solid ${C.pT}`,position:'relative'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:14,color:C.p}}>🤖 Sugerencia de Producción IA</div>
        <button style={{background:'none',border:'none',cursor:'pointer',color:C.t3,fontSize:16}} onClick={()=>setAiSuggestion('')}>×</button>
      </div>
      <div style={{fontSize:13,color:C.t1,whiteSpace:'pre-wrap',lineHeight:1.7}}>{aiSuggestion}</div>
    </div>)}

    {view==='new'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 400px',gap:20,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={card({padding:20})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Configuración de la Producción</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Fórmula</label>
              <select style={{...sel,fontSize:14}} value={form.formula_id} onChange={e=>setForm(x=>({...x,formula_id:e.target.value}))}>
                <option value="">-- Seleccionar fórmula --</option>
                {st.formulas.filter(f=>f.active).map(f=><option key={f.id} value={f.id}>{f.name} · Rend: {f.yield_qty} {f.yield_unit}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Multiplicador</label><input type="number" min="0.5" step="0.5" style={inp} value={form.multiplier} onChange={e=>setForm(x=>({...x,multiplier:e.target.value}))}/></div>
            <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={form.date} onChange={e=>setForm(x=>({...x,date:e.target.value}))}/></div>
          </div>
        </div>

        {selF&&(<div style={card({padding:20})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Insumos requeridos</div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={TH}>Material</th><th style={{...TH,textAlign:'right'}}>Necesario</th><th style={{...TH,textAlign:'right'}}>Disponible</th><th style={{...TH,textAlign:'center'}}>Estado</th></tr></thead>
            <tbody>{calcIngs.map((ing,i)=>(
              <tr key={i}><td style={{...TD,fontWeight:600}}>{ing.p?.name||'N/D'}</td><td style={{...TD,textAlign:'right',fontWeight:700}}>{f2(ing.needed)} {ing.unit}</td><td style={{...TD,textAlign:'right',color:ing.ok?C.g:C.r,fontWeight:700}}>{ing.p?`${f2(ing.p.stock)} ${ing.p.unit}`:'—'}</td><td style={{...TD,textAlign:'center'}}><Badge txt={ing.ok?'✓':'✕ Falta'} color={ing.ok?C.g:C.r}/></td></tr>
            ))}</tbody>
          </table>
          {!allOk&&<div style={{background:C.rL,border:`1px solid ${C.rT}`,borderRadius:8,padding:12,marginTop:12,fontSize:13,color:C.r,fontWeight:600}}>⚠️ Ingredientes con stock insuficiente.</div>}
        </div>)}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {selF&&(<div style={{...card({padding:20}),background:`linear-gradient(135deg,${C.pr}12,${C.b}10)`}}>
          <div style={{fontWeight:700,fontSize:13,color:C.t3,textTransform:'uppercase',marginBottom:12}}>Rendimiento Esperado</div>
          <div style={{fontSize:52,fontWeight:900,color:C.pr,lineHeight:1}}>{expectedYield}</div>
          <div style={{fontSize:16,color:C.t2,marginBottom:8}}>{selF.yield_unit}</div>
          <div style={{borderTop:`1px solid ${C.bd}`,marginTop:12,paddingTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span style={{color:C.t3}}>Costo total estimado</span><span style={{fontWeight:700}}>${fN(totalCost)}</span></div>
            {Object.values(st.currencies).map(cur=>(<div key={cur.code} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:2}}><span style={{color:C.t3}}>{cur.name}</span><span style={{color:C.t2}}>{cur.symbol}{fN(totalCost*cur.rate)}</span></div>))}
          </div>
        </div>)}

        <div style={card({padding:20})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Resultado Real</div>
          <div style={{marginBottom:12}}><label style={lbl}>Unidades obtenidas</label><input type="number" style={{...inp,fontSize:18,fontWeight:700,padding:'12px'}} value={form.actual_yield} onChange={e=>setForm(x=>({...x,actual_yield:e.target.value}))} placeholder={expectedYield?`Esperado: ${expectedYield}`:'Ingresa la cantidad'}/></div>
          {expectedYield>0&&actualYield>0&&(<div style={{...card({padding:14}),marginBottom:12,background:mermaPct>10?C.rL:mermaPct>5?C.aL:C.gL,border:`1px solid ${mermaPct>10?C.rT:mermaPct>5?C.aT:C.gT}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
              <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Merma</div><div style={{fontSize:22,fontWeight:900,color:mermaPct>10?C.r:mermaPct>5?C.a:C.g}}>{mermaQty}</div></div>
              <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>% Merma</div><div style={{fontSize:22,fontWeight:900,color:mermaPct>10?C.r:mermaPct>5?C.a:C.g}}>{f1(mermaPct)}%</div></div>
              <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Costo/u</div><div style={{fontSize:22,fontWeight:900,color:C.b}}>${costPerUnit.toFixed(4)}</div></div>
            </div>
          </div>)}
          <div style={{marginBottom:14}}><label style={lbl}>Observaciones</label><input style={inp} value={form.notes} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} placeholder="Temperatura, incidencias..."/></div>
          <button onClick={handleProduce} disabled={!selF||!actualYield} style={{...bPr,width:'100%',justifyContent:'center',padding:'12px',fontSize:14,opacity:(!selF||!actualYield)?0.5:1}}>✓ Registrar Producción</button>
          {!allOk&&selF&&<div style={{fontSize:11,color:C.r,textAlign:'center',marginTop:6}}>⚠️ Hay ingredientes insuficientes</div>}
        </div>
      </div>
    </div>)}

    {view==='history'&&(<div>
      {st.production_runs.length>0&&(()=>{const t=st.production_runs.reduce((a,r)=>({exp:a.exp+r.expected_yield,act:a.act+r.actual_yield,merma:a.merma+r.merma_qty,cost:a.cost+(r.cost_total||0)}),{exp:0,act:0,merma:0,cost:0});return(<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        <KPICard label="Total Producido" value={t.act.toLocaleString()} sub="unidades reales" icon="✓" color={C.g}/>
        <KPICard label="Merma Total" value={t.merma.toLocaleString()} sub={`${f1(t.exp>0?t.merma/t.exp*100:0)}%`} icon="📉" color={C.r}/>
        <KPICard label="Costo Total" value={`$${fN(t.cost)}`} sub="materias primas" icon="💵" color={C.a}/>
        <KPICard label="Producciones" value={st.production_runs.length} sub="registros" icon="🏭" color={C.b}/>
      </div>)})()}
      <div style={{marginBottom:12,display:'flex',justifyContent:'flex-end'}}>
        <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(st.production_runs.map(r=>({Fecha:r.date,Fórmula:r.formula_name,Multiplicador:r.multiplier,Esperado:r.expected_yield,Obtenido:r.actual_yield,Merma:r.merma_qty,'%Merma':f1(r.merma_pct),CostoTotal:f2(r.cost_total||0),CostoPorU:f2(r.cost_per_unit||0),Notas:r.notes||''})),'produccion.csv')}>⬇ CSV</button>
      </div>
      <div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Fecha</th><th style={TH}>Fórmula</th><th style={{...TH,textAlign:'center'}}>Mult.</th><th style={{...TH,textAlign:'center'}}>Esperado</th><th style={{...TH,textAlign:'center'}}>Obtenido</th><th style={{...TH,textAlign:'center'}}>Merma</th><th style={{...TH,textAlign:'center'}}>%</th><th style={{...TH,textAlign:'right'}}>Costo</th></tr></thead>
          <tbody>{st.production_runs.length===0?<tr><td colSpan={8}><EmptyState icon="🏭" title="Sin producciones" sub="Registra tu primera producción"/></td></tr>
          :st.production_runs.map(r=>(<tr key={r.id}><td style={TD}>{r.date}</td><td style={{...TD,fontWeight:600}}>{r.formula_name}</td><td style={{...TD,textAlign:'center'}}>×{r.multiplier}</td><td style={{...TD,textAlign:'center',color:C.t3}}>{r.expected_yield}</td><td style={{...TD,textAlign:'center',fontWeight:700,color:C.g}}>{r.actual_yield}</td><td style={{...TD,textAlign:'center',color:r.merma_qty>0?C.r:C.g}}>{r.merma_qty}</td><td style={{...TD,textAlign:'center'}}><Badge txt={`${f1(r.merma_pct)}%`} color={r.merma_pct>10?C.r:r.merma_pct>5?C.a:C.g}/></td><td style={{...TD,textAlign:'right'}}>${fN(r.cost_total||0)}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>)}

    {view==='mermas'&&(<div>
      <div style={{marginBottom:16,fontSize:13,color:C.t2}}>Análisis de merma por fórmula. La merma es la diferencia entre el rendimiento esperado y el obtenido.</div>
      {st.formulas.map(f=>{
        const runs=st.production_runs.filter(r=>r.formula_id===f.id);
        if(!runs.length)return null;
        const avgMerma=runs.reduce((a,r)=>a+r.merma_pct,0)/runs.length;
        const totalMerma=runs.reduce((a,r)=>a+r.merma_qty,0);
        return(<div key={f.id} style={{...card({padding:20}),marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <div><div style={{fontWeight:700,fontSize:15}}>{f.name}</div><div style={{fontSize:12,color:C.t3}}>{runs.length} producciones registradas</div></div>
            <Badge txt={`Promedio ${f1(avgMerma)}%`} color={avgMerma>10?C.r:avgMerma>5?C.a:C.g}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            <div style={{textAlign:'center',padding:12,background:C.bd+'44',borderRadius:8}}><div style={{fontSize:11,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Merma Total</div><div style={{fontSize:22,fontWeight:800,color:C.r}}>{totalMerma}</div><div style={{fontSize:12,color:C.t3}}>unidades</div></div>
            <div style={{textAlign:'center',padding:12,background:C.bd+'44',borderRadius:8}}><div style={{fontSize:11,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Promedio %</div><div style={{fontSize:22,fontWeight:800,color:avgMerma>10?C.r:avgMerma>5?C.a:C.g}}>{f1(avgMerma)}%</div><div style={{fontSize:12,color:C.t3}}>por producción</div></div>
            <div style={{textAlign:'center',padding:12,background:C.bd+'44',borderRadius:8}}><div style={{fontSize:11,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Mejor Merma</div><div style={{fontSize:22,fontWeight:800,color:C.g}}>{f1(Math.min(...runs.map(r=>r.merma_pct)))}%</div><div style={{fontSize:12,color:C.t3}}>menor registrada</div></div>
          </div>
        </div>);
      })}
      {st.production_runs.length===0&&<EmptyState icon="📉" title="Sin datos de merma" sub="Registra producciones para ver el análisis"/>}
    </div>)}
  </div>);
}

// ── VENTAS ────────────────────────────────────────────────────────────
function Ventas({st,dispatch}){
  const[view,setView]=useState('pos');
  const[cart,setCart]=useState([]);
  const[payments,setPayments]=useState([{key:uid(),method_id:'pos',amount:''}]);
  const[client,setClient]=useState('');
  const[clientId,setClientId]=useState('');
  const[clientType,setClientType]=useState('regular'); // 'regular'|'employee'
  const[employeeId,setEmployeeId]=useState('');
  const[deductSalary,setDeductSalary]=useState(false);
  const[saleDate,setSaleDate]=useState(todayISO());
  const[search,setSearch]=useState('');
  const[catFilter,setCatFilter]=useState('all');
  const[ToastEl,showToast]=useToast();
  const{currencies:cur,payment_methods:pms}=st;

  const sellable=st.products.filter(p=>p.active&&(p.type==='terminado'||p.type==='venta'));
  const cats=['all',...new Set(sellable.map(p=>p.category))];
  const filtered=sellable.filter(p=>(catFilter==='all'||p.category===catFilter)&&(!search||p.name.toLowerCase().includes(search.toLowerCase())));
  const totalUSD=cart.reduce((a,i)=>a+i.price*i.qty,0);

  // Currency helpers: cash_usd is entered in $, everything else in Bs.
  const vesRate=Object.values(cur).find(c=>c.code==='VES')?.rate||1;
  const isUSDMethod=id=>id==='cash_usd';
  const toUSD=(pay)=>isUSDMethod(pay.method_id)?Number(pay.amount||0):Number(pay.amount||0)/vesRate;

  // Payment totals (all internal math in USD)
  const totalPaid=payments.reduce((a,p)=>a+toUSD(p),0);
  const remaining=totalUSD-totalPaid;
  const remainingBs=remaining*vesRate;
  const overpaid=totalPaid>totalUSD+0.001;
  const fullyPaid=totalPaid>=totalUSD-0.001&&totalUSD>0;
  const isDeductMode=clientType==='employee'&&deductSalary&&employeeId;
  const canConfirm=cart.length>0&&(isDeductMode||fullyPaid);

  function addPaymentLine(){setPayments(prev=>[...prev,{key:uid(),method_id:pms.find(pm=>!prev.some(p=>p.method_id===pm.id))?.id||pms[0]?.id,amount:''}]);}
  function removePaymentLine(key){if(payments.length>1)setPayments(prev=>prev.filter(p=>p.key!==key));}
  function setPaymentField(key,field,val){setPayments(prev=>prev.map(p=>p.key===key?{...p,[field]:val}:p));}

  function addToCart(p){setCart(prev=>{const ex=prev.find(i=>i.pid===p.id);return ex?prev.map(i=>i.pid===p.id?{...i,qty:i.qty+1}:i):[...prev,{pid:p.id,product_id:p.id,name:p.name,price:p.price||0,qty:1,category:p.category}];});}
  function setQty(pid,qty){if(qty<=0)setCart(prev=>prev.filter(i=>i.pid!==pid));else setCart(prev=>prev.map(i=>i.pid===pid?{...i,qty}:i));}
  function setPrice(pid,price){setCart(prev=>prev.map(i=>i.pid===pid?{...i,price:Number(price)}:i));}

  function confirmSale(){
    if(!cart.length)return;
    // Employee deduction mode: skip payment validation
    if(clientType==='employee'&&deductSalary){
      if(!employeeId){showToast('Selecciona un empleado');return;}
      const emp=st.employees.find(e=>e.id===employeeId);
      const saleId=uid();
      dispatch({type:'ADD_SALE',p:{
        id:saleId,date:saleDate,
        client:emp?.name||'Empleado',client_id:null,
        payment_method:'employee_deduct',payment_method_name:'Descuento Nómina',
        payments:[{method_id:'employee_deduct',method_name:'Descuento Nómina',amount_usd:totalUSD}],
        items:cart.map(i=>({product_id:i.product_id,qty:i.qty,price_unit:i.price,total_usd:i.price*i.qty})),
        total_usd:totalUSD,change_usd:0,
      }});
      dispatch({type:'EMPLOYEE_DEDUCTION',employee_id:employeeId,deduction:{
        id:uid(),sale_id:saleId,date:saleDate,
        amount_usd:totalUSD,
        items_desc:cart.map(i=>`${i.qty}x ${i.name}`).join(', '),
      }});
      showToast(`Descuento de $${fN(totalUSD)} registrado para ${emp?.name}`);
    } else {
      if(!fullyPaid)return;
      const selClient=clientId?st.clients.find(c=>c.id===clientId):null;
      const paymentLines=payments.filter(p=>Number(p.amount||0)>0).map(p=>{
        const pm=pms.find(x=>x.id===p.method_id);
        const usd=isUSDMethod(p.method_id)?Number(p.amount||0):Number(p.amount||0)/vesRate;
        return{method_id:p.method_id,method_name:pm?.name||p.method_id,
          amount_usd:usd,
          amount_native:Number(p.amount||0),
          currency:isUSDMethod(p.method_id)?'USD':'VES',
          rate_used:vesRate,
          color:pm?.color||C.t3};
      });
      const isMixed=paymentLines.length>1;
      const primaryPM=paymentLines[0]||{method_id:'pos',method_name:'POS'};
      const changeUSDEquiv=Math.max(0,totalPaid-totalUSD);
      dispatch({type:'ADD_SALE',p:{
        id:uid(),date:saleDate,
        client:selClient?.name||client||'Mostrador',client_id:clientId||null,
        payment_method:isMixed?'mixto':primaryPM.method_id,
        payment_method_name:isMixed?`Mixto (${paymentLines.length} métodos)`:primaryPM.method_name,
        payments:paymentLines,
        items:cart.map(i=>({product_id:i.product_id,qty:i.qty,price_unit:i.price,total_usd:i.price*i.qty})),
        total_usd:totalUSD,
        // Vuelto SIEMPRE en bolívares: los USD son billetes físicos completos
        change_bs:changeUSDEquiv*vesRate,
        change_usd_equiv:changeUSDEquiv,
        rate_used:vesRate,
      }});
      showToast(`Venta registrada. $${fN(totalUSD)}${changeUSDEquiv>0?` · Vuelto en Bs: Bs.${fN(changeUSDEquiv*vesRate)}`:''}`);
    }
    setCart([]);setClient('');setClientId('');setEmployeeId('');setDeductSalary(false);
    setPayments([{key:uid(),method_id:'pos',amount:''}]);
  }

  return(<div>{ToastEl}
    <PageHeader title="Ventas" sub="Punto de venta y registro de transacciones">
      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.bd}`,overflow:'hidden'}}>
        {[['pos','Punto de Venta'],['history','Historial']].map(([v,l])=>(<button key={v} onClick={()=>setView(v)} style={{padding:'8px 16px',background:view===v?C.pr:'#fff',color:view===v?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>))}
      </div>
    </PageHeader>

    {view==='pos'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 370px',gap:16,alignItems:'start'}}>
      <div>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <input style={{...inp,flex:1,minWidth:180}} placeholder="🔍 Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {cats.map(c=>(<button key={c} onClick={()=>setCatFilter(c)} style={{padding:'7px 12px',background:catFilter===c?C.pr:C.card,color:catFilter===c?'#fff':C.t2,border:`1.5px solid ${catFilter===c?C.pr:C.bd}`,borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600}}>{c==='all'?'Todos':c}</button>))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
          {filtered.map(p=>{
            const inCart=cart.find(i=>i.pid===p.id);
            return(<button key={p.id} onClick={()=>addToCart(p)} style={{...card({padding:'14px 12px'}),border:`2px solid ${inCart?C.pr:C.bd}`,cursor:'pointer',textAlign:'left',background:inCart?C.prL:'#fff'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{p.name}</div>
              <div style={{fontWeight:800,fontSize:18,color:C.pr}}>${f2(p.price||0)}</div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{Object.values(cur).find(c=>c.code==='VES')?.symbol}{fN((p.price||0)*Object.values(cur).find(c=>c.code==='VES')?.rate)}</div>
              <div style={{marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <Badge txt={p.category} color={C.t3}/>
                {inCart&&<Badge txt={`×${inCart.qty}`} color={C.pr}/>}
              </div>
            </button>);
          })}
          {filtered.length===0&&<div style={{gridColumn:'1/-1'}}><EmptyState icon="🛒" title="Sin productos" sub="Ajusta los filtros"/></div>}
        </div>
      </div>

      <div style={{...card(),padding:0,overflow:'hidden',position:'sticky',top:10}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.bd}`,background:'#FAFBFD',fontWeight:700,fontSize:15}}>🧾 Detalle de Venta</div>
        <div style={{padding:'14px 18px'}}>
          <div style={{marginBottom:10}}>
            {/* Referencia cambio interno */}
            {cur.ves_int&&(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:C.tlL,border:`1px solid ${C.tlT}`,borderRadius:8,padding:'6px 12px',marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:700,color:C.tl}}>📌 Cambio interno (referencia)</span>
              <span style={{fontSize:13,fontWeight:800,color:C.tl}}>Bs.{fN(cur.ves_int.rate)}/$</span>
            </div>)}
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <div style={{flex:1}}><label style={lbl}>Fecha</label><input type="date" style={inp} value={saleDate} onChange={e=>setSaleDate(e.target.value)}/></div>
            </div>
            <label style={lbl}>Tipo de Cliente</label>
            <div style={{display:'flex',gap:4,marginBottom:7}}>
              {[['regular','👤 Cliente'],['employee','👷 Empleado']].map(([v,l])=>(<button key={v}
                style={{padding:'5px 14px',background:clientType===v?C.pr:'#fff',color:clientType===v?'#fff':C.t2,
                  border:`1.5px solid ${clientType===v?C.pr:C.bd}`,borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600}}
                onClick={()=>{setClientType(v);setClientId('');setEmployeeId('');setDeductSalary(false);setClient('');}}>
                {l}
              </button>))}
            </div>
            {clientType==='regular'
              ?<>
                {st.clients&&st.clients.length>0
                  ?<select style={sel} value={clientId} onChange={e=>{setClientId(e.target.value);setClient(st.clients.find(c=>c.id===e.target.value)?.name||'');}}>
                      <option value="">Mostrador / Manual</option>
                      {st.clients.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  :<input style={inp} value={client} onChange={e=>setClient(e.target.value)} placeholder="Mostrador"/>}
                {!clientId&&st.clients?.length>0&&<input style={{...inp,marginTop:6}} value={client} onChange={e=>setClient(e.target.value)} placeholder="O nombre manual..."/>}
              </>
              :<>
                <select style={sel} value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>
                  <option value="">Seleccionar empleado...</option>
                  {(st.employees||[]).filter(e=>e.status==='activo'||e.status==='active').map(e=>(<option key={e.id} value={e.id}>{e.name} — {e.position||'Sin cargo'}</option>))}
                </select>
                {employeeId&&(<label style={{display:'flex',alignItems:'center',gap:8,marginTop:7,cursor:'pointer',
                    padding:'8px 12px',background:deductSalary?C.oL:'#fff',border:`1.5px solid ${deductSalary?C.o:C.bd}`,
                    borderRadius:8,fontSize:12,fontWeight:600,color:deductSalary?C.o:C.t2}}>
                  <input type="checkbox" checked={deductSalary} onChange={e=>setDeductSalary(e.target.checked)} style={{width:14,height:14}}/>
                  💼 Descontar del sueldo (sin cobro en caja)
                </label>)}
              </>}
          </div>

          {cart.length===0?<div style={{textAlign:'center',padding:'24px 0',color:C.t3,fontSize:13}}>Selecciona productos del catálogo</div>
          :(<>
            <div style={{maxHeight:260,overflowY:'auto',marginBottom:12}}>
              {cart.map(item=>(<div key={item.pid} style={{padding:'8px 0',borderBottom:`1px solid ${C.bd}`}}>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {/* Name + price */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                    {st.current_role==='admin'
                      ?<div style={{display:'flex',alignItems:'center',gap:4}}>
                          <span style={{fontSize:10,color:C.t3}}>$/u</span>
                          <input type="number" step="0.01" min="0"
                            value={item.price}
                            onChange={e=>setPrice(item.pid,e.target.value)}
                            style={{...inp,padding:'2px 6px',width:72,fontSize:12}}/>
                        </div>
                      :<div style={{fontSize:12,color:C.t3}}>
                          ${f2(item.price)}/u
                          <span style={{fontSize:10,marginLeft:4,color:C.a}}>🔒</span>
                        </div>}
                  </div>
                  {/* Qty: editable input + quick +/− */}
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    <button style={{...bSm(C.bd,C.t2,C.bd),padding:'3px 9px',fontSize:14,lineHeight:1}} onClick={()=>setQty(item.pid,item.qty-1)}>−</button>
                    <input type="number" min="1" step="1"
                      value={item.qty}
                      onChange={e=>{const v=parseInt(e.target.value)||0;setQty(item.pid,v);}}
                      style={{...inp,width:52,textAlign:'center',fontWeight:800,fontSize:14,padding:'3px 4px'}}/>
                    <button style={{...bSm(C.prL,C.pr,C.prT),padding:'3px 9px',fontSize:14,lineHeight:1}} onClick={()=>setQty(item.pid,item.qty+1)}>+</button>
                  </div>
                  {/* Subtotal + delete */}
                  <div style={{minWidth:58,textAlign:'right',fontWeight:700,fontSize:13,color:C.g}}>${fN(item.price*item.qty)}</div>
                  <button style={{...bDgr,padding:'3px 7px',fontSize:12}} onClick={()=>setQty(item.pid,0)}>✕</button>
                </div>
              </div>))}
            </div>
            {/* Monto Total */}
            <div style={{...card({padding:14}),background:C.prL,marginBottom:10}}>
              <div style={{fontSize:15,fontWeight:900,color:C.pr,textTransform:'uppercase',marginBottom:8,letterSpacing:'0.04em'}}>Monto Total</div>
              {Object.values(cur).filter(c=>c.code!=='VES_INT').map(c=>(<div key={c.code} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4}}>
                <span style={{color:C.t2,fontSize:14,fontWeight:600}}>{c.name}</span>
                <span style={{fontWeight:900,fontSize:c.code==='USD'||c.code==='VES'?19:15,color:c.code==='USD'?C.g:c.code==='VES'?C.a:C.t1}}>{c.symbol}{fN(totalUSD*c.rate)}</span>
              </div>))}
            </div>

            {/* ── PAGOS MIXTOS (ocultos en modo descuento nómina) ── */}
            {isDeductMode
            ?<div style={{marginBottom:10,padding:'12px 14px',background:C.oL,border:`1.5px solid ${C.o}66`,borderRadius:10}}>
              <div style={{fontSize:12,fontWeight:700,color:C.o,marginBottom:4}}>💼 Descuento de Nómina</div>
              <div style={{fontSize:12,color:C.t2}}>
                Se descontará <b>${fN(totalUSD)}</b> del sueldo de <b>{(st.employees||[]).find(e=>e.id===employeeId)?.name}</b>. No entra dinero a caja.
              </div>
            </div>
            :<div style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <label style={{...lbl,marginBottom:0,fontSize:14,fontWeight:700}}>Forma(s) de Pago</label>
                <button style={{...bSm(C.prL,C.pr,C.prT),fontSize:13}} onClick={addPaymentLine}>+ Agregar método</button>
              </div>

              {payments.map((pay)=>{
                const pm=pms.find(x=>x.id===pay.method_id)||pms[0];
                const isUSD=isUSDMethod(pay.method_id);
                const nativeAmt=Number(pay.amount||0);
                const usdEquiv=isUSD?nativeAmt:nativeAmt/vesRate;
                return(<div key={pay.key} style={{marginBottom:10}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 130px 32px',gap:6,alignItems:'center'}}>
                    <select value={pay.method_id}
                      onChange={e=>{setPaymentField(pay.key,'method_id',e.target.value);setPaymentField(pay.key,'amount','');}}
                      style={{...sel,fontSize:14,fontWeight:600,padding:'9px 10px',borderColor:pm.color,borderWidth:'1.5px'}}>
                      {pms.map(p=><option key={p.id} value={p.id}>{p.name} ({isUSDMethod(p.id)?'$':'Bs'})</option>)}
                    </select>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:12,color:C.t3,pointerEvents:'none',fontWeight:700}}>
                        {isUSD?'$':'Bs.'}
                      </span>
                      <input type="number" step="1" min="0"
                        value={pay.amount}
                        onChange={e=>{
                          // USD: solo enteros (billetes). Bs: solo enteros también (efectivo).
                          const clean=e.target.value.replace(/[^\d]/g,'');
                          setPaymentField(pay.key,'amount',clean);
                        }}
                        style={{...inp,paddingLeft:isUSD?22:32,fontSize:16,fontWeight:800,padding:'9px 10px',
                          borderColor:nativeAmt>0?pm.color:C.bd,borderWidth:'1.5px'}}
                        placeholder={remaining>0.009&&!pay.amount?(isUSD?String(Math.ceil(remaining)):String(Math.ceil(remainingBs))):'0'}/>
                    </div>
                    {payments.length>1
                      ?<button style={{...bDgr,padding:'6px 9px',fontSize:14}} onClick={()=>removePaymentLine(pay.key)}>✕</button>
                      :<div/>}
                  </div>
                  {/* Billetes USD: denominaciones reales de Venezuela */}
                  {isUSD&&(<div style={{display:'flex',gap:4,marginTop:5,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:10,color:C.t3,fontWeight:700}}>Billetes:</span>
                    {[1,5,10,20,50,100].map(den=>(<button key={den}
                      style={{padding:'3px 9px',background:C.gL,color:C.g,border:`1.5px solid ${C.gT}`,borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:800}}
                      onClick={()=>setPaymentField(pay.key,'amount',String((Number(pay.amount)||0)+den))}>
                      +${den}
                    </button>))}
                    {nativeAmt>0&&<button style={{padding:'3px 8px',background:'#fff',color:C.t3,border:`1px solid ${C.bd}`,borderRadius:6,cursor:'pointer',fontSize:11}}
                      onClick={()=>setPaymentField(pay.key,'amount','')}>Borrar</button>}
                  </div>)}
                  {nativeAmt>0&&<div style={{fontSize:12,color:pm.color,marginTop:3,paddingLeft:2,fontWeight:700}}>
                    {isUSD
                      ?`${pm.name}: $${fN(nativeAmt)} ≈ Bs.${fN(nativeAmt*vesRate)}`
                      :`${pm.name}: Bs.${fN(nativeAmt)} ≈ $${fN(usdEquiv)}`}
                  </div>}
                </div>);
              })}

              {/* Botones rápidos para completar el restante */}
              {remaining>0.009&&cart.length>0&&(<div style={{marginTop:8,padding:'10px 12px',background:C.rL,border:`1.5px solid ${C.rT}`,borderRadius:8}}>
                <div style={{fontSize:14,color:C.r,fontWeight:800,marginBottom:8}}>
                  Faltan ${fN(remaining)} <span style={{fontSize:13}}>(Bs.{fN(remainingBs)})</span> · Completar con:
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {pms.map(pm=>{
                    const isUSD=isUSDMethod(pm.id);
                    // USD: redondear ARRIBA al billete entero (el exceso se devuelve en Bs)
                    const fillAmt=isUSD?String(Math.ceil(remaining)):String(Math.ceil(remainingBs));
                    const existing=payments.find(p=>p.method_id===pm.id);
                    return(<button key={pm.id}
                      style={{padding:'6px 12px',background:pm.color+'22',color:pm.color,border:`1.5px solid ${pm.color}44`,borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700}}
                      onClick={()=>{
                        if(existing){
                          const newAmt=isUSD?String(Math.ceil(Number(existing.amount||0)+remaining)):String(Math.ceil(Number(existing.amount||0)+remainingBs));
                          setPaymentField(existing.key,'amount',newAmt);
                        } else setPayments(prev=>[...prev,{key:uid(),method_id:pm.id,amount:fillAmt}]);
                      }}>
                      {pm.name.split(' ')[0]} +{isUSD?`$${Math.ceil(remaining)}`:`Bs.${fN(remainingBs)}`}
                    </button>);
                  })}
                </div>
              </div>)}

              {/* Resumen de pagos */}
              {(totalPaid>0||cart.length>0)&&(<div style={{marginTop:10,borderTop:`1.5px solid ${C.bd}`,paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:15}}>
                  <span style={{color:C.t2,fontWeight:600}}>Total cobrado:</span>
                  <span style={{fontWeight:900,color:C.b,fontSize:18}}>${fN(totalPaid)} <span style={{fontSize:12,color:C.t3,fontWeight:600}}>(Bs.{fN(totalPaid*vesRate)})</span></span>
                </div>
                {overpaid&&<div style={{background:C.aL,border:`1.5px solid ${C.aT}`,borderRadius:8,padding:'8px 12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:15,fontWeight:800}}>
                    <span style={{color:C.a}}>💴 Vuelto en BOLÍVARES:</span>
                    <span style={{color:C.a,fontSize:18}}>Bs.{fN((totalPaid-totalUSD)*vesRate)}</span>
                  </div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>Equivale a ${fN(totalPaid-totalUSD)} — los dólares no se fraccionan, el vuelto sale de la caja en Bs.</div>
                </div>}
                {fullyPaid&&!overpaid&&<div style={{fontSize:14,color:C.g,fontWeight:800}}>✓ Pago completo</div>}
              </div>)}
            </div>}
          </>)}

          <div style={{background:`linear-gradient(135deg,${C.pr},${C.prD})`,borderRadius:10,padding:'12px 16px',textAlign:'center',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase'}}>Total a Cobrar</div>
            <div style={{fontSize:30,fontWeight:900,color:'#fff',lineHeight:1.1}}>${fN(totalUSD)}</div>
            <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.85)'}}>Bs.{fN(totalUSD*vesRate)}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:2}}>
              {cart.reduce((a,i)=>a+i.qty,0)} art.
              {isDeductMode?' · Descuento nómina':payments.length>1?` · ${payments.length} métodos`:''}
              {overpaid?` · Vuelto Bs.${fN((totalPaid-totalUSD)*vesRate)}`:''}
            </div>
          </div>
          <button onClick={confirmSale} disabled={!canConfirm}
            style={{...bPr,width:'100%',justifyContent:'center',padding:'13px',fontSize:15,fontWeight:800,
              opacity:!canConfirm?0.5:1,
              background:canConfirm?`linear-gradient(135deg,${C.g},#15803d)`:C.pr}}>
            {!cart.length?'✓ Registrar Venta'
              :isDeductMode?`💼 Descontar $${fN(totalUSD)} del sueldo`
              :!fullyPaid?`⚠ Faltan $${fN(remaining)} (Bs.${fN(remainingBs)})`
              :'✓ Registrar Venta'}
          </button>
        </div>
      </div>
    </div>)}

    {view==='history'&&<SalesHistory st={st}/>}
  </div>);
}

function SalesHistory({st}){
  const[dateFilter,setDateFilter]=useState(todayISO());
  const[search,setSearch]=useState('');
  const salesAll=dateFilter?st.sales.filter(s=>s.date===dateFilter):st.sales;
  const salesFiltered=search?salesAll.filter(s=>s.client?.toLowerCase().includes(search.toLowerCase())):salesAll;
  const{paged,page,setPage,totalPages}=usePagination(salesFiltered,20);
  const totalDay=salesFiltered.reduce((a,s)=>a+s.total_usd,0);
  const byPM={};st.payment_methods.forEach(pm=>{byPM[pm.id]=salesFiltered.filter(s=>s.payment_method===pm.id).reduce((a,s)=>a+s.total_usd,0);});

  return(<div>
    <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'flex-end',flexWrap:'wrap'}}>
      <div><label style={lbl}>Filtrar por fecha</label><input type="date" style={{...inp,width:'auto'}} value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></div>
      <div><label style={lbl}>Buscar cliente</label><input style={{...inp,width:180}} placeholder="Nombre..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <button style={bSm(C.bd,C.t2,C.bd)} onClick={()=>{setDateFilter('');setSearch('');}}>Ver todas</button>
      {(dateFilter||search)&&<div style={{fontSize:13,color:C.t3}}>{salesFiltered.length} ventas · <strong style={{color:C.g}}>${fN(totalDay)}</strong></div>}
      <button style={{...bSm(C.gL,C.g,C.gT),marginLeft:'auto'}} onClick={()=>exportCSV(salesFiltered.map(s=>({Fecha:s.date,Cliente:s.client||'',Método:s.payment_method_name||s.payment_method,Items:s.items.reduce((a,i)=>a+i.qty,0),TotalUSD:f2(s.total_usd)})),'ventas.csv')}>⬇ CSV</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
      {st.payment_methods.map(pm=>(<div key={pm.id} style={{...card({padding:'12px 16px'}),borderLeft:`3px solid ${pm.color}`}}><div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>{pm.name}</div><div style={{fontSize:18,fontWeight:800,color:pm.color}}>${fN(byPM[pm.id]||0)}</div></div>))}
    </div>
    <div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={TH}>Fecha</th><th style={TH}>Cliente</th><th style={{...TH,textAlign:'center'}}>Ítems</th><th style={TH}>Método</th><th style={{...TH,textAlign:'right'}}>Total USD</th><th style={{...TH,textAlign:'right'}}>En Bs.</th></tr></thead>
        <tbody>
          {paged.length===0?<tr><td colSpan={6}><EmptyState icon="🛒" title="Sin ventas" sub="Registra ventas desde el punto de venta"/></td></tr>
          :paged.map(s=>{
            const pm=st.payment_methods.find(p=>p.id===s.payment_method);
            const ves=Object.values(st.currencies).find(c=>c.code==='VES');
            const hasMulti=s.payments&&s.payments.length>1;
            return(<tr key={s.id}>
              <td style={TD}>{s.date}</td>
              <td style={TD}>{s.client}</td>
              <td style={{...TD,textAlign:'center'}}>{s.items.reduce((a,i)=>a+i.qty,0)}</td>
              <td style={TD}>
                {hasMulti
                  ?<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {s.payments.map((p,i)=>{
                      const mpm=st.payment_methods.find(x=>x.id===p.method_id);
                      return <Badge key={i} txt={`${mpm?.name?.split(' ')[0]||(p.method_id==='employee_deduct'?'Nómina':p.method_id)} ${p.currency==='VES'?`Bs.${fN(p.amount_native)}`:`$${fN(p.amount_native??p.amount_usd)}`}`} color={mpm?.color||(p.method_id==='employee_deduct'?C.o:C.t3)}/>;
                    })}
                  </div>
                  :<Badge txt={s.payment_method==='employee_deduct'?'💼 Nómina':pm?.name||s.payment_method_name||s.payment_method} color={s.payment_method==='employee_deduct'?C.o:pm?.color||C.t3}/>}
              </td>
              <td style={{...TD,textAlign:'right',fontWeight:700,color:C.g}}>${fN(s.total_usd)}</td>
              <td style={{...TD,textAlign:'right',color:C.t2}}>{ves?.symbol}{fN(s.total_usd*(ves?.rate||1))}</td>
            </tr>);
          })}
        </tbody>
        {paged.length>0&&<tfoot><tr style={{background:'#FAFBFD',fontWeight:700}}><td style={TD} colSpan={4}>TOTALES ({salesFiltered.length} ventas)</td><td style={{...TD,textAlign:'right',color:C.g,fontSize:15}}>${fN(totalDay)}</td><td style={TD}/></tr></tfoot>}
      </table>
      <Pagination page={page} totalPages={totalPages} setPage={setPage}/>
    </div>
  </div>);
}

// ── COMPRAS ───────────────────────────────────────────────────────────
function Compras({st,dispatch}){
  const[view,setView]=useState('new');
  const[form,setForm]=useState({invoice_num:'',supplier_id:'',date:todayISO(),currency:'usd',notes:'',is_credit:false,due_date:'',items:[{product_id:'',qty:'',cost_unit:'',subtotal:0}]});
  const[ToastEl,showToast]=useToast();
  const set=(k,v)=>setForm(x=>({...x,[k]:v}));
  function setItem(idx,k,v){setForm(x=>{const items=x.items.map((i,j)=>{if(j!==idx)return i;const upd={...i,[k]:v};upd.subtotal=Number(upd.qty||0)*Number(upd.cost_unit||0);return upd;});return{...x,items};});}
  const selCur=st.currencies[form.currency]||st.currencies.usd;
  const total=form.items.reduce((a,i)=>a+Number(i.subtotal||0),0);
  const totalUSD=total/selCur.rate;
  function handleSave(){
    const validItems=form.items.filter(i=>i.product_id&&Number(i.qty)>0);
    if(!form.invoice_num||!validItems.length)return;
    dispatch({type:'ADD_PURCHASE',p:{id:uid(),...form,items:validItems.map(i=>({...i,qty:Number(i.qty),cost_unit:Number(i.cost_unit)/selCur.rate,subtotal:Number(i.subtotal)})),total,total_usd:totalUSD}});
    showToast('Factura registrada. Inventario actualizado.');
    setForm({invoice_num:'',supplier_id:'',date:todayISO(),currency:'usd',notes:'',is_credit:false,due_date:'',items:[{product_id:'',qty:'',cost_unit:'',subtotal:0}]});
    setView('history');
  }

  const pendingPayables=(st.payables||[]).filter(p=>!p.paid);
  const paidPayables=(st.payables||[]).filter(p=>p.paid);

  return(<div>{ToastEl}
    <PageHeader title="Compras y Facturas" sub="Registro de facturas y cuentas por pagar">
      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.bd}`,overflow:'hidden'}}>
        {[['new','Nueva Factura'],['history','Historial'],['payables','Cuentas x Pagar']].map(([v,l])=>(<button key={v} onClick={()=>setView(v)} style={{padding:'8px 16px',background:view===v?C.pr:'#fff',color:view===v?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,position:'relative'}}>
          {l}{v==='payables'&&pendingPayables.length>0&&<span style={{marginLeft:6,background:C.r,color:'#fff',borderRadius:10,padding:'0 6px',fontSize:10,fontWeight:700}}>{pendingPayables.length}</span>}
        </button>))}
      </div>
    </PageHeader>

    {view==='new'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={card({padding:20})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Datos de la Factura</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={lbl}>N° de Factura</label><input style={inp} value={form.invoice_num} onChange={e=>set('invoice_num',e.target.value)} placeholder="FAC-001"/></div>
            <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={form.date} onChange={e=>set('date',e.target.value)}/></div>
            <div><label style={lbl}>Proveedor</label><select style={sel} value={form.supplier_id} onChange={e=>set('supplier_id',e.target.value)}><option value="">-- Seleccionar --</option>{st.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label style={lbl}>Moneda</label><select style={sel} value={form.currency} onChange={e=>set('currency',e.target.value)}>{Object.entries(st.currencies).map(([k,c])=><option key={k} value={k}>{c.name} ({c.symbol})</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label style={lbl}>Observaciones</label><input style={inp} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Notas..."/></div>
            <div style={{gridColumn:'1/-1',display:'flex',gap:16,alignItems:'center'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:C.t2}}>
                <input type="checkbox" checked={form.is_credit} onChange={e=>set('is_credit',e.target.checked)} style={{width:16,height:16}}/>
                Factura a crédito (genera cuenta por pagar)
              </label>
              {form.is_credit&&<div style={{display:'flex',alignItems:'center',gap:8}}><label style={{...lbl,marginBottom:0,whiteSpace:'nowrap'}}>Vence:</label><input type="date" style={{...inp,width:'auto'}} value={form.due_date} onChange={e=>set('due_date',e.target.value)}/></div>}
            </div>
          </div>
        </div>
        <div style={card({padding:20})}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Detalle de Productos</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 90px 110px 110px 36px',gap:8,marginBottom:8}}>
            {['Producto','Cantidad','Costo Unit.','Subtotal',''].map((h,i)=><div key={i} style={{...lbl,marginBottom:0}}>{h}</div>)}
          </div>
          {form.items.map((item,idx)=>(
            <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 90px 110px 110px 36px',gap:8,marginBottom:8,alignItems:'center'}}>
              <select style={sel} value={item.product_id} onChange={e=>setItem(idx,'product_id',e.target.value)}><option value="">-- Seleccionar --</option>{st.products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select>
              <input type="number" step="0.01" style={inp} value={item.qty} onChange={e=>setItem(idx,'qty',e.target.value)}/>
              <input type="number" step="0.01" style={inp} value={item.cost_unit} onChange={e=>setItem(idx,'cost_unit',e.target.value)}/>
              <div style={{...inp,background:'#FAFBFD',color:C.t2,cursor:'default'}}>{selCur.symbol}{fN(item.subtotal)}</div>
              <button style={{...bDgr,padding:'7px 10px'}} onClick={()=>setForm(x=>({...x,items:x.items.filter((_,j)=>j!==idx)}))}>✕</button>
            </div>
          ))}
          <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>setForm(x=>({...x,items:[...x.items,{product_id:'',qty:'',cost_unit:'',subtotal:0}]}))}>+ Agregar producto</button>
        </div>
      </div>
      <div style={{...card({padding:20}),position:'sticky',top:10}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Resumen</div>
        {form.items.filter(i=>i.product_id).map((item,i)=>{const p=st.products.find(x=>x.id===item.product_id);return(<div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:`1px dashed ${C.bd}`}}><span style={{color:C.t2}}>{p?.name}</span><span style={{fontWeight:600}}>{selCur.symbol}{fN(item.subtotal)}</span></div>);})}
        <div style={{borderTop:`2px solid ${C.bd}`,marginTop:12,paddingTop:12}}>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,marginBottom:4}}><span>Total {selCur.name}</span><span style={{color:C.a,fontSize:18}}>{selCur.symbol}{fN(total)}</span></div>
          <div style={{fontSize:12,color:C.t3}}>Equivalente USD: <strong>${fN(totalUSD)}</strong></div>
          {form.is_credit&&<div style={{marginTop:8,padding:8,background:C.aL,borderRadius:6,fontSize:12,color:C.a,fontWeight:600}}>⏳ Se generará cuenta por pagar</div>}
        </div>
        <button onClick={handleSave} style={{...bPr,width:'100%',justifyContent:'center',marginTop:16,padding:'11px'}}>✓ Guardar Factura</button>
      </div>
    </div>)}

    {view==='history'&&(<div>
      <div style={{marginBottom:12,display:'flex',justifyContent:'flex-end'}}>
        <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(st.purchases.map(p=>({Factura:p.invoice_num,Fecha:p.date,Proveedor:st.suppliers.find(s=>s.id===p.supplier_id)?.name||'',Total:f2(p.total),Moneda:p.currency,TotalUSD:f2(p.total_usd),Crédito:p.is_credit?'Sí':'No'})),'compras.csv')}>⬇ CSV</button>
      </div>
      <div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>N° Factura</th><th style={TH}>Fecha</th><th style={TH}>Proveedor</th><th style={{...TH,textAlign:'center'}}>Items</th><th style={{...TH,textAlign:'right'}}>Total</th><th style={{...TH,textAlign:'right'}}>Total USD</th><th style={TH}>Moneda</th><th style={TH}>Crédito</th></tr></thead>
          <tbody>
            {st.purchases.length===0?<tr><td colSpan={8}><EmptyState icon="📦" title="Sin facturas" sub="Registra tu primera factura"/></td></tr>
            :st.purchases.map(p=>{const sup=st.suppliers.find(s=>s.id===p.supplier_id);const c=st.currencies[p.currency];return(<tr key={p.id}><td style={{...TD,fontWeight:700,color:C.pr}}>{p.invoice_num}</td><td style={TD}>{p.date}</td><td style={{...TD,fontWeight:600}}>{sup?.name||'—'}</td><td style={{...TD,textAlign:'center'}}>{p.items.length}</td><td style={{...TD,textAlign:'right',fontWeight:700}}>{c?.symbol}{fN(p.total)}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:C.b}}>${fN(p.total_usd)}</td><td style={TD}><Badge txt={c?.code||p.currency} color={C.a}/></td><td style={TD}>{p.is_credit?<Badge txt="Crédito" color={C.a}/>:'—'}</td></tr>);})}
          </tbody>
        </table>
      </div>
    </div>)}

    {view==='payables'&&(<div>
      {pendingPayables.length>0&&<div style={{background:C.aL,border:`1.5px solid ${C.aT}`,borderRadius:10,padding:'12px 16px',marginBottom:16,fontWeight:600,color:C.a,fontSize:13}}>⏳ {pendingPayables.length} cuentas pendientes · Total: <strong>${fN(pendingPayables.reduce((a,p)=>a+p.amount_usd,0))}</strong> USD</div>}
      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Pendientes</div>
      {pendingPayables.length===0?<EmptyState icon="✅" title="Sin cuentas pendientes" sub="Todas las facturas están pagadas"/>
      :<div style={card({padding:0,overflow:'hidden',marginBottom:24})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Factura</th><th style={TH}>Proveedor</th><th style={TH}>Fecha</th><th style={TH}>Vence</th><th style={{...TH,textAlign:'right'}}>Monto USD</th><th style={TH}>Estado</th><th style={{...TH,textAlign:'center'}}>Acción</th></tr></thead>
          <tbody>{pendingPayables.map(p=>{
            const sup=st.suppliers.find(s=>s.id===p.supplier_id);const isOverdue=p.due_date&&p.due_date<todayISO();
            return(<tr key={p.id}><td style={{...TD,fontWeight:700,color:C.pr}}>{p.invoice_num}</td><td style={TD}>{sup?.name||'—'}</td><td style={TD}>{p.date}</td><td style={{...TD,color:isOverdue?C.r:C.t2,fontWeight:isOverdue?700:400}}>{p.due_date||'—'}{isOverdue&&' ⚠'}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:C.a}}>${fN(p.amount_usd)}</td><td style={TD}><Badge txt={isOverdue?'Vencida':'Pendiente'} color={isOverdue?C.r:C.a}/></td><td style={{...TD,textAlign:'center'}}><button style={bSm(C.gL,C.g,C.gT)} onClick={()=>{dispatch({type:'PAY_PAYABLE',id:p.id,invoice_num:p.invoice_num});showToast('Pago registrado');}}>✓ Pagar</button></td></tr>);
          })}</tbody>
        </table>
      </div>}
      {paidPayables.length>0&&<><div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.t3}}>Pagadas ({paidPayables.length})</div>
      <div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Factura</th><th style={TH}>Proveedor</th><th style={{...TH,textAlign:'right'}}>Monto USD</th><th style={TH}>Pagada</th></tr></thead>
          <tbody>{paidPayables.map(p=>{const sup=st.suppliers.find(s=>s.id===p.supplier_id);return(<tr key={p.id}><td style={TD}>{p.invoice_num}</td><td style={TD}>{sup?.name||'—'}</td><td style={{...TD,textAlign:'right'}}>${fN(p.amount_usd)}</td><td style={TD}><Badge txt={p.paid_date||'Pagada'} color={C.g}/></td></tr>);})}</tbody>
        </table>
      </div></>}
    </div>)}
  </div>);
}

// ── INVENTARIO ────────────────────────────────────────────────────────
function Inventario({st,dispatch}){
  const[view,setView]=useState('stock');
  const[adjustModal,setAdjustModal]=useState(null);
  const[adj,setAdj]=useState({qty:'',notes:''});
  const[filterType,setFilterType]=useState('all');
  const[ToastEl,showToast]=useToast();
  const movements=st.inv_movements||[];
  const{paged,page,setPage,totalPages}=usePagination(movements,20);

  const prods=st.products.filter(p=>filterType==='all'||p.type===filterType).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  const lowStock=st.products.filter(p=>p.active&&p.stock<=p.min_stock&&p.min_stock>0);
  const totalValue=st.products.reduce((a,p)=>a+p.stock*p.cost,0);

  function doAdjust(){
    if(!adj.qty||!adjustModal)return;
    dispatch({type:'ADJUST_STOCK',product_id:adjustModal.id,qty:Number(adj.qty),notes:adj.notes});
    showToast('Stock ajustado correctamente');setAdjustModal(null);setAdj({qty:'',notes:''});
  }

  return(<div>{ToastEl}
    <PageHeader title="Inventario" sub="Control de stock y movimientos">
      <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(st.products.map(p=>({Código:p.code,Nombre:p.name,Tipo:p.type,Stock:p.stock,StockMínimo:p.min_stock,Unidad:p.unit,'Costo/u':f2(p.cost),ValorTotal:f2(p.stock*p.cost),Vencimiento:p.expiry||''})),'inventario.csv')}>⬇ CSV Inventario</button>
      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.bd}`,overflow:'hidden'}}>
        {[['stock','Stock Actual'],['movements','Movimientos']].map(([v,l])=>(<button key={v} onClick={()=>setView(v)} style={{padding:'8px 16px',background:view===v?C.pr:'#fff',color:view===v?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>))}
      </div>
    </PageHeader>

    {lowStock.length>0&&(<div style={{background:C.rL,border:`1.5px solid ${C.rT}`,borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <span style={{fontWeight:700,color:C.r,fontSize:13}}>⚠️ Materiales bajo mínimo:</span>
      {lowStock.map(p=><Badge key={p.id} txt={`${p.name}: ${f2(p.stock)}/${p.min_stock} ${p.unit}`} color={C.r}/>)}
    </div>)}

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
      <KPICard label="Productos Totales" value={st.products.filter(p=>p.active).length} sub="activos en catálogo" icon="🔖" color={C.pr}/>
      <KPICard label="Bajo Mínimo" value={lowStock.length} sub="necesitan reposición" icon="⚠️" color={lowStock.length>0?C.r:C.g}/>
      <KPICard label="Valor del Inventario" value={`$${fN(totalValue)}`} sub="costo total en stock" icon="💰" color={C.g}/>
    </div>

    {view==='stock'&&(<>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[{v:'all',l:'Todos'},{v:'materia_prima',l:'Materia Prima'},{v:'terminado',l:'Terminado'},{v:'venta',l:'Venta'}].map(t=>(
          <button key={t.v} onClick={()=>setFilterType(t.v)} style={{padding:'6px 14px',background:filterType===t.v?C.pr:C.card,color:filterType===t.v?'#fff':C.t2,border:`1.5px solid ${filterType===t.v?C.pr:C.bd}`,borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600}}>{t.l}</button>
        ))}
      </div>
      <div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Código</th><th style={TH}>Producto</th><th style={TH}>Tipo</th><th style={{...TH,textAlign:'right'}}>Stock</th><th style={{...TH,textAlign:'right'}}>Mínimo</th><th style={{...TH,textAlign:'center'}}>Estado</th><th style={{...TH,textAlign:'right'}}>Costo/u</th><th style={{...TH,textAlign:'right'}}>Valor Total</th><th style={TH}>Vence</th><th style={{...TH,textAlign:'center'}}>Ajustar</th></tr></thead>
          <tbody>{prods.map(p=>{
            const isLow=p.stock<=p.min_stock&&p.min_stock>0;const isCrit=p.stock===0;
            const expiryWarn=p.expiry&&(new Date(p.expiry)-new Date())/(1000*60*60*24)<=7;
            return(<tr key={p.id} style={{background:isCrit?C.rL+'66':isLow?C.aL+'66':'inherit'}}>
              <td style={{...TD,color:C.t3,fontFamily:'monospace',fontSize:12}}>{p.code}</td>
              <td style={{...TD,fontWeight:600}}>{p.name}</td>
              <td style={TD}>{TYPE_BADGE(p.type)}</td>
              <td style={{...TD,textAlign:'right',fontWeight:800,color:isCrit?C.r:isLow?C.a:C.g,fontSize:15}}>{f2(p.stock)} <span style={{fontSize:11,fontWeight:400,color:C.t3}}>{p.unit}</span></td>
              <td style={{...TD,textAlign:'right',color:C.t3}}>{p.min_stock} {p.unit}</td>
              <td style={{...TD,textAlign:'center'}}>{isCrit?<Badge txt="Sin Stock" color={C.r}/>:isLow?<Badge txt="Bajo Mínimo" color={C.a}/>:<Badge txt="OK" color={C.g}/>}</td>
              <td style={{...TD,textAlign:'right'}}>${f2(p.cost)}</td>
              <td style={{...TD,textAlign:'right',fontWeight:700}}>${fN(p.stock*p.cost)}</td>
              <td style={TD}>{p.expiry?<span style={{fontSize:12,color:expiryWarn?C.r:C.t3,fontWeight:expiryWarn?700:400}}>{p.expiry}{expiryWarn&&' ⚠'}</span>:'—'}</td>
              <td style={{...TD,textAlign:'center'}}><button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>{setAdjustModal(p);setAdj({qty:'',notes:''});}}>Ajustar</button></td>
            </tr>);
          })}</tbody>
          <tfoot><tr style={{background:'#FAFBFD',fontWeight:700}}><td style={TD} colSpan={7}>Valor Total del Inventario</td><td style={{...TD,textAlign:'right',fontSize:15,color:C.pr}}>${fN(totalValue)}</td><td style={TD} colSpan={2}/></tr></tfoot>
        </table>
      </div>
    </>)}

    {view==='movements'&&(<div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={TH}>Fecha</th><th style={TH}>Producto</th><th style={{...TH,textAlign:'center'}}>Tipo</th><th style={{...TH,textAlign:'right'}}>Cantidad</th><th style={TH}>Razón</th><th style={TH}>Referencia</th><th style={TH}>Notas</th></tr></thead>
        <tbody>
          {paged.length===0?<tr><td colSpan={7}><EmptyState icon="🗃" title="Sin movimientos" sub="Los movimientos se generan al producir, vender o comprar"/></td></tr>
          :paged.map(m=>(<tr key={m.id}><td style={{...TD,color:C.t3,fontSize:12}}>{m.date}</td><td style={{...TD,fontWeight:600}}>{pName(st.products,m.product_id)}</td><td style={{...TD,textAlign:'center'}}><Badge txt={m.type==='entrada'?'▲ Entrada':'▼ Salida'} color={m.type==='entrada'?C.g:C.r}/></td><td style={{...TD,textAlign:'right',fontWeight:700,color:m.type==='entrada'?C.g:C.r}}>{m.type==='entrada'?'+':'-'}{f2(m.qty)}</td><td style={TD}>{m.reason}</td><td style={TD}><Badge txt={m.ref_type||'manual'} color={C.b}/></td><td style={{...TD,color:C.t3,fontSize:12,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{m.notes||'—'}</td></tr>))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} setPage={setPage}/>
    </div>)}

    {adjustModal&&(<Modal title={`Ajustar Stock: ${adjustModal.name}`} onClose={()=>setAdjustModal(null)} width={420} footer={<><button style={bSc} onClick={()=>setAdjustModal(null)}>Cancelar</button><button style={bPr} onClick={doAdjust}>Aplicar Ajuste</button></>}>
      <div style={{...card({padding:14}),background:C.prL,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:C.t2}}>Stock actual:</span><strong style={{color:C.pr}}>{f2(adjustModal.stock)} {adjustModal.unit}</strong></div>
        {adj.qty&&<div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span style={{color:C.t2}}>Nuevo stock:</span><strong style={{color:Number(adj.qty)>0?C.g:C.r}}>{f2(Math.max(0,adjustModal.stock+Number(adj.qty)))} {adjustModal.unit}</strong></div>}
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>Ajuste (+ para agregar, - para restar)</label><input type="number" style={inp} value={adj.qty} onChange={e=>setAdj(a=>({...a,qty:e.target.value}))} placeholder="Ej: +50 o -10" autoFocus/></div>
      <div><label style={lbl}>Motivo del ajuste</label><input style={inp} value={adj.notes} onChange={e=>setAdj(a=>({...a,notes:e.target.value}))} placeholder="Inventario físico, corrección, pérdida..."/></div>
    </Modal>)}
  </div>);
}

// ── CUADRE DE CAJA ────────────────────────────────────────────────────
function CuadreCaja({st,dispatch}){
  const[view,setView]=useState('close');
  const[closeDate,setCloseDate]=useState(todayISO());
  const[usdBills,setUsdBills]=useState({});  // {denominación: cantidad} billetes contados
  const USD_DENOMS=[100,50,20,10,5,1];
  const[actualBs,setActualBs]=useState({});    // pos/mobile/cash_ves counting in Bs
  const[notes,setNotes]=useState('');
  const[ToastEl,showToast]=useToast();

  const vesRate=Object.values(st.currencies).find(c=>c.code==='VES')?.rate||1;
  const USD_PM_ID='cash_usd'; // Only USD cash method
  const BS_PM_IDS=['pos','mobile','cash_ves']; // All Bs methods

  // ── TURNOS: cada cierre cubre lo vendido DESPUÉS del cierre anterior del mismo día ──
  const dayCloses=st.cash_closes.filter(c=>c.date===closeDate).sort((a,b)=>(a.ts||0)-(b.ts||0));
  const lastCloseTs=dayCloses.length?Math.max(...dayCloses.map(c=>c.ts||0)):0;
  const shiftNum=dayCloses.length+1;

  const daysSales=st.sales.filter(s=>s.date===closeDate&&s.payment_method!=='employee_deduct'&&(s.ts||0)>lastCloseTs);
  const dayExpenses=(st.expenses||[]).filter(e=>e.date===closeDate&&(e.ts||0)>lastCloseTs);
  const dayDeductions=(st.employees||[]).flatMap(e=>(e.salary_deductions||[]).filter(d=>d.date===closeDate&&(d.ts||0)>lastCloseTs).map(d=>({...d,emp_name:e.name})));

  // Compute how much came in per payment method (in USD)
  function getPMTotal(pmId){
    return daysSales.reduce((acc,s)=>{
      if(s.payments?.length>0) return acc+s.payments.filter(p=>p.method_id===pmId).reduce((b,p)=>b+p.amount_usd,0);
      return acc+(s.payment_method===pmId?s.total_usd:0);
    },0);
  }

  // Vueltos entregados en Bs (los USD entran completos, el vuelto sale del efectivo Bs)
  const changeBsGiven=daysSales.reduce((a,s)=>a+(s.change_bs||0),0);

  // USD section: billetes completos recibidos (incluye el excedente que generó vuelto)
  // Redondeado a entero: en Venezuela solo existen billetes de 1,5,10,20,50,100 — sin centavos
  const totalUSDSales=Math.round(getPMTotal(USD_PM_ID));
  const totalUSDActual=USD_DENOMS.reduce((a,d)=>a+d*Number(usdBills[d]||0),0);
  const diffUSD=totalUSDActual-totalUSDSales;

  // Bs section: cada método en Bs; al Efectivo Bs se le RESTAN los vueltos entregados
  const bsMethods=st.payment_methods.filter(pm=>BS_PM_IDS.includes(pm.id));
  const bsTotals={};
  bsMethods.forEach(pm=>{
    let usd=getPMTotal(pm.id);
    let bs=usd*vesRate;
    if(pm.id==='cash_ves'){bs=bs-changeBsGiven;usd=bs/vesRate;} // vueltos salen del efectivo Bs
    bsTotals[pm.id]={usd,bs};
  });
  const totalBsSalesUSD=Object.values(bsTotals).reduce((a,v)=>a+v.usd,0);
  const totalBsSalesBs=totalBsSalesUSD*vesRate;
  const totalBsActualBs=Object.values(actualBs).reduce((a,v)=>a+Number(v||0),0);
  const diffBs=totalBsActualBs-totalBsSalesBs;

  // Totals
  const totalExpected=daysSales.reduce((a,s)=>a+s.total_usd,0);
  const totalDayExpenses=dayExpenses.reduce((a,e)=>a+e.amount_usd,0);
  const totalDeductions=dayDeductions.reduce((a,d)=>a+d.amount_usd,0);
  const netDay=totalExpected-totalDayExpenses;
  const panes=daysSales.reduce((a,s)=>a+s.items.filter(i=>st.products.find(p=>p.id===i.product_id)?.type==='terminado').reduce((b,i)=>b+i.qty,0),0);

  function handleClose(){
    if(daysSales.length===0&&totalDayExpenses===0){showToast('No hay ventas ni gastos nuevos para cerrar en este turno');return;}
    const salesByPM={};
    st.payment_methods.forEach(pm=>{salesByPM[pm.id]=getPMTotal(pm.id);});
    dispatch({type:'ADD_CASH_CLOSE',p:{
      id:uid(),date:closeDate,shift:shiftNum,
      sales_by_pm:salesByPM,expected_total:totalExpected,
      total_usd_cash:totalUSDSales,total_bs_sales:totalBsSalesBs,
      actual_usd:totalUSDActual,actual_bs:totalBsActualBs,
      usd_bills:usdBills,
      diff_usd:diffUSD,diff_bs:diffBs,
      expenses_total:totalDayExpenses,deductions_total:totalDeductions,
      change_bs_given:changeBsGiven,
      net_result:netDay,panes,
      closed_by:st.current_user?.name||'—',
      notes,closed_at:nowISO(),ts:Date.now(),
    }});
    showToast(`Cierre del Turno ${shiftNum} registrado`);setView('history');
    setNotes('');setUsdBills({});setActualBs({});
  }

  return(<div>{ToastEl}
    <PageHeader title="Cuadre de Caja" sub="Cierre diario con doble moneda">
      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.bd}`,overflow:'hidden'}}>
        {[['close','Hacer Cierre'],['history','Histórico']].map(([v,l])=>(<button key={v} onClick={()=>setView(v)} style={{padding:'8px 16px',background:view===v?C.pr:'#fff',color:view===v?'#fff':C.t2,border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>))}
      </div>
    </PageHeader>

    {view==='close'&&(<div style={{maxWidth:980}}>
      {/* Date bar */}
      <div style={{...card({padding:14}),marginBottom:14}}>
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <label style={{...lbl,marginBottom:0,whiteSpace:'nowrap'}}>Fecha del Cierre:</label>
          <input type="date" style={{...inp,width:'auto'}} value={closeDate} onChange={e=>setCloseDate(e.target.value)}/>
          <Badge txt={`🕐 Turno ${shiftNum}`} color={C.p}/>
          <Badge txt={`👤 Cierra: ${st.current_user?.name||'—'}`} color={C.b}/>
          <div style={{marginLeft:'auto',fontSize:12,color:C.t3}}>{daysSales.length} ventas nuevas · {panes} panes · Tasa: Bs.{fN(vesRate)}/$</div>
        </div>
        {dayCloses.length>0&&(<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.bd}`,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:C.t3}}>Cierres previos hoy:</span>
          {dayCloses.map(c=>(<Badge key={c.id} txt={`Turno ${c.shift||'—'} · ${c.closed_by||'—'} · $${fN(c.expected_total)} · ${(c.closed_at||'').split(' ')[1]||''}`} color={C.t2}/>))}
        </div>)}
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        <KPICard label="Total Ventas (USD)" value={`$${fN(totalExpected)}`} sub="en sistema" icon="💵" color={C.g}/>
        <KPICard label="En Bolívares" value={`Bs.${fN(totalBsSalesBs)}`} sub={`${bsMethods.length} métodos Bs`} icon="💴" color={C.a}/>
        <KPICard label="Gastos del Día" value={`$${fN(totalDayExpenses)}`} sub={`${dayExpenses.length} registros`} icon="💸" color={C.o}/>
        <KPICard label="Resultado Neto" value={`$${fN(netDay)}`} sub="ventas − gastos" icon={netDay>=0?'📈':'📉'} color={netDay>=0?C.g:C.r}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        {/* === USD SECTION === */}
        <div style={card({padding:18})}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>💵</span> Efectivo USD
          </div>
          <div style={{fontSize:11,color:C.t3,marginBottom:10,background:C.gL,borderRadius:6,padding:'6px 10px'}}>
            💡 Los dólares entran como billetes completos. Los vueltos NUNCA se restan de aquí — salen en Bs.
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'8px 0',borderBottom:`1px solid ${C.bd}`}}>
            <span style={{color:C.t2,fontWeight:600}}>Billetes USD recibidos</span>
            <span style={{fontWeight:900,color:C.g,fontSize:17}}>${fN(totalUSDSales)}</span>
          </div>
          <div style={{padding:'12px 0',borderBottom:`1px solid ${C.bd}`}}>
            <label style={{...lbl,marginBottom:8}}>Conteo de billetes físicos</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {USD_DENOMS.map(den=>(<div key={den} style={{display:'flex',alignItems:'center',gap:5,background:'#F8FAFC',border:`1px solid ${C.bd}`,borderRadius:8,padding:'5px 8px'}}>
                <span style={{fontSize:13,fontWeight:800,color:C.g,minWidth:32}}>${den}</span>
                <span style={{fontSize:11,color:C.t3}}>×</span>
                <input type="number" min="0" step="1"
                  value={usdBills[den]||''}
                  onChange={e=>{const v=e.target.value.replace(/[^\d]/g,'');setUsdBills(b=>({...b,[den]:v}));}}
                  style={{...inp,padding:'4px 6px',fontSize:14,fontWeight:800,textAlign:'center',width:'100%',minWidth:0}}
                  placeholder="0"/>
              </div>))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:10,alignItems:'baseline'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.t2}}>Total contado:</span>
              <span style={{fontSize:20,fontWeight:900,color:C.b}}>${fN(totalUSDActual)}</span>
            </div>
          </div>
          {(totalUSDActual>0||totalUSDSales>0)&&<div style={{paddingTop:10,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:15}}>
            <span>Diferencia USD:</span>
            <span style={{color:Math.abs(diffUSD)<0.01?C.g:diffUSD>0?C.b:C.r}}>
              {diffUSD>0?'+':''}{fN(diffUSD)} {Math.abs(diffUSD)<0.01?'✓ Exacto':diffUSD>0?'(sobrante)':'(faltante)'}
            </span>
          </div>}
        </div>

        {/* === BOLÍVARES SECTION === */}
        <div style={card({padding:18})}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>💴</span> Bolívares (POS / Móvil / Efectivo Bs)
          </div>
          {bsMethods.map(pm=>(<div key={pm.id} style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.t2,marginBottom:3}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:'50%',background:pm.color}}/>{pm.name}{pm.id==='cash_ves'&&changeBsGiven>0&&<span style={{fontSize:10,color:C.o}}>(− vueltos)</span>}</div>
              <span>Sistema: <b>Bs.{fN(bsTotals[pm.id]?.bs||0)}</b></span>
            </div>
            {pm.id==='cash_ves'&&changeBsGiven>0&&(<div style={{fontSize:11,color:C.o,fontWeight:600,marginBottom:3,paddingLeft:14}}>
              Vueltos entregados en Bs: −Bs.{fN(changeBsGiven)}
            </div>)}
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:6,alignItems:'center'}}>
              <span style={{fontSize:11,color:C.t3}}>≈ ${fN(bsTotals[pm.id]?.usd||0)} USD</span>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',fontSize:10,color:C.t3,pointerEvents:'none'}}>Bs.</span>
                <input type="number" step="1" style={{...inp,paddingLeft:28,fontSize:12}} value={actualBs[pm.id]||''} onChange={e=>setActualBs(a=>({...a,[pm.id]:e.target.value}))} placeholder="0"/>
              </div>
            </div>
          </div>))}
          <div style={{borderTop:`2px solid ${C.bd}`,paddingTop:10,marginTop:6}}>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:13,marginBottom:4}}>
              <span>Total Bs. sistema:</span><span style={{color:C.a}}>Bs.{fN(totalBsSalesBs)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:13,marginBottom:4}}>
              <span>Total Bs. contado:</span><span style={{color:C.b}}>Bs.{fN(totalBsActualBs)}</span>
            </div>
            {totalBsActualBs>0&&<div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:12}}>
              <span>Diferencia Bs:</span>
              <span style={{color:Math.abs(diffBs)<1?C.g:diffBs>0?C.b:C.r}}>
                {diffBs>0?'+':''}{fN(diffBs)} {Math.abs(diffBs)<1?'✓':diffBs>0?'(sobrante)':'(faltante)'}
              </span>
            </div>}
          </div>
        </div>
      </div>

      {/* Gastos del día */}
      {dayExpenses.length>0&&(<div style={{...card({padding:16}),marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>💸 Gastos del Día</div>
        {dayExpenses.map(e=>(<div key={e.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,padding:'4px 0',borderBottom:`1px solid ${C.bd}`}}>
          <span style={{color:C.t2}}>{e.category}: {e.description}</span>
          <span style={{color:C.o,fontWeight:700}}>${fN(e.amount_usd)}</span>
        </div>))}
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,paddingTop:8}}>
          <span>Total gastos:</span><span style={{color:C.o}}>${fN(totalDayExpenses)}</span>
        </div>
      </div>)}

      {/* Descuentos de empleados del día */}
      {dayDeductions.length>0&&(<div style={{...card({padding:16}),marginBottom:14,borderLeft:`3px solid ${C.p}`}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>👷 Descuentos de Nómina del Día</div>
        {dayDeductions.map(d=>(<div key={d.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6,padding:'4px 0',borderBottom:`1px solid ${C.bd}`}}>
          <div>
            <span style={{fontWeight:600,color:C.t1}}>{d.emp_name}</span>
            <div style={{fontSize:11,color:C.t3}}>{d.items_desc}</div>
          </div>
          <span style={{color:C.p,fontWeight:700,whiteSpace:'nowrap'}}>${fN(d.amount_usd)}</span>
        </div>))}
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,paddingTop:8}}>
          <span>Total descuentos nómina:</span><span style={{color:C.p}}>${fN(totalDeductions)}</span>
        </div>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>* No entran en caja; se descuentan del sueldo del empleado</div>
      </div>)}

      {/* Net summary */}
      <div style={{...card({padding:18}),marginBottom:14,background:`linear-gradient(135deg,${netDay>=0?C.gL:C.rL},#fff)`,borderLeft:`4px solid ${netDay>=0?C.g:C.r}`}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,textAlign:'center'}}>
          <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Ventas del Día</div><div style={{fontSize:24,fontWeight:900,color:C.g}}>${fN(totalExpected)}</div><div style={{fontSize:10,color:C.t3}}>Bs.{fN(totalExpected*vesRate)}</div></div>
          <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Gastos Totales</div><div style={{fontSize:24,fontWeight:900,color:C.o}}>${fN(totalDayExpenses)}</div></div>
          <div><div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>Resultado Neto</div><div style={{fontSize:24,fontWeight:900,color:netDay>=0?C.g:C.r}}>${fN(netDay)}</div><div style={{fontSize:10,color:C.t3}}>Bs.{fN(netDay*vesRate)}</div></div>
        </div>
      </div>

      <div style={card({padding:18})}>
        <label style={lbl}>Observaciones</label>
        <input style={{...inp,marginBottom:12}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas, incidencias del turno..."/>
        <button onClick={handleClose} style={{...bPr,padding:'12px 32px',fontSize:14}}>
          ✓ Registrar Cierre — Turno {shiftNum}
        </button>
      </div>
    </div>)}

    {view==='history'&&(<div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>
          <th style={TH}>Fecha</th><th style={TH}>Turno</th><th style={TH}>Cerró</th><th style={TH}>Panes</th>
          <th style={{...TH,textAlign:'right'}}>USD Ventas</th>
          <th style={{...TH,textAlign:'right'}}>Bs. Ventas</th>
          <th style={{...TH,textAlign:'right'}}>Gastos</th>
          <th style={{...TH,textAlign:'right'}}>Neto</th>
          <th style={{...TH,textAlign:'center'}}>Estado</th>
        </tr></thead>
        <tbody>{st.cash_closes.length===0
          ?<tr><td colSpan={9}><EmptyState icon="💰" title="Sin cierres registrados" sub="Registra el primer cierre de caja"/></td></tr>
          :st.cash_closes.map(c=>(<tr key={c.id}>
            <td style={{...TD,fontWeight:700}}>{c.date}<div style={{fontSize:10,color:C.t3,fontWeight:400}}>{(c.closed_at||'').split(' ')[1]||''}</div></td>
            <td style={TD}><Badge txt={`Turno ${c.shift||1}`} color={C.p}/></td>
            <td style={TD}><Badge txt={`👤 ${c.closed_by||'—'}`} color={C.b}/></td>
            <td style={TD}>{c.panes}</td>
            <td style={{...TD,textAlign:'right',color:C.g,fontWeight:700}}>${fN(c.total_usd_cash||c.expected_total)}</td>
            <td style={{...TD,textAlign:'right',color:C.a,fontWeight:700}}>Bs.{fN(c.total_bs_sales||0)}</td>
            <td style={{...TD,textAlign:'right',color:C.o}}>${fN(c.expenses_total||0)}</td>
            <td style={{...TD,textAlign:'right',fontWeight:700,color:(c.net_result||c.expected_total)>=0?C.g:C.r}}>${fN(c.net_result||c.expected_total)}</td>
            <td style={{...TD,textAlign:'center'}}>
              {Math.abs(c.diff_usd||c.diff||0)<0.01&&Math.abs(c.diff_bs||0)<1
                ?<Badge txt="✓ Exacto" color={C.g}/>
                :<Badge txt="Con diff." color={C.a}/>}
            </td>
          </tr>))}
        </tbody>
      </table>
    </div>)}
  </div>);
}

// ── REPORTES ──────────────────────────────────────────────────────────
function Reportes({st}){
  const[tab,setTab]=useState('ventas');
  const[from,setFrom]=useState(thisMonth()+'-01');
  const[to,setTo]=useState(todayISO());

  const salesF=st.sales.filter(s=>s.date>=from&&s.date<=to);
  const purchasesF=st.purchases.filter(p=>p.date>=from&&p.date<=to);
  const prodsF=st.production_runs.filter(r=>r.date>=from&&r.date<=to);
  const expensesF=(st.expenses||[]).filter(e=>e.date>=from&&e.date<=to);

  const totalSales=salesF.reduce((a,s)=>a+s.total_usd,0);
  const totalPurchases=purchasesF.reduce((a,p)=>a+p.total_usd,0);
  const totalExpenses=expensesF.reduce((a,e)=>a+e.amount_usd,0);
  const totalPanes=salesF.reduce((a,s)=>a+s.items.filter(i=>st.products.find(p=>p.id===i.product_id)?.type==='terminado').reduce((b,i)=>b+i.qty,0),0);
  const netResult=totalSales-totalPurchases-totalExpenses;

  // By day
  const salesByDay={};salesF.forEach(s=>{salesByDay[s.date]=(salesByDay[s.date]||0)+s.total_usd;});
  const expensesByDay={};expensesF.forEach(e=>{expensesByDay[e.date]=(expensesByDay[e.date]||0)+e.amount_usd;});
  
  // Chart data by day
  const allDates=[...new Set([...Object.keys(salesByDay),...Object.keys(expensesByDay)])].sort();
  const chartData=allDates.map(d=>({date:d.slice(5),ventas:Number(f2(salesByDay[d]||0)),gastos:Number(f2(expensesByDay[d]||0))}));

  // By product
  const salesByProduct={};salesF.forEach(s=>s.items.forEach(i=>{if(!salesByProduct[i.product_id])salesByProduct[i.product_id]={qty:0,total:0};salesByProduct[i.product_id].qty+=i.qty;salesByProduct[i.product_id].total+=i.total_usd;}));
  const topProducts=Object.entries(salesByProduct).sort((a,b)=>b[1].total-a[1].total);
  const topChartData=topProducts.slice(0,8).map(([pid,v])=>({name:pName(st.products,pid).slice(0,12),total:Number(f2(v.total))}));

  // Margin by product (sellable)
  const marginData=st.products.filter(p=>p.price&&p.cost&&(p.type==='terminado'||p.type==='venta')).map(p=>{
    const margin=(p.price-p.cost)/p.price*100;
    const sold=salesByProduct[p.id]?.total||0;
    const soldQty=salesByProduct[p.id]?.qty||0;
    return{name:p.name,code:p.code,price:p.price,cost:p.cost,margin,sold,soldQty,profit:sold-(p.cost*soldQty)};
  }).sort((a,b)=>b.profit-a.profit);

  // By payment method
  const salesByPM={};st.payment_methods.forEach(pm=>{salesByPM[pm.id]={name:pm.name,color:pm.color,total:0,count:0};});
  salesF.forEach(s=>{
    if(s.payments&&s.payments.length>0){
      s.payments.forEach(p=>{if(salesByPM[p.method_id]){salesByPM[p.method_id].total+=p.amount_usd;salesByPM[p.method_id].count+=1/s.payments.length;}});
    } else if(salesByPM[s.payment_method]){
      salesByPM[s.payment_method].total+=s.total_usd;salesByPM[s.payment_method].count++;
    }
  });

  // Expenses by category
  const expByCategory={};expensesF.forEach(e=>{if(!expByCategory[e.category])expByCategory[e.category]=0;expByCategory[e.category]+=e.amount_usd;});

  const tabs=[['ventas','Ventas'],['canales','Canales'],['margen','Márgenes'],['gastos_r','Gastos'],['produccion','Producción']];

  return(<div>
    <PageHeader title="Reportes" sub="Análisis y estadísticas del negocio"/>
    <div style={{...card({padding:16}),marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <span style={{fontSize:12,fontWeight:700,color:C.t3,textTransform:'uppercase'}}>Período:</span>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <input type="date" style={{...inp,width:'auto'}} value={from} onChange={e=>setFrom(e.target.value)}/>
        <span style={{color:C.t3}}>—</span>
        <input type="date" style={{...inp,width:'auto'}} value={to} onChange={e=>setTo(e.target.value)}/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button style={bSm(C.bd,C.t2,C.bd)} onClick={()=>{setFrom(thisMonth()+'-01');setTo(todayISO());}}>Este mes</button>
        <button style={bSm(C.bd,C.t2,C.bd)} onClick={()=>{setFrom(todayISO());setTo(todayISO());}}>Hoy</button>
      </div>
      <button style={{...bSm(C.gL,C.g,C.gT),marginLeft:'auto'}} onClick={()=>exportCSV([{Período:`${from} a ${to}`,TotalVentas:f2(totalSales),TotalCompras:f2(totalPurchases),TotalGastos:f2(totalExpenses),MargenBruto:f2(totalSales-totalPurchases),ResultadoNeto:f2(netResult),PanesVendidos:totalPanes}],'reporte_resumen.csv')}>⬇ CSV</button>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16}}>
      <KPICard label="Total Ventas" value={`$${fN(totalSales)}`} sub={`${salesF.length} transacciones`} icon="💰" color={C.g}/>
      <KPICard label="Total Compras" value={`$${fN(totalPurchases)}`} sub={`${purchasesF.length} facturas`} icon="📦" color={C.b}/>
      <KPICard label="Total Gastos" value={`$${fN(totalExpenses)}`} sub={`${expensesF.length} registros`} icon="💸" color={C.o}/>
      <KPICard label="Margen Bruto" value={`$${fN(totalSales-totalPurchases)}`} sub={totalSales>0?`${f1((totalSales-totalPurchases)/totalSales*100)}%`:'—'} icon="📈" color={(totalSales-totalPurchases)>=0?C.g:C.r}/>
      <KPICard label="Resultado Neto" value={`$${fN(netResult)}`} sub="ventas - compras - gastos" icon={netResult>=0?'🟢':'🔴'} color={netResult>=0?C.g:C.r}/>
    </div>

    {/* Trend Chart */}
    {chartData.length>0&&(<div style={{...card({padding:20}),marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📈 Tendencia: Ventas vs Gastos</div>
      <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Comparativa diaria en el período</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.bd}/>
          <XAxis dataKey="date" tick={{fontSize:10,fill:C.t3}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:10,fill:C.t3}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
          <Tooltip formatter={(v,n)=>[`$${fN(v)}`,n==='ventas'?'Ventas':'Gastos']} contentStyle={{borderRadius:8,border:`1px solid ${C.bd}`,fontSize:12}}/>
          <Line type="monotone" dataKey="ventas" stroke={C.g} strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
          <Line type="monotone" dataKey="gastos" stroke={C.o} strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
        </LineChart>
      </ResponsiveContainer>
      <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8}}>
        <div style={{display:'flex',gap:6,alignItems:'center',fontSize:12}}><div style={{width:16,height:3,background:C.g,borderRadius:2}}/><span style={{color:C.t2}}>Ventas</span></div>
        <div style={{display:'flex',gap:6,alignItems:'center',fontSize:12}}><div style={{width:16,height:3,background:C.o,borderRadius:2}}/><span style={{color:C.t2}}>Gastos</span></div>
      </div>
    </div>)}

    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {tabs.map(([v,l])=>(<button key={v} onClick={()=>setTab(v)} style={{padding:'8px 16px',background:tab===v?C.pr:'#fff',color:tab===v?'#fff':C.t2,border:`1.5px solid ${tab===v?C.pr:C.bd}`,borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600}}>{l}</button>))}
    </div>

    {tab==='ventas'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={card({padding:20})}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Top Productos por Ventas</div>
        {topChartData.length>0&&<ResponsiveContainer width="100%" height={200}>
          <BarChart data={topChartData} margin={{top:0,right:0,left:0,bottom:40}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.bd}/>
            <XAxis dataKey="name" tick={{fontSize:10,fill:C.t3}} angle={-30} textAnchor="end" axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:10,fill:C.t3}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
            <Tooltip formatter={v=>[`$${fN(v)}`,'Ventas']} contentStyle={{borderRadius:8,border:`1px solid ${C.bd}`,fontSize:12}}/>
            <Bar dataKey="total" fill={C.pr} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>}
        <div style={{marginTop:topChartData.length>0?16:0}}>
          {topProducts.map(([pid,v])=>(<div key={pid} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px dashed ${C.bd}`,fontSize:13}}><span>{pName(st.products,pid)}</span><div style={{textAlign:'right'}}><span style={{fontWeight:700,color:C.g}}>${fN(v.total)}</span><span style={{color:C.t3,marginLeft:8,fontSize:11}}>{v.qty} u.</span></div></div>))}
          {topProducts.length===0&&<EmptyState icon="📊" title="Sin ventas" sub="No hay datos para el período"/>}
        </div>
      </div>
      <div style={card({padding:20})}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Ventas por Día</div>
        {Object.keys(salesByDay).length===0?<EmptyState icon="📅" title="Sin datos" sub="No hay ventas en el período"/>
        :<table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Fecha</th><th style={{...TH,textAlign:'right'}}>Total</th><th style={TH}>Barra</th></tr></thead>
          <tbody>{Object.entries(salesByDay).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,total])=>(<tr key={date}><td style={TD}>{date}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:C.g}}>${fN(total)}</td><td style={TD}><div style={{background:`${C.g}22`,height:6,borderRadius:3,width:'100%'}}><div style={{background:C.g,height:6,borderRadius:3,width:`${total/Math.max(...Object.values(salesByDay))*100}%`}}/></div></td></tr>))}
          </tbody>
        </table>}
      </div>
    </div>)}

    {tab==='canales'&&(<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
      {Object.values(salesByPM).map(pm=>(<div key={pm.name} style={{...card({padding:20}),borderTop:`4px solid ${pm.color}`}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{pm.name}</div>
        <div style={{fontSize:32,fontWeight:900,color:pm.color}}>${fN(pm.total)}</div>
        <div style={{fontSize:13,color:C.t3,marginTop:4}}>{pm.count} transacciones</div>
        <div style={{marginTop:8,height:6,background:`${pm.color}22`,borderRadius:3}}><div style={{height:6,background:pm.color,borderRadius:3,width:`${totalSales>0?pm.total/totalSales*100:0}%`}}/></div>
        <div style={{fontSize:12,color:C.t3,marginTop:4}}>{f1(totalSales>0?pm.total/totalSales*100:0)}% del total</div>
      </div>))}
    </div>)}

    {tab==='margen'&&(<div>
      <div style={{marginBottom:12,fontSize:13,color:C.t2}}>Análisis de margen y rentabilidad por producto en el período seleccionado.</div>
      {marginData.length===0?<EmptyState icon="📊" title="Sin datos de margen" sub="Agrega productos con precio de venta y costo"/>
      :<div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Producto</th><th style={{...TH,textAlign:'right'}}>Costo</th><th style={{...TH,textAlign:'right'}}>Precio</th><th style={{...TH,textAlign:'right'}}>Margen %</th><th style={{...TH,textAlign:'right'}}>Vendido</th><th style={{...TH,textAlign:'right'}}>Ganancia</th></tr></thead>
          <tbody>{marginData.map(p=>(<tr key={p.code}><td style={{...TD,fontWeight:600}}>{p.name}</td><td style={{...TD,textAlign:'right'}}>${f2(p.cost)}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:C.g}}>${f2(p.price)}</td><td style={{...TD,textAlign:'right'}}><Badge txt={`${f1(p.margin)}%`} color={p.margin>=50?C.g:p.margin>=20?C.a:C.r}/></td><td style={{...TD,textAlign:'right',color:C.t2}}>{p.soldQty>0?`${p.soldQty} u. ($${fN(p.sold)})`:'—'}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:p.profit>0?C.g:C.t3}}>{p.profit>0?`$${fN(p.profit)}`:'—'}</td></tr>))}</tbody>
          <tfoot><tr style={{background:'#FAFBFD',fontWeight:700}}><td style={TD} colSpan={5}>Ganancia Total del Período</td><td style={{...TD,textAlign:'right',color:C.g,fontSize:15}}>${fN(marginData.reduce((a,p)=>a+p.profit,0))}</td></tr></tfoot>
        </table>
      </div>}
    </div>)}

    {tab==='gastos_r'&&(<div>
      {Object.keys(expByCategory).length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16}}>
        {Object.entries(expByCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(<div key={cat} style={{...card({padding:16}),borderLeft:`3px solid ${C.o}`}}><div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>{cat}</div><div style={{fontSize:22,fontWeight:800,color:C.o}}>${fN(amt)}</div><div style={{fontSize:11,color:C.t3}}>{f1(totalExpenses>0?amt/totalExpenses*100:0)}% del total</div></div>))}
      </div>}
      {expensesF.length===0?<EmptyState icon="💸" title="Sin gastos en el período" sub="Registra gastos en el módulo de Gastos Operativos"/>
      :<div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Fecha</th><th style={TH}>Categoría</th><th style={TH}>Descripción</th><th style={{...TH,textAlign:'right'}}>Monto USD</th></tr></thead>
          <tbody>{expensesF.map(e=>(<tr key={e.id}><td style={TD}>{e.date}</td><td style={TD}><Badge txt={e.category} color={C.o}/></td><td style={{...TD,color:C.t2}}>{e.description}</td><td style={{...TD,textAlign:'right',fontWeight:700,color:C.o}}>${fN(e.amount_usd)}</td></tr>))}</tbody>
          <tfoot><tr style={{background:'#FAFBFD',fontWeight:700}}><td style={TD} colSpan={3}>TOTAL GASTOS</td><td style={{...TD,textAlign:'right',color:C.o,fontSize:15}}>${fN(totalExpenses)}</td></tr></tfoot>
        </table>
      </div>}
    </div>)}

    {tab==='produccion'&&(<div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={TH}>Fecha</th><th style={TH}>Fórmula</th><th style={{...TH,textAlign:'center'}}>Esperado</th><th style={{...TH,textAlign:'center'}}>Obtenido</th><th style={{...TH,textAlign:'center'}}>Merma</th><th style={{...TH,textAlign:'right'}}>Costo</th></tr></thead>
        <tbody>{prodsF.length===0?<tr><td colSpan={6}><EmptyState icon="🏭" title="Sin producciones" sub="No hay registros para el período"/></td></tr>
        :prodsF.map(r=>(<tr key={r.id}><td style={TD}>{r.date}</td><td style={{...TD,fontWeight:600}}>{r.formula_name}</td><td style={{...TD,textAlign:'center'}}>{r.expected_yield}</td><td style={{...TD,textAlign:'center',fontWeight:700,color:C.g}}>{r.actual_yield}</td><td style={{...TD,textAlign:'center'}}><Badge txt={`${f1(r.merma_pct)}%`} color={r.merma_pct>10?C.r:r.merma_pct>5?C.a:C.g}/></td><td style={{...TD,textAlign:'right'}}>${fN(r.cost_total||0)}</td></tr>))}
        </tbody>
      </table>
    </div>)}
  </div>);
}

// ── CLIENTES ──────────────────────────────────────────────────────────
function Clientes({st,dispatch}){
  const[showForm,setShowForm]=useState(false);
  const[editing,setEditing]=useState(null);
  const[search,setSearch]=useState('');
  const[ToastEl,showToast]=useToast();
  const clients=st.clients||[];

  function openEdit(c){setEditing(c||{id:uid(),name:'',phone:'',email:'',type:'regular',notes:'',active:true,total_purchases:0,last_purchase:''});setShowForm(true);}
  function save(c){const exists=clients.find(x=>x.id===c.id);dispatch(exists?{type:'UPD_CLIENT',p:c}:{type:'ADD_CLIENT',p:c});showToast('Cliente guardado');setShowForm(false);setEditing(null);}

  const filtered=clients.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search)||c.email?.toLowerCase().includes(search.toLowerCase()));

  return(<div>{ToastEl}
    <PageHeader title="Clientes" sub="Gestión de cartera de clientes">
      <button style={bPr} onClick={()=>openEdit(null)}>+ Nuevo Cliente</button>
    </PageHeader>

    <div style={{...card(),padding:'14px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
      <input style={{...inp,flex:1}} placeholder="🔍 Buscar por nombre, teléfono o email..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(filtered.map(c=>({Nombre:c.name,Teléfono:c.phone||'',Email:c.email||'',Tipo:c.type,Compras:f2(c.total_purchases||0),ÚltimaCompra:c.last_purchase||'',Notas:c.notes||'',Estado:c.active?'Activo':'Inactivo'})),'clientes.csv')}>⬇ CSV</button>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
      <KPICard label="Total Clientes" value={clients.filter(c=>c.active!==false).length} sub="activos" icon="👥" color={C.pr}/>
      <KPICard label="Total Facturado" value={`$${fN(clients.reduce((a,c)=>a+c.total_purchases||0,0))}`} sub="a clientes registrados" icon="💰" color={C.g}/>
      <KPICard label="Cliente Top" value={clients.length>0?clients.reduce((a,b)=>(a.total_purchases||0)>(b.total_purchases||0)?a:b,clients[0])?.name||'—':'—'} sub="mayor volumen" icon="⭐" color={C.a}/>
    </div>

    {filtered.length===0?<EmptyState icon="👥" title="Sin clientes" sub="Agrega el primer cliente"/>
    :<div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={TH}>Nombre</th><th style={TH}>Teléfono</th><th style={TH}>Email</th><th style={TH}>Tipo</th><th style={{...TH,textAlign:'right'}}>Compras</th><th style={TH}>Última Compra</th><th style={TH}>Notas</th><th style={{...TH,textAlign:'center'}}>Estado</th><th style={{...TH,textAlign:'center'}}>Acción</th></tr></thead>
        <tbody>{filtered.map(c=>(<tr key={c.id}>
          <td style={{...TD,fontWeight:700}}>{c.name}</td>
          <td style={TD}>{c.phone||'—'}</td>
          <td style={{...TD,fontSize:12,color:C.t2}}>{c.email||'—'}</td>
          <td style={TD}><Badge txt={c.type||'regular'} color={c.type==='vip'?C.p:c.type==='mayorista'?C.b:C.t2}/></td>
          <td style={{...TD,textAlign:'right',fontWeight:700,color:C.g}}>${fN(c.total_purchases||0)}</td>
          <td style={{...TD,color:C.t3,fontSize:12}}>{c.last_purchase||'—'}</td>
          <td style={{...TD,color:C.t3,fontSize:12,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>{c.notes||'—'}</td>
          <td style={{...TD,textAlign:'center'}}><Badge txt={c.active!==false?'Activo':'Inactivo'} color={c.active!==false?C.g:C.t3}/></td>
          <td style={{...TD,textAlign:'center'}}>
            <div style={{display:'flex',gap:5,justifyContent:'center'}}>
              <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>openEdit(c)}>Editar</button>
              <button style={bSm(c.active!==false?C.rL:C.gL,c.active!==false?C.r:C.g,c.active!==false?C.rT:C.gT)} onClick={()=>{dispatch({type:'UPD_CLIENT',p:{...c,active:!(c.active!==false)}});showToast('Estado actualizado');}}>
                {c.active!==false?'Desact.':'Activar'}
              </button>
            </div>
          </td>
        </tr>))}</tbody>
      </table>
    </div>}
    {showForm&&editing&&(<Modal title={editing.name?`Editar: ${editing.name}`:'Nuevo Cliente'} onClose={()=>{setShowForm(false);setEditing(null);}} footer={<><button style={bSc} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancelar</button><button style={bPr} onClick={()=>save(editing)}>Guardar</button></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nombre completo</label><input style={inp} value={editing.name} onChange={e=>setEditing(x=>({...x,name:e.target.value}))} placeholder="Nombre del cliente"/></div>
        <div><label style={lbl}>Teléfono</label><input style={inp} value={editing.phone||''} onChange={e=>setEditing(x=>({...x,phone:e.target.value}))} placeholder="0412-1234567"/></div>
        <div><label style={lbl}>Email</label><input type="email" style={inp} value={editing.email||''} onChange={e=>setEditing(x=>({...x,email:e.target.value}))} placeholder="correo@ejemplo.com"/></div>
        <div><label style={lbl}>Tipo de cliente</label><select style={sel} value={editing.type||'regular'} onChange={e=>setEditing(x=>({...x,type:e.target.value}))}>
          <option value="regular">Regular</option><option value="vip">VIP</option><option value="mayorista">Mayorista</option><option value="ocasional">Ocasional</option>
        </select></div>
        <div><label style={lbl}>Estado</label><select style={sel} value={editing.active!==false?'true':'false'} onChange={e=>setEditing(x=>({...x,active:e.target.value==='true'}))}><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notas</label><input style={inp} value={editing.notes||''} onChange={e=>setEditing(x=>({...x,notes:e.target.value}))} placeholder="Observaciones, preferencias, horarios..."/></div>
      </div>
    </Modal>)}
  </div>);
}

// ── GASTOS OPERATIVOS ─────────────────────────────────────────────────
const EXPENSE_CATS=['Electricidad','Alquiler','Agua','Teléfono/Internet','Gas','Insumos Limpieza','Mantenimiento','Transporte','Publicidad','Sueldos','Otros'];

function Gastos({st,dispatch}){
  const[showForm,setShowForm]=useState(false);
  const[editing,setEditing]=useState(null);
  const[dateFilter,setDateFilter]=useState(thisMonth());
  const[ToastEl,showToast]=useToast();
  const expenses=st.expenses||[];

  const filtered=dateFilter?expenses.filter(e=>e.date.startsWith(dateFilter)):expenses;
  const{paged,page,setPage,totalPages}=usePagination(filtered,15);
  const totalFiltered=filtered.reduce((a,e)=>a+e.amount_usd,0);
  const byCategory={};filtered.forEach(e=>{if(!byCategory[e.category])byCategory[e.category]=0;byCategory[e.category]+=e.amount_usd;});
  const ves=Object.values(st.currencies||{}).find(c=>c.code==='VES');

  function openEdit(e){setEditing(e||{id:uid(),date:todayISO(),category:'Electricidad',description:'',amount_usd:'',amount_ves:''});setShowForm(true);}
  function save(e){const exists=expenses.find(x=>x.id===e.id);dispatch(exists?{type:'UPD_EXPENSE',p:{...e,amount_usd:Number(e.amount_usd)}}:{type:'ADD_EXPENSE',p:{...e,id:uid(),amount_usd:Number(e.amount_usd)}});showToast('Gasto guardado');setShowForm(false);setEditing(null);}

  return(<div>{ToastEl}
    <PageHeader title="Gastos Operativos" sub="Registro y control de gastos del negocio">
      <button style={bPr} onClick={()=>openEdit(null)}>+ Registrar Gasto</button>
    </PageHeader>

    <div style={{...card(),padding:'14px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
      <div><label style={lbl}>Filtrar por mes</label><input type="month" style={{...inp,width:'auto'}} value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></div>
      <button style={bSm(C.bd,C.t2,C.bd)} onClick={()=>setDateFilter('')}>Ver todos</button>
      {dateFilter&&<div style={{fontSize:13,color:C.t3}}>{filtered.length} gastos · <strong style={{color:C.o}}>${fN(totalFiltered)}</strong></div>}
      <button style={{...bSm(C.gL,C.g,C.gT),marginLeft:'auto'}} onClick={()=>exportCSV(filtered.map(e=>({Fecha:e.date,Categoría:e.category,Descripción:e.description,MontoUSD:f2(e.amount_usd)})),'gastos.csv')}>⬇ CSV</button>
    </div>

    {/* Category summary */}
    {Object.keys(byCategory).length>0&&(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:10,marginBottom:16}}>
      {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(<div key={cat} style={{...card({padding:14}),borderLeft:`3px solid ${C.o}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',marginBottom:4}}>{cat}</div>
        <div style={{fontSize:20,fontWeight:800,color:C.o}}>${fN(amt)}</div>
        {ves&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>{ves.symbol}{fN(amt*ves.rate)}</div>}
        <div style={{fontSize:11,color:C.t3}}>{f1(totalFiltered>0?amt/totalFiltered*100:0)}% del total</div>
      </div>))}
    </div>)}

    <div style={card({padding:0,overflow:'hidden'})}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th style={TH}>Fecha</th><th style={TH}>Categoría</th><th style={TH}>Descripción</th><th style={{...TH,textAlign:'right'}}>Monto USD</th><th style={{...TH,textAlign:'right'}}>En Bs.</th><th style={{...TH,textAlign:'center'}}>Acciones</th></tr></thead>
        <tbody>
          {paged.length===0?<tr><td colSpan={6}><EmptyState icon="💸" title="Sin gastos" sub="Registra el primer gasto operativo"/></td></tr>
          :paged.map(e=>(<tr key={e.id}>
            <td style={TD}>{e.date}</td>
            <td style={TD}><Badge txt={e.category} color={C.o}/></td>
            <td style={{...TD,color:C.t2}}>{e.description}</td>
            <td style={{...TD,textAlign:'right',fontWeight:700,color:C.o}}>${fN(e.amount_usd)}</td>
            <td style={{...TD,textAlign:'right',color:C.t3,fontSize:12}}>{ves?`${ves.symbol}${fN(e.amount_usd*ves.rate)}`:'—'}</td>
            <td style={{...TD,textAlign:'center'}}>
              <div style={{display:'flex',gap:5,justifyContent:'center'}}>
                <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>openEdit(e)}>Editar</button>
                <button style={bDgr} onClick={()=>{if(confirm('¿Eliminar este gasto?'))dispatch({type:'DEL_EXPENSE',id:e.id});}}>✕</button>
              </div>
            </td>
          </tr>))}
        </tbody>
        {paged.length>0&&(<tfoot><tr style={{background:'#FAFBFD',fontWeight:700}}>
          <td style={TD} colSpan={3}>TOTAL ({filtered.length} registros)</td>
          <td style={{...TD,textAlign:'right',color:C.o,fontSize:15}}>${fN(totalFiltered)}</td>
          <td style={TD} colSpan={2}/>
        </tr></tfoot>)}
      </table>
      <Pagination page={page} totalPages={totalPages} setPage={setPage}/>
    </div>

    {showForm&&editing&&(<Modal title={editing.description?`Editar: ${editing.description}`:'Nuevo Gasto'} onClose={()=>{setShowForm(false);setEditing(null);}} footer={<><button style={bSc} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancelar</button><button style={bPr} onClick={()=>save(editing)}>Guardar</button></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={editing.date} onChange={e=>setEditing(x=>({...x,date:e.target.value}))}/></div>
        <div><label style={lbl}>Categoría</label><select style={sel} value={editing.category} onChange={e=>setEditing(x=>({...x,category:e.target.value}))}>{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Descripción</label><input style={inp} value={editing.description} onChange={e=>setEditing(x=>({...x,description:e.target.value}))} placeholder="Factura CORPOELEC, pago de arrendamiento..."/></div>
        <div>
          <label style={lbl}>Monto (USD)</label>
          <input type="number" step="0.01" style={inp} value={editing.amount_usd} onChange={e=>{const v=e.target.value;setEditing(x=>({...x,amount_usd:v,amount_ves:f2(Number(v)*(ves?.rate||1))}));}} placeholder="0.00"/>
        </div>
        <div>
          <label style={lbl}>Equivalente en Bs. (auto)</label>
          <div style={{...inp,background:'#FAFBFD',color:C.t2}}>{ves?`${ves.symbol}${fN(Number(editing.amount_usd||0)*ves.rate)}`:'—'}</div>
        </div>
      </div>
    </Modal>)}
  </div>);
}

// ── EMPLEADOS ─────────────────────────────────────────────────────────
function Empleados({st,dispatch}){
  const[showForm,setShowForm]=useState(false);
  const[editing,setEditing]=useState(null);
  const[search,setSearch]=useState('');
  const[selectedEmp,setSelectedEmp]=useState(null); // For deduction detail view
  const[deleteConfirm,setDeleteConfirm]=useState(null); // id pendiente de confirmar eliminación
  const[deductMonth,setDeductMonth]=useState(thisMonth());
  const[ToastEl,showToast]=useToast();
  const employees=st.employees||[];

  function downloadMonthlyRecord(emp){
    const month=deductMonth;
    const deds=(emp.salary_deductions||[]).filter(d=>d.date&&d.date.startsWith(month));
    const totalDed=deds.reduce((a,d)=>a+d.amount_usd,0);
    const netSalary=Number(emp.salary_usd||0)-totalDed;
    const rows=[
      {Campo:'Empleado',Valor:emp.name},
      {Campo:'Cargo',Valor:emp.position||''},
      {Campo:'Mes',Valor:month},
      {Campo:'Salario Base USD',Valor:f2(emp.salary_usd||0)},
      {Campo:'Total Descuentos USD',Valor:f2(totalDed)},
      {Campo:'Neto a Pagar USD',Valor:f2(netSalary)},
      {Campo:'---Detalle de Descuentos---',Valor:''},
      ...deds.map(d=>({Campo:d.date,Valor:`$${f2(d.amount_usd)} — ${d.items_desc} (Fact. ${d.sale_id.slice(-6)})`}))
    ];
    exportCSV(rows,`pago_${emp.name.replace(/\s/g,'_')}_${month}.csv`);
    showToast(`Reporte de ${emp.name} descargado`);
  }

  function openEdit(e){setEditing(e||{id:uid(),name:'',position:'',phone:'',hire_date:todayISO(),salary_usd:'',status:'activo',notes:''});setShowForm(true);}
  function save(e){const exists=employees.find(x=>x.id===e.id);dispatch(exists?{type:'UPD_EMPLOYEE',p:e}:{type:'ADD_EMPLOYEE',p:e});showToast('Empleado guardado');setShowForm(false);setEditing(null);}

  const filtered=employees.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.position?.toLowerCase().includes(search.toLowerCase()));

  return(<div>{ToastEl}
    <PageHeader title="Empleados" sub="Gestión del personal de la panadería">
      <button style={bPr} onClick={()=>openEdit(null)}>+ Nuevo Empleado</button>
    </PageHeader>

    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
      <KPICard label="Personal Total" value={employees.filter(e=>e.status==='activo').length} sub="activos" icon="👤" color={C.pr}/>
      <KPICard label="Nómina Estimada" value={`$${fN(employees.filter(e=>e.status==='activo').reduce((a,e)=>a+Number(e.salary_usd||0),0))}`} sub="mensual en USD" icon="💰" color={C.g}/>
      <KPICard label="Departamentos" value={new Set(employees.map(e=>e.position||'Sin cargo')).size} sub="cargos distintos" icon="🏢" color={C.b}/>
    </div>

    <div style={{...card(),padding:'14px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <input style={{...inp,flex:1,minWidth:180}} placeholder="🔍 Buscar por nombre o cargo..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:12,color:C.t3,whiteSpace:'nowrap'}}>Mes reportes:</span>
        <input type="month" style={{...inp,width:'auto'}} value={deductMonth} onChange={e=>setDeductMonth(e.target.value)}/>
      </div>
      <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(filtered.map(e=>({Nombre:e.name,Cargo:e.position||'',Teléfono:e.phone||'',FechaIngreso:e.hire_date||'',SalarioUSD:f2(e.salary_usd||0),Estado:e.status||'activo',Notas:e.notes||''})),'empleados.csv')}>⬇ CSV Nómina</button>
    </div>

    {filtered.length===0?<EmptyState icon="👤" title="Sin empleados" sub="Agrega el primer empleado"/>
    :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {filtered.map(e=>(<div key={e.id} style={card({padding:0,overflow:'hidden',borderTop:`3px solid ${e.status==='activo'?C.g:C.t3}`})}>
        <div style={{padding:'16px 18px',borderBottom:`1px solid ${C.bd}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:C.t1}}>{e.name}</div>
              <div style={{fontSize:12,color:C.t3,marginTop:2}}>{e.position||'Sin cargo asignado'}</div>
            </div>
            <Badge txt={e.status==='activo'?'Activo':'Inactivo'} color={e.status==='activo'?C.g:C.t3}/>
          </div>
        </div>
        <div style={{padding:'12px 18px',display:'flex',flexDirection:'column',gap:6}}>
          {e.phone&&<div style={{display:'flex',gap:8,fontSize:13}}><span style={{color:C.t3}}>📞</span><span style={{color:C.t2}}>{e.phone}</span></div>}
          {e.hire_date&&<div style={{display:'flex',gap:8,fontSize:13}}><span style={{color:C.t3}}>📅</span><span style={{color:C.t2}}>Ingreso: {e.hire_date}</span></div>}
          {e.salary_usd&&<div style={{display:'flex',gap:8,fontSize:13}}><span style={{color:C.t3}}>💵</span><span style={{fontWeight:700,color:C.g}}>${fN(e.salary_usd)} / mes</span></div>}
          {e.notes&&<div style={{fontSize:12,color:C.t3,marginTop:4}}>{e.notes}</div>}
        </div>
        {/* Monthly deductions summary */}
        {(e.salary_deductions||[]).length>0&&(()=>{
          const monthDeds=(e.salary_deductions||[]).filter(d=>d.date?.startsWith(deductMonth));
          const totalDed=monthDeds.reduce((a,d)=>a+d.amount_usd,0);
          return totalDed>0?(<div style={{padding:'10px 18px',background:C.oL,borderTop:`1px solid ${C.o}44`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.o,marginBottom:3}}>💼 Descuentos {deductMonth}</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
              <span style={{color:C.t2}}>{monthDeds.length} facturas · Desc: <b>${fN(totalDed)}</b></span>
              <span style={{fontWeight:700,color:C.g}}>Neto: ${fN(Number(e.salary_usd||0)-totalDed)}</span>
            </div>
          </div>):null;
        })()}
        <div style={{padding:'12px 18px',borderTop:`1px solid ${C.bd}`,display:'flex',gap:6,flexWrap:'wrap'}}>
          <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>openEdit(e)}>Editar</button>
          <button style={bSm(e.status==='activo'?C.rL:C.gL,e.status==='activo'?C.r:C.g,e.status==='activo'?C.rT:C.gT)} onClick={()=>{dispatch({type:'UPD_EMPLOYEE',p:{...e,status:e.status==='activo'?'inactivo':'activo'}});showToast('Estado actualizado');}}>
            {e.status==='activo'?'Dar de Baja':'Reactivar'}
          </button>
          {deleteConfirm===e.id
            ?<button style={{...bSm('#DC2626','#fff','#DC2626'),background:'#DC2626',fontWeight:800}}
                onClick={()=>{dispatch({type:'DEL_EMPLOYEE',id:e.id});setDeleteConfirm(null);showToast(`${e.name} eliminado definitivamente`);}}>
                ⚠ ¿Confirmar? Se borra TODO
              </button>
            :<button style={bSm(C.rL,C.r,C.rT)} onClick={()=>{setDeleteConfirm(e.id);setTimeout(()=>setDeleteConfirm(c=>c===e.id?null:c),4000);}}>
                🗑 Eliminar
              </button>}
          {(e.salary_deductions||[]).length>0&&<button style={bSm(C.gL,C.g,C.gT)} onClick={()=>downloadMonthlyRecord(e)}>⬇ Reporte</button>}
          {(e.salary_deductions||[]).length>0&&<button style={bSm(C.bL,C.b,C.bT)} onClick={()=>setSelectedEmp(selectedEmp?.id===e.id?null:e)}>📋 Historial</button>}
        </div>
        {/* Deduction history expandable */}
        {selectedEmp?.id===e.id&&(<div style={{padding:'12px 18px',background:'#FAFBFD',borderTop:`1px solid ${C.bd}`,maxHeight:200,overflowY:'auto'}}>
          <div style={{fontWeight:700,fontSize:12,color:C.t3,marginBottom:6}}>DESCUENTOS REGISTRADOS</div>
          {(e.salary_deductions||[]).slice(0,20).map(d=>(<div key={d.id} style={{fontSize:11,display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${C.bd}`}}>
            <div><span style={{color:C.t3}}>{d.date}</span> · <span style={{color:C.t2}}>{d.items_desc}</span></div>
            <span style={{fontWeight:700,color:C.o}}>${fN(d.amount_usd)}</span>
          </div>))}
        </div>)}
      </div>))}
    </div>}

    {showForm&&editing&&(<Modal title={editing.name?`Editar: ${editing.name}`:'Nuevo Empleado'} onClose={()=>{setShowForm(false);setEditing(null);}} footer={<><button style={bSc} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancelar</button><button style={bPr} onClick={()=>save(editing)}>Guardar</button></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nombre completo</label><input style={inp} value={editing.name} onChange={e=>setEditing(x=>({...x,name:e.target.value}))} placeholder="Nombre del empleado"/></div>
        <div><label style={lbl}>Cargo / Posición</label><input style={inp} value={editing.position||''} onChange={e=>setEditing(x=>({...x,position:e.target.value}))} placeholder="Panadero, Cajero, Asistente..."/></div>
        <div><label style={lbl}>Teléfono</label><input style={inp} value={editing.phone||''} onChange={e=>setEditing(x=>({...x,phone:e.target.value}))} placeholder="0412-0000000"/></div>
        <div><label style={lbl}>Fecha de Ingreso</label><input type="date" style={inp} value={editing.hire_date||''} onChange={e=>setEditing(x=>({...x,hire_date:e.target.value}))}/></div>
        <div><label style={lbl}>Salario mensual (USD)</label><input type="number" step="0.01" style={inp} value={editing.salary_usd||''} onChange={e=>setEditing(x=>({...x,salary_usd:e.target.value}))} placeholder="0.00"/></div>
        <div><label style={lbl}>Estado</label><select style={sel} value={editing.status||'activo'} onChange={e=>setEditing(x=>({...x,status:e.target.value}))}><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="vacaciones">Vacaciones</option><option value="licencia">Licencia</option></select></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notas</label><input style={inp} value={editing.notes||''} onChange={e=>setEditing(x=>({...x,notes:e.target.value}))} placeholder="Habilidades, turno, observaciones..."/></div>
      </div>
    </Modal>)}
  </div>);
}

// ── CONFIGURACIÓN ──────────────────────────────────────────────────────
function Configuracion({st,dispatch}){
  const[tab,setTab]=useState('currencies');
  const[curs,setCurs]=useState(st.currencies);
  const[showAddSup,setShowAddSup]=useState(false);
  const[supForm,setSupForm]=useState({id:'',code:'',name:'',contact:'',rif:'',category:'',active:true});
  const[fetchingRates,setFetchingRates]=useState(false);
  const[userModal,setUserModal]=useState(null); // null | user object being edited/created
  const[resetConfirm,setResetConfirm]=useState(false);
  const[ToastEl,showToast]=useToast();
  const fileRef=useRef();

  const isAdmin=st.current_role==='admin';

  function saveUser(){
    const u=userModal;
    if(!u.name||!u.password){showToast('Nombre y contraseña son obligatorios');return;}
    const exists=st.users.find(x=>x.id===u.id);
    dispatch(exists?{type:'UPD_USER',p:u}:{type:'ADD_USER',p:u});
    showToast(exists?'Usuario actualizado':'Usuario creado');
    setUserModal(null);
  }
  function deleteUser(u){
    if(u.id===st.current_user?.id){showToast('No puedes eliminar tu propio usuario');return;}
    const admins=st.users.filter(x=>x.role==='admin'&&x.active!==false&&x.id!==u.id);
    if(u.role==='admin'&&admins.length===0){showToast('Debe existir al menos un administrador');return;}
    dispatch({type:'DEL_USER',id:u.id,name:u.name});
    showToast('Usuario eliminado');
  }

  useEffect(()=>setCurs(st.currencies),[st.currencies]);
  const setCurField=(k,f,v)=>setCurs(p=>({...p,[k]:{...p[k],[f]:v}}));

  function saveCurrencies(){dispatch({type:'SET_CURRENCIES',p:curs});showToast('Tasas de cambio actualizadas');}

  async function handleFetchRates(){
    setFetchingRates(true);
    try{
      const rates=await fetchRates();
      setCurs(p=>({
        ...p,
        eur:{...p.eur,rate:Number((rates['EUR']||0.93).toFixed(4))},
        ves:{...p.ves,rate:Number((rates['VES']||36.5).toFixed(2))},
      }));
      showToast('Tasas actualizadas desde API ✓','success');
    }catch(e){showToast('Error al obtener tasas. Verifica tu conexión.','error');}
    setFetchingRates(false);
  }

  function saveSup(){
    const existing=st.suppliers.find(s=>s.id===supForm.id);
    dispatch(existing?{type:'UPD_SUPPLIER',p:supForm}:{type:'ADD_SUPPLIER',p:{...supForm,id:uid()}});
    showToast('Proveedor guardado');setShowAddSup(false);
  }

  function handleBackup(){
    downloadJSON(st,`panaderia-backup-${todayISO()}.json`);
    showToast('Backup descargado correctamente');
  }

  function handleRestore(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.products&&data.sales&&data.formulas){dispatch({type:'LOAD',p:data});showToast('Datos restaurados correctamente','success');}
        else{showToast('Archivo de backup inválido.','error');}
      }catch{showToast('Error al leer el archivo.','error');}
    };
    reader.readAsText(file);
    e.target.value='';
  }

  const CUR_CONFIG=[{k:'usd',label:'Dólar (Base)',locked:true},{k:'eur',label:'Euro'},{k:'ves',label:'Bolívar Oficial'},{k:'ves_int',label:'Cambio Interno'}];
  const audit_log=st.audit_log||[];
  const{paged:logPaged,page:logPage,setPage:setLogPage,totalPages:logPages}=usePagination(audit_log,20);

  return(<div>{ToastEl}
    <PageHeader title="Configuración" sub="Ajustes del sistema, monedas, backup y roles"/>

    <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
      {[['currencies','💱 Tasas'],['users','🔐 Usuarios'],['suppliers','🏢 Proveedores'],['roles','👤 Roles'],['backup','💾 Backup'],['audit','📋 Historial']].map(([v,l])=>(
        <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 16px',background:tab===v?C.pr:'#fff',color:tab===v?'#fff':C.t2,border:`1.5px solid ${tab===v?C.pr:C.bd}`,borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>{l}</button>
      ))}
    </div>

    {tab==='users'&&(<div>
      {!isAdmin
      ?<div style={{...card({padding:24}),textAlign:'center',color:C.t3}}>🔒 Solo el administrador puede gestionar usuarios.</div>
      :<>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:13,color:C.t2}}>Cada persona necesita su usuario y contraseña para entrar al sistema.</div>
          <button style={bPr} onClick={()=>setUserModal({id:uid(),name:'',username:'',password:'',role:'cajero',active:true})}>+ Nuevo Usuario</button>
        </div>
        <div style={card({padding:0,overflow:'hidden'})}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th style={TH}>Nombre</th><th style={TH}>Rol</th><th style={{...TH,textAlign:'center'}}>Estado</th><th style={{...TH,textAlign:'center'}}>Acciones</th></tr></thead>
            <tbody>{(st.users||[]).map(u=>(<tr key={u.id}>
              <td style={{...TD,fontWeight:600}}>
                {u.name}
                {u.id===st.current_user?.id&&<Badge txt="Tú" color={C.pr}/>}
              </td>
              <td style={TD}><Badge txt={u.role==='admin'?'👑 Admin':u.role==='cajero'?'💵 Cajero':'🍞 Producción'} color={u.role==='admin'?C.pr:u.role==='cajero'?C.g:C.a}/></td>
              <td style={{...TD,textAlign:'center'}}>{u.active!==false?<Badge txt="Activo" color={C.g}/>:<Badge txt="Inactivo" color={C.t3}/>}</td>
              <td style={{...TD,textAlign:'center'}}>
                <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                  <button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>setUserModal({...u})}>Editar</button>
                  <button style={bSm(C.rL,C.r,C.rT)} onClick={()=>deleteUser(u)}>Eliminar</button>
                </div>
              </td>
            </tr>))}</tbody>
          </table>
        </div>
      </>}
    </div>)}

    {tab==='currencies'&&(<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:13,color:C.t2}}>Configura las tasas de cambio para mostrar equivalencias. El USD es la moneda base.</div>
        <button style={{...bSm(C.bL,C.b,C.bT),display:'flex',alignItems:'center',gap:6}} onClick={handleFetchRates} disabled={fetchingRates}>
          {fetchingRates?'⏳ Obteniendo...':'🌐 Tasas en Tiempo Real'}
        </button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
        {CUR_CONFIG.map(({k,label,locked})=>(<div key={k} style={{...card({padding:18}),borderTop:`3px solid ${locked?C.g:C.pr}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>{label}</div>
          {[['name','Nombre'],['code','Código'],['symbol','Símbolo']].map(([f,l])=>(<div key={f} style={{marginBottom:8}}>
            <label style={{...lbl,fontSize:11}}>{l}</label>
            <input style={{...inp,padding:'7px 10px',fontSize:12}} value={curs[k]?.[f]||''} onChange={e=>setCurField(k,f,e.target.value)} disabled={locked&&f==='code'}/>
          </div>))}
          <div>
            <label style={{...lbl,fontSize:11}}>Tasa vs USD</label>
            <input type="number" step="0.01" disabled={locked} style={{...inp,fontSize:16,fontWeight:700,color:C.pr,background:locked?'#FAFBFD':'#fff'}} value={curs[k]?.rate||1} onChange={e=>setCurField(k,'rate',Number(e.target.value))}/>
            {!locked&&<div style={{fontSize:11,color:C.t3,marginTop:3}}>1 USD = {f2(curs[k]?.rate)} {curs[k]?.code}</div>}
          </div>
        </div>))}
      </div>
      <button onClick={saveCurrencies} style={bPr}>💾 Guardar Tasas de Cambio</button>
    </div>)}

    {tab==='suppliers'&&(<div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button style={bPr} onClick={()=>{setSupForm({id:'',code:`PRV-${String(st.suppliers.length+1).padStart(3,'0')}`,name:'',contact:'',rif:'',category:'',active:true});setShowAddSup(true);}}>+ Nuevo Proveedor</button>
      </div>
      <div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Código</th><th style={TH}>Proveedor</th><th style={TH}>Contacto</th><th style={TH}>RIF</th><th style={TH}>Categoría</th><th style={{...TH,textAlign:'center'}}>Estado</th><th style={{...TH,textAlign:'center'}}>Acción</th></tr></thead>
          <tbody>
            {st.suppliers.map(s=>(<tr key={s.id}><td style={{...TD,fontFamily:'monospace',fontSize:12}}>{s.code}</td><td style={{...TD,fontWeight:700}}>{s.name}</td><td style={TD}>{s.contact||'—'}</td><td style={{...TD,fontFamily:'monospace',fontSize:12}}>{s.rif||'—'}</td><td style={TD}><Badge txt={s.category||'General'} color={C.b}/></td><td style={{...TD,textAlign:'center'}}><Badge txt={s.active?'Activo':'Inactivo'} color={s.active?C.g:C.t3}/></td><td style={{...TD,textAlign:'center'}}><button style={bSm(C.prL,C.pr,C.prT)} onClick={()=>{setSupForm({...s});setShowAddSup(true);}}>Editar</button></td></tr>))}
          </tbody>
        </table>
      </div>
      {showAddSup&&(<Modal title={supForm.id&&st.suppliers.find(s=>s.id===supForm.id)?`Editar: ${supForm.name}`:'Nuevo Proveedor'} onClose={()=>setShowAddSup(false)} footer={<><button style={bSc} onClick={()=>setShowAddSup(false)}>Cancelar</button><button style={bPr} onClick={saveSup}>Guardar Proveedor</button></>}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lbl}>Código</label><input style={inp} value={supForm.code} onChange={e=>setSupForm(x=>({...x,code:e.target.value}))}/></div>
          <div><label style={lbl}>Categoría</label><input style={inp} value={supForm.category} onChange={e=>setSupForm(x=>({...x,category:e.target.value}))} placeholder="Harinas, Lácteos..."/></div>
          <div style={{gridColumn:'1/-1'}}><label style={lbl}>Nombre del Proveedor</label><input style={inp} value={supForm.name} onChange={e=>setSupForm(x=>({...x,name:e.target.value}))}/></div>
          <div><label style={lbl}>Contacto / Teléfono</label><input style={inp} value={supForm.contact} onChange={e=>setSupForm(x=>({...x,contact:e.target.value}))}/></div>
          <div><label style={lbl}>RIF</label><input style={inp} value={supForm.rif} onChange={e=>setSupForm(x=>({...x,rif:e.target.value}))}/></div>
        </div>
      </Modal>)}
    </div>)}

    {tab==='roles'&&(<div>
      <div style={{...card({padding:24}),maxWidth:480}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Rol Activo</div>
        <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Cambia el rol para ver el sistema desde la perspectiva de cada perfil.</div>
        {[['admin','🔑 Administrador','Acceso completo a todos los módulos'],['cajero','💳 Cajero','Dashboard, Ventas, Caja y Clientes'],['produccion','🏭 Producción','Dashboard, Fórmulas, Producción e Inventario']].map(([r,l,desc])=>(
          <div key={r} onClick={()=>dispatch({type:'SET_ROLE',role:r})} style={{...card({padding:16}),marginBottom:10,cursor:'pointer',borderLeft:`4px solid ${st.current_role===r?C.pr:C.bd}`,background:st.current_role===r?C.prL:'#fff',transition:'all .15s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:st.current_role===r?C.pr:C.t1}}>{l}</div>
                <div style={{fontSize:12,color:C.t3,marginTop:2}}>{desc}</div>
              </div>
              {st.current_role===r&&<Badge txt="✓ Activo" color={C.pr}/>}
            </div>
          </div>
        ))}
      </div>
    </div>)}

    {tab==='backup'&&(<div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700}}>
        <div style={card({padding:24})}>
          <div style={{fontSize:20,textAlign:'center',marginBottom:12}}>💾</div>
          <div style={{fontWeight:700,fontSize:15,textAlign:'center',marginBottom:8}}>Exportar Backup</div>
          <div style={{fontSize:13,color:C.t3,textAlign:'center',marginBottom:20}}>Descarga todos los datos del sistema en formato JSON. Guárdalo en un lugar seguro.</div>
          <button onClick={handleBackup} style={{...bPr,width:'100%',justifyContent:'center',padding:'12px'}}>⬇ Descargar Backup</button>
          <div style={{fontSize:11,color:C.t3,textAlign:'center',marginTop:8}}>{todayISO()} · panaderia-backup-{todayISO()}.json</div>
        </div>
        <div style={card({padding:24})}>
          <div style={{fontSize:20,textAlign:'center',marginBottom:12}}>📂</div>
          <div style={{fontWeight:700,fontSize:15,textAlign:'center',marginBottom:8}}>Restaurar Backup</div>
          <div style={{fontSize:13,color:C.t3,textAlign:'center',marginBottom:20}}>Carga un archivo JSON previamente exportado. <strong style={{color:C.r}}>Reemplazará todos los datos actuales.</strong></div>
          <input type="file" accept=".json" ref={fileRef} style={{display:'none'}} onChange={handleRestore}/>
          <button onClick={()=>fileRef.current.click()} style={{...bSc,width:'100%',justifyContent:'center',padding:'12px'}}>📂 Seleccionar Archivo</button>
        </div>
      </div>
      <div style={{...card({padding:16}),marginTop:16,background:C.aL,border:`1px solid ${C.aT}`,maxWidth:700}}>
        <div style={{fontWeight:600,color:C.a,marginBottom:4}}>⚠️ Recomendaciones</div>
        <div style={{fontSize:13,color:C.t2}}>• Realiza backups diarios al final de la jornada<br/>• Guarda las copias en Google Drive o USB<br/>• Restaurar un backup eliminará todos los datos actuales — es irreversible</div>
      </div>
      {isAdmin&&(<div style={{...card({padding:16}),marginTop:16,background:'#FEF2F2',border:'1.5px solid #FECACA',maxWidth:700}}>
        <div style={{fontWeight:700,color:'#DC2626',marginBottom:6}}>🗑 Zona de Peligro — Iniciar operación real</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:12}}>Borra todas las <b>ventas, cierres de caja y movimientos de inventario</b> (útil para limpiar las pruebas antes de empezar a usar el sistema de verdad). Se conservan productos, fórmulas, clientes, empleados y usuarios.</div>
        {resetConfirm
          ?<div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button style={{background:'#DC2626',color:'#fff',border:'none',borderRadius:8,padding:'10px 18px',fontSize:13,fontWeight:800,cursor:'pointer'}}
                onClick={()=>{dispatch({type:'RESET_SALES_HISTORY'});setResetConfirm(false);showToast('Historial de ventas y cierres borrado');}}>
                ⚠ SÍ, BORRAR TODO EL HISTORIAL
              </button>
              <button style={bSc} onClick={()=>setResetConfirm(false)}>Cancelar</button>
            </div>
          :<button style={{background:'#FEF2F2',color:'#DC2626',border:'1.5px solid #FECACA',borderRadius:8,padding:'10px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}
              onClick={()=>setResetConfirm(true)}>
              🗑 Borrar historial de ventas y cierres
            </button>}
      </div>)}
    </div>)}

    {tab==='audit'&&(<div>
      <div style={{marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:13,color:C.t3}}>{audit_log.length} eventos registrados (máx. 500)</div>
        <button style={bSm(C.gL,C.g,C.gT)} onClick={()=>exportCSV(audit_log.map(a=>({Fecha:a.date,Acción:a.action,Detalle:a.detail,Rol:a.role||''})),'historial_cambios.csv')}>⬇ CSV</button>
      </div>
      {audit_log.length===0?<EmptyState icon="📋" title="Sin historial" sub="Los cambios importantes se registran automáticamente"/>
      :<div style={card({padding:0,overflow:'hidden'})}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th style={TH}>Fecha y Hora</th><th style={TH}>Acción</th><th style={TH}>Detalle</th><th style={TH}>Rol</th></tr></thead>
          <tbody>{logPaged.map(a=>(<tr key={a.id}><td style={{...TD,color:C.t3,fontSize:12,whiteSpace:'nowrap'}}>{a.date}</td><td style={TD}><Badge txt={a.action} color={a.action.includes('PROD')?C.b:a.action.includes('VENTA')?C.g:a.action.includes('GASTO')?C.o:C.pr}/></td><td style={{...TD,color:C.t2}}>{a.detail}</td><td style={TD}><Badge txt={a.user&&a.user!=='—'?`👤 ${a.user}`:a.role||'admin'} color={C.b}/></td></tr>))}</tbody>
        </table>
        <Pagination page={logPage} totalPages={logPages} setPage={setLogPage}/>
      </div>}
    </div>)}

    {/* Modal crear/editar usuario */}
    {userModal&&(<Modal title={st.users.find(x=>x.id===userModal.id)?'Editar Usuario':'Nuevo Usuario'} onClose={()=>setUserModal(null)} width={440}
      footer={<><button style={bSc} onClick={()=>setUserModal(null)}>Cancelar</button><button style={bPr} onClick={saveUser}>Guardar Usuario</button></>}>
      <div style={{marginBottom:12}}><label style={lbl}>Nombre completo *</label><input style={inp} value={userModal.name} onChange={e=>setUserModal(m=>({...m,name:e.target.value}))} placeholder="Ej: María Pérez" autoFocus/></div>
      <div style={{marginBottom:12}}><label style={lbl}>Contraseña *</label><input style={inp} value={userModal.password} onChange={e=>setUserModal(m=>({...m,password:e.target.value}))} placeholder="Contraseña de acceso"/></div>
      <div style={{marginBottom:12}}>
        <label style={lbl}>Rol</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          {[['admin','👑 Admin'],['cajero','💵 Cajero'],['produccion','🍞 Producción']].map(([v,l])=>(<button key={v}
            onClick={()=>setUserModal(m=>({...m,role:v}))}
            style={{padding:'9px 6px',background:userModal.role===v?C.pr:'#fff',color:userModal.role===v?'#fff':C.t2,border:`1.5px solid ${userModal.role===v?C.pr:C.bd}`,borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600}}>
            {l}
          </button>))}
        </div>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:C.t2}}>
        <input type="checkbox" checked={userModal.active!==false} onChange={e=>setUserModal(m=>({...m,active:e.target.checked}))} style={{width:15,height:15}}/>
        Usuario activo (puede iniciar sesión)
      </label>
      <div style={{marginTop:12,fontSize:11,color:C.t3,background:C.prL,borderRadius:8,padding:'8px 12px'}}>
        {userModal.role==='admin'&&'👑 Admin: acceso total, puede cambiar precios y gestionar usuarios.'}
        {userModal.role==='cajero'&&'💵 Cajero: ventas, caja y clientes. No puede cambiar precios.'}
        {userModal.role==='produccion'&&'🍞 Producción: fórmulas, producción, inventario y productos.'}
      </div>
    </Modal>)}
  </div>);
}

// ── APP ────────────────────────────────────────────────────────────────
const STORAGE_KEY='labrioche_erp_v1';

// ── PANTALLA DE LOGIN ─────────────────────────────────────────────────
function Login({st,dispatch}){
  const[selUser,setSelUser]=useState(null);
  const[pass,setPass]=useState('');
  const[error,setError]=useState('');
  const activeUsers=(st.users||[]).filter(u=>u.active!==false);

  function tryLogin(){
    if(!selUser)return;
    if(pass===selUser.password){
      dispatch({type:'LOGIN',user:selUser});
    } else {
      setError('Contraseña incorrecta');setPass('');
    }
  }

  const ROLE_INFO={admin:{icon:'👑',label:'Administrador',color:C.pr},cajero:{icon:'💵',label:'Cajero',color:C.g},produccion:{icon:'🍞',label:'Producción',color:C.a}};

  return(<div style={{minHeight:'100vh',background:`linear-gradient(135deg,${C.sb},#1a2947)`,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{width:'100%',maxWidth:420}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <div style={{fontSize:44,marginBottom:8}}>🥐</div>
        <div style={{fontWeight:800,fontSize:28,color:'#E2E8F0'}}><span style={{color:'#60A5FA'}}>La Brioche</span></div>
        <div style={{fontSize:14,color:C.sbTx,marginTop:4,letterSpacing:'0.12em',textTransform:'uppercase'}}>Panadería</div>
      </div>

      <div style={{background:'#fff',borderRadius:16,padding:28,boxShadow:'0 20px 60px rgba(0,0,0,.4)'}}>
        {!selUser?(<>
          <div style={{fontWeight:700,fontSize:16,color:C.t1,marginBottom:16,textAlign:'center'}}>¿Quién eres?</div>
          {activeUsers.length===0&&<div style={{textAlign:'center',color:C.t3,fontSize:13,padding:20}}>No hay usuarios activos. Contacta al administrador.</div>}
          {activeUsers.map(u=>{
            const ri=ROLE_INFO[u.role]||ROLE_INFO.cajero;
            return(<button key={u.id} onClick={()=>{setSelUser(u);setError('');setPass('');}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 16px',marginBottom:8,
                background:'#fff',border:`1.5px solid ${C.bd}`,borderRadius:12,cursor:'pointer',textAlign:'left',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=ri.color;e.currentTarget.style.background=C.prL;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.bd;e.currentTarget.style.background='#fff';}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:ri.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{ri.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:C.t1}}>{u.name}</div>
                <div style={{fontSize:12,color:ri.color,fontWeight:600}}>{ri.label}</div>
              </div>
              <span style={{color:C.t3,fontSize:18}}>→</span>
            </button>);
          })}
        </>):(<>
          <button onClick={()=>{setSelUser(null);setError('');}} style={{background:'none',border:'none',color:C.t3,fontSize:13,cursor:'pointer',marginBottom:14,padding:0}}>← Cambiar usuario</button>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:(ROLE_INFO[selUser.role]||ROLE_INFO.cajero).color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 10px'}}>{(ROLE_INFO[selUser.role]||ROLE_INFO.cajero).icon}</div>
            <div style={{fontWeight:800,fontSize:18,color:C.t1}}>{selUser.name}</div>
            <div style={{fontSize:13,color:C.t3}}>{(ROLE_INFO[selUser.role]||ROLE_INFO.cajero).label}</div>
          </div>
          <label style={{...lbl,fontSize:13}}>Contraseña</label>
          <input type="password" autoFocus
            style={{...inp,fontSize:16,padding:'12px 14px',borderColor:error?C.r:C.bd}}
            value={pass}
            onChange={e=>{setPass(e.target.value);setError('');}}
            onKeyDown={e=>{if(e.key==='Enter')tryLogin();}}
            placeholder="••••••••"/>
          {error&&<div style={{color:C.r,fontSize:13,fontWeight:600,marginTop:8}}>⚠ {error}</div>}
          <button onClick={tryLogin} disabled={!pass}
            style={{...bPr,width:'100%',justifyContent:'center',padding:'13px',fontSize:15,marginTop:16,opacity:!pass?0.5:1}}>
            Ingresar →
          </button>
        </>)}
      </div>
    </div>
  </div>);
}

// ── ERROR BOUNDARY: si una página falla, muestra el error en vez de pantalla en blanco ──
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null,info:null};}
  static getDerivedStateFromError(error){return{error};}
  componentDidCatch(error,info){this.setState({info});}
  componentDidUpdate(prev){if(prev.pageKey!==this.props.pageKey&&this.state.error)this.setState({error:null,info:null});}
  render(){
    if(this.state.error){
      const stack=(this.state.error?.stack||'').split('\n').slice(0,4).join('\n');
      const compStack=(this.state.info?.componentStack||'').split('\n').filter(Boolean).slice(0,5).join('\n');
      return(<div style={{padding:30}}>
        <div style={{background:'#FEF2F2',border:'2px solid #FECACA',borderRadius:12,padding:24,maxWidth:720}}>
          <div style={{fontSize:16,fontWeight:800,color:'#DC2626',marginBottom:8}}>⚠️ Error en esta página</div>
          <div style={{fontSize:13,color:'#475569',marginBottom:12}}>Copia este detalle y compártelo para poder corregirlo:</div>
          <pre style={{background:'#fff',border:'1px solid #FECACA',borderRadius:8,padding:12,fontSize:11,color:'#DC2626',overflow:'auto',whiteSpace:'pre-wrap'}}>{String(this.state.error?.message||this.state.error)}{'\n\n'}{stack}{compStack?'\n--- Componente ---\n'+compStack:''}</pre>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button style={{background:'#2563EB',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer'}}
              onClick={()=>this.setState({error:null,info:null})}>Reintentar</button>
            <button style={{background:'#FEF2F2',color:'#DC2626',border:'1.5px solid #FECACA',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer'}}
              onClick={async()=>{try{await window.storage.delete(STORAGE_KEY);}catch(e){}window.location.reload();}}>Restablecer datos guardados</button>
          </div>
        </div>
      </div>);
    }
    return this.props.children;
  }
}

export default function App(){
  const[st,dispatch]=useReducer(reducer,INIT);
  const[page,setPage]=useState('dashboard');

  // Persist to window.storage
  useEffect(()=>{
    (async()=>{
      try{const saved=await window.storage.get(STORAGE_KEY);if(saved?.value){const p=JSON.parse(saved.value);dispatch({type:'LOAD',p:{...INIT,...p}});}}
      catch{}
    })();
  },[]);

  useEffect(()=>{
    const timer=setTimeout(()=>{
      (async()=>{try{const{current_user,...toSave}=st;await window.storage.set(STORAGE_KEY,JSON.stringify(toSave));}catch{}})();
    },500);
    return()=>clearTimeout(timer);
  },[st]);

  // Al cerrar sesión o cambiar de usuario, volver al dashboard
  useEffect(()=>{setPage('dashboard');},[st.current_user?.id]);

  // ── PANTALLA DE LOGIN: sin usuario no se entra ──
  if(!st.current_user)return <Login st={st} dispatch={dispatch}/>;

  const lowStock=st.products.filter(p=>p.active&&p.stock<=p.min_stock&&p.min_stock>0).length;
  const pendingPayables=(st.payables||[]).filter(p=>!p.paid).length;

  const PAGES={
    dashboard:<Dashboard st={st} navigate={setPage}/>,
    productos:<Productos st={st} dispatch={dispatch}/>,
    formulas:<Formulas st={st} dispatch={dispatch}/>,
    produccion:<Produccion st={st} dispatch={dispatch}/>,
    ventas:<Ventas st={st} dispatch={dispatch}/>,
    compras:<Compras st={st} dispatch={dispatch}/>,
    inventario:<Inventario st={st} dispatch={dispatch}/>,
    caja:<CuadreCaja st={st} dispatch={dispatch}/>,
    gastos:<Gastos st={st} dispatch={dispatch}/>,
    reportes:<Reportes st={st}/>,
    clientes:<Clientes st={st} dispatch={dispatch}/>,
    empleados:<Empleados st={st} dispatch={dispatch}/>,
    config:<Configuracion st={st} dispatch={dispatch}/>,
  };

  // Role-based nav guard
  const allowed=ROLE_PAGES[st.current_role]||ROLE_PAGES.admin;
  const safePage=allowed.includes(page)?page:'dashboard';

  const roleColors={admin:C.g,cajero:C.b,produccion:C.a};
  const roleLabel={admin:'Administrador',cajero:'Cajero',produccion:'Producción'};

  return(<div style={{display:'flex',minHeight:'100vh',background:C.bg,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',color:C.t1}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:#f1f5f9;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}input:focus,select:focus,textarea:focus{outline:none;border-color:${C.pr}!important;box-shadow:0 0 0 3px ${C.pr}22!important;}`}</style>

    <Sidebar active={safePage} setActive={p=>{if(allowed.includes(p))setPage(p);}} lowStock={lowStock} role={st.current_role}/>

    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Topbar */}
      <header style={{background:'#fff',borderBottom:`1px solid ${C.bd}`,padding:'0 28px',height:56,display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <div style={{flex:1}}>
          <span style={{fontSize:13,color:C.t3}}>🥐 La Brioche</span>
          <span style={{color:C.bd,margin:'0 8px'}}>·</span>
          <span style={{fontSize:13,fontWeight:600,color:C.t2}}>{NAV.find(n=>n.id===safePage)?.label||'Dashboard'}</span>
        </div>

        {pendingPayables>0&&(<div style={{display:'flex',alignItems:'center',gap:6,background:C.aL,border:`1px solid ${C.aT}`,borderRadius:8,padding:'4px 10px',cursor:'pointer'}} onClick={()=>setPage('compras')}>
          <span style={{fontSize:12,fontWeight:600,color:C.a}}>⏳ {pendingPayables} CxP pendientes</span>
        </div>)}

        <div style={{display:'flex',alignItems:'center',gap:10,background:'#F8FAFC',border:`1px solid ${C.bd}`,borderRadius:8,padding:'6px 12px'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:roleColors[st.current_role]}}/>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.t1,lineHeight:1.2}}>{st.current_user?.name}</div>
            <div style={{fontSize:10,color:C.t3,lineHeight:1.2}}>{roleLabel[st.current_role]}</div>
          </div>
          <button onClick={()=>dispatch({type:'LOGOUT'})}
            style={{background:C.rL,color:C.r,border:`1px solid ${C.rT}`,borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',marginLeft:4}}>
            Salir
          </button>
        </div>

        <div style={{fontSize:12,color:C.t3}}>{todayISO()}</div>
      </header>

      {/* Main content */}
      <main style={{flex:1,overflowY:'auto',padding:'28px',maxWidth:1600}}>
        <ErrorBoundary pageKey={safePage}>
          {PAGES[safePage]||PAGES.dashboard}
        </ErrorBoundary>
      </main>
    </div>
  </div>);
}
