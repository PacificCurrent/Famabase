import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Laundry(){
  const [dirty,setDirty]=useState([]);
  const [selected,setSelected]=useState(new Set());

  async function load(){
    const { data } = await supabase.from('items').select('id,name,photo_url,status').eq('status','dirty').order('updated_at',{ascending:false});
    setDirty(data||[]);
    setSelected(new Set());
  }
  useEffect(()=>{ load(); }, []);

  const toggle = (id)=>{
    const next = new Set(selected); next.has(id)?next.delete(id):next.add(id); setSelected(next);
  };

  async function markClean(){
    const ids = [...selected];
    if(!ids.length) return;
    await supabase.from('items').update({ status:'clean' }).in('id', ids);
    await supabase.from('movements').insert(ids.map(id=>({ item_id:id, action:'marked_clean' })));
    load();
  }

  return (
    <div style={{padding:'12px'}}>
      <button onClick={markClean} disabled={!selected.size} style={{marginBottom:8}}>Mark selected clean</button>
      {dirty.map(it=>(
        <label key={it.id} style={{display:'flex',gap:10,alignItems:'center',border:'1px solid #eee',borderRadius:10,padding:10,marginBottom:8}}>
          <input type="checkbox" checked={selected.has(it.id)} onChange={()=>toggle(it.id)} />
          <img src={it.photo_url||'https://via.placeholder.com/64'} width="64" height="64" style={{objectFit:'cover',borderRadius:8}} />
          <div>{it.name}</div>
        </label>
      ))}
      {!dirty.length && <div>No dirty items. 🤘</div>}
    </div>
  );
}
