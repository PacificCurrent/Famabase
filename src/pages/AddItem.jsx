import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AddItem() {
  const [people,setPeople]=useState([]); const [places,setPlaces]=useState([]);
  const [containers,setContainers]=useState([]); const [slots,setSlots]=useState([]);
  const [form,setForm]=useState({ name:'', owner_id:'', category:'', status:'clean', size:'', notes:'', place_id:'', container_id:'', slot_id:'' });
  const [file,setFile]=useState(null); const [saving,setSaving]=useState(false);

  useEffect(()=>{ (async()=>{
    const [{data:ppl},{data:plc}] = await Promise.all([
      supabase.from('people').select('id,name').order('name'),
      supabase.from('places').select('id,name').order('name')
    ]);
    setPeople(ppl||[]); setPlaces(plc||[]);
  })(); }, []);

  useEffect(()=>{ (async()=>{
    if(!form.place_id){ setContainers([]); return; }
    const { data } = await supabase.from('containers').select('id,name').eq('place_id', form.place_id).order('name');
    setContainers(data||[]);
  })(); }, [form.place_id]);

  useEffect(()=>{ (async()=>{
    if(!form.container_id){ setSlots([]); return; }
    const { data } = await supabase.from('slots').select('id,name').eq('container_id', form.container_id).order('name');
    setSlots(data||[]);
  })(); }, [form.container_id]);

  async function uploadPhoto() {
    if(!file) return null;
    const ext = file.name.split('.').pop();
    const path = `items/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from('items').upload(path, file, { upsert:false });
    if (error) throw error;
    return `${supabase.storage.from('items').getPublicUrl(data.path).data.publicUrl}`;
  }

  async function onSubmit(e){
    e.preventDefault();
    if(!form.name) return alert('Name required');
    setSaving(true);
    try{
      const photo_url = await uploadPhoto();
      const toInsert = { ...form, photo_url: photo_url||null, slot_id: form.slot_id||null, container_id: form.container_id||null };
      const { data: inserted, error } = await supabase.from('items').insert(toInsert).select().single();
      if(error) throw error;
      await supabase.from('movements').insert({ item_id: inserted.id, action:'created', to_place_id: inserted.place_id, to_container_id: inserted.container_id, to_slot_id: inserted.slot_id });
      alert('Added!');
      setForm({ name:'', owner_id:'', category:'', status:'clean', size:'', notes:'', place_id:'', container_id:'', slot_id:'' });
      setFile(null);
    }catch(err){ alert(err.message||'Error'); }
    setSaving(false);
  }

  const set = (k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));

  return (
    <form onSubmit={onSubmit} style={{padding:'12px',display:'grid',gap:'10px'}}>
      <input placeholder="Item name*" value={form.name} onChange={set('name')} />
      <input placeholder="Category (e.g., shoes, toys)" value={form.category} onChange={set('category')} />
      <select value={form.owner_id} onChange={set('owner_id')}>
        <option value="">Owner</option>
        {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={form.status} onChange={set('status')}>
        <option value="clean">clean</option><option value="dirty">dirty</option>
        <option value="in_use">in_use</option><option value="missing">missing</option>
      </select>
      <textarea placeholder="Notes" value={form.notes} onChange={set('notes')} />
      <select value={form.place_id} onChange={set('place_id')}>
        <option value="">Place</option>
        {places.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={form.container_id} onChange={set('container_id')}>
        <option value="">Container</option>
        {containers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={form.slot_id} onChange={set('slot_id')}>
        <option value="">Slot (optional)</option>
        {slots.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <input type="file" accept="image/*" capture="environment" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      <button disabled={saving} type="submit">{saving?'Saving…':'Add Item'}</button>
    </form>
  );
      }
