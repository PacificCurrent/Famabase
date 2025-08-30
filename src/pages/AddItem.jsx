import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AddItem() {
  const [people,setPeople]=useState([]); const [places,setPlaces]=useState([]);
  const [containers,setContainers]=useState([]); const [slots,setSlots]=useState([]);
  const [form,setForm]=useState({
    name:'', owner_id:'', category:'', type:'', brand:'', color:'',
    size_label:'', waist:'', inseam:'', shoe_size:'', fr_rating:'', season:'',
    notes:'', status:'clean', place_id:'', container_id:'', slot_id:'', tags_raw:''
  });
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
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `items/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from('items').upload(path, file, { upsert:false });
    if (error) throw error;
    return supabase.storage.from('items').getPublicUrl(data.path).data.publicUrl;
  }

  async function onSubmit(e){
    e.preventDefault();
    if(!form.name) return alert('Name required');
    setSaving(true);
    try{
      const photo_url = await uploadPhoto();
      const tags = form.tags_raw
        ? form.tags_raw.split(/[,\s]+/).filter(Boolean).map(t=>t.toLowerCase())
        : [];
      const toNumber = v => v==='' ? null : Number(v);

      const payload = {
        name: form.name,
        owner_id: form.owner_id || null,
        category: form.category || null,
        type: form.type || null,
        brand: form.brand || null,
        color: form.color || null,
        size_label: form.size_label || null,
        waist: toNumber(form.waist),
        inseam: toNumber(form.inseam),
        shoe_size: form.shoe_size===''? null : Number(form.shoe_size),
        fr_rating: form.fr_rating || null,
        season: form.season || null,
        notes: form.notes || null,
        status: form.status,
        place_id: form.place_id || null,
        container_id: form.container_id || null,
        slot_id: form.slot_id || null,
        tags, photo_url
      };

      const { data: inserted, error } = await supabase.from('items').insert(payload).select().single();
      if(error) throw error;
      await supabase.from('movements').insert({
        item_id: inserted.id, action:'created',
        to_place_id: inserted.place_id, to_container_id: inserted.container_id, to_slot_id: inserted.slot_id
      });
      alert('Added!');
      e.target.reset();
      setForm({ name:'', owner_id:'', category:'', type:'', brand:'', color:'',
        size_label:'', waist:'', inseam:'', shoe_size:'', fr_rating:'', season:'',
        notes:'', status:'clean', place_id:'', container_id:'', slot_id:'', tags_raw:'' });
      setFile(null);
    }catch(err){ alert(err.message||'Error'); }
    setSaving(false);
  }

  const set = (k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));

  return (
    <form onSubmit={onSubmit} style={{padding:'12px',display:'grid',gap:'10px'}}>
      <input placeholder="Item name*" value={form.name} onChange={set('name')} />
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <input placeholder="Type (pants, jacket, charger…)" value={form.type} onChange={set('type')} />
        <input placeholder="Brand" value={form.brand} onChange={set('brand')} />
        <input placeholder="Category (clothes, toys…)" value={form.category} onChange={set('category')} />
        <input placeholder="Color" value={form.color} onChange={set('color')} />
        <input placeholder="Size label (L, 34x32…)" value={form.size_label} onChange={set('size_label')} />
        <input placeholder="Waist (number)" inputMode="numeric" value={form.waist} onChange={set('waist')} />
        <input placeholder="Inseam (number)" inputMode="numeric" value={form.inseam} onChange={set('inseam')} />
        <input placeholder="Shoe size (e.g., 11 or 7.5)" inputMode="decimal" value={form.shoe_size} onChange={set('shoe_size')} />
        <input placeholder="FR rating (FR2…)" value={form.fr_rating} onChange={set('fr_rating')} />
        <input placeholder="Season (summer, winter…)" value={form.season} onChange={set('season')} />
      </div>
      <textarea placeholder="Notes" value={form.notes} onChange={set('notes')} />
      <input placeholder="Tags (comma or space: storm school donate)" value={form.tags_raw} onChange={set('tags_raw')} />

      <select value={form.owner_id} onChange={set('owner_id')}>
        <option value="">Owner</option>
        {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

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