/* Motty Handmade — Supabase integration (GitHub Pages / browser client) */
'use strict';
const MottyDB = (() => {
  const URL = 'https://vabcrkeaboessvcqsexp.supabase.co';
  const KEY = 'sb_publishable_xxMv73seH3m6lP2dkPQPIg_DZZqOASj';
  const client = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let products = [], orders = [];
  const toDb = p => ({ id:p.id, sku:p.sku||'', title:p.title, title_en:p.title_en||'', category:p.cat||p.category||'decor', price:Number(p.price)||0, old_price:Number(p.old||p.old_price)||0, badge:p.badge||'', stock:p.stock||'in', stock_count:Number(p.left||p.stock_count)||0, rating:Number(p.rating)||5, reviews:Number(p.reviews)||0, short_description:p.short||p.short_description||'', short_description_en:p.short_en||p.short_description_en||'', description:p.desc||p.description||'', description_en:p.desc_en||p.description_en||'', specifications:p.specs||p.specifications||'', options:p.options||[], images:p.images||[], added_at:p.addedAt||p.added_at||Date.now() });
  const fromDb = p => ({ id:p.id, sku:p.sku, title:p.title, title_en:p.title_en, cat:p.category, price:Number(p.price), old:Number(p.old_price)||0, badge:p.badge, stock:p.stock, left:Number(p.stock_count)||0, rating:Number(p.rating)||5, reviews:Number(p.reviews)||0, short:p.short_description||'', short_en:p.short_description_en||'', desc:p.description||'', desc_en:p.description_en||'', specs:p.specifications||'', options:p.options||[], images:p.images||[], addedAt:p.added_at });
  async function uploadImage(fileOrData, productId) {
    if (!fileOrData) return '';
    let blob, ext='jpg';
    if (typeof fileOrData === 'string' && fileOrData.startsWith('data:')) { const r=await fetch(fileOrData); blob=await r.blob(); ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg'); }
    else { blob=fileOrData; ext=(fileOrData.name?.split('.').pop()||'jpg').toLowerCase(); }
    const path=`${productId}/${Date.now()}.${ext}`;
    const {error}=await client.storage.from('product-images').upload(path,blob,{upsert:true,contentType:blob.type||'image/jpeg'});
    if(error) throw error;
    return client.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }
  async function seedIfEmpty() {
    const {data,error}=await client.from('products').select('id').limit(1); if(error) throw error;
    if(data?.length) return;
    for (const p of MOTTY_PRODUCTS) {
      const images=[];
      for (let i=0;i<(p.images||[]).length;i++) { try { images.push(await uploadImage(p.images[i],p.id)); } catch(e) { console.warn('Image seed skipped',p.id,e.message); } }
      const {error:insertError}=await client.from('products').upsert(toDb({...p,images}),{onConflict:'id'});
      if(insertError) throw insertError;
    }
  }
  async function loadProducts() {
    const {data,error}=await client.from('products').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    products=(data||[]).map(fromDb); window.MOTTY_REMOTE_PRODUCTS=products; return products;
  }
  async function saveProduct(p, imageFile) {
    let images=p.images||[];
    if(imageFile) { const url=await uploadImage(imageFile,p.id); images=[url]; }
    const {data,error}=await client.from('products').upsert(toDb({...p,images}),{onConflict:'id'}).select().single();
    if(error) throw error;
    await loadProducts(); return fromDb(data);
  }
  async function deleteProduct(id) {
    const {error}=await client.from('products').delete().eq('id',id); if(error) throw error;
    await loadProducts();
  }
  async function signIn(email,password) {
    const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error;
    const {data:allowed,error:checkError}=await client.rpc('is_admin');
    if(checkError || allowed!==true) { await client.auth.signOut(); throw new Error('Цей обліковий запис не має прав адміністратора.'); }
    return data.user;
  }
  async function restoreSession() {
    const {data:{session}}=await client.auth.getSession(); if(!session) return false;
    const {data,error}=await client.rpc('is_admin');
    if(error || data!==true) { await client.auth.signOut(); return false; }
    return true;
  }
  async function signOut(){ await client.auth.signOut(); }
  async function loadOrders(){
    const {data,error}=await client.from('orders').select('*').order('created_at',{ascending:false}); if(error) throw error;
    orders=(data||[]).map(o=>({id:o.order_number||o.id,date:o.created_at,name:o.customer_name,phone:o.phone,telegram:o.telegram,comment:o.comment,delivery:o.delivery,city:o.city,warehouse:o.warehouse,address:o.address,payment:o.payment,items:(o.items||[]),subtotal:Number(o.subtotal),deliveryCost:Number(o.delivery_cost),total:Number(o.total),status:o.status,dbId:o.id}));
    return orders;
  }
  async function createOrder(o){
    const generatedNumber='MOT-'+Date.now().toString().slice(-8);
    const payload={order_number:generatedNumber,customer_name:o.name,phone:o.phone,telegram:o.telegram||'',comment:o.comment||'',delivery:o.delivery,city:o.city||'',warehouse:o.warehouse||'',address:o.address||'',payment:o.payment,items:o.items.map(i=>({id:i.id,option:i.option||'',qty:i.qty,product:{id:i.product.id,title:i.product.title,price:i.product.price}})),subtotal:o.subtotal,delivery_cost:o.deliveryCost||0,total:o.total,status:'new'};
    const {error}=await client.from('orders').insert(payload); if(error) throw error;
    return {id:generatedNumber,date:new Date().toISOString(),name:o.name,phone:o.phone,telegram:o.telegram,comment:o.comment,delivery:o.delivery,city:o.city,warehouse:o.warehouse,address:o.address,payment:o.payment,items:o.items,subtotal:o.subtotal,deliveryCost:o.deliveryCost,total:o.total,status:'new',dbId:null};
  }
  async function updateOrder(id,status){ const order=orders.find(o=>o.id===id); if(!order) return; const {error}=await client.from('orders').update({status}).eq('id',order.dbId); if(error) throw error; await loadOrders(); }
  async function init(){ try { await loadProducts(); } catch(e) { console.warn('Supabase products unavailable; showing local catalog',e.message); } }
  async function seed(){ await seedIfEmpty(); await loadProducts(); }
  return {client,init,seed,loadProducts,products:()=>products,saveProduct,deleteProduct,signIn,restoreSession,signOut,loadOrders,orders:()=>orders,createOrder,updateOrder};
})();
