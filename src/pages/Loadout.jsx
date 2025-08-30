import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function groupRows(rows){
  const tree = {};
  for(const r of rows){
    const pl = r.place_name || '—';
    const co = r.container_name || '—';
    const sl = r.slot_name || '—';
    tree[pl] ??= {};
    tree[pl][co] ??= {};
    tree[pl][co][sl] ??= [];
    tree[pl][co][sl].push(r);
  }
  return tree;
}

export default function Loadout(){
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [owners, setOwners] = useState([]);
  const [filters, setFilters] = useState({ owner_ids: [], type_like:'', size_label_like:'', brand_like:'', tags_raw:'storm' });
  const [result, setResult] = useState([]);

  useEffect(()=>{ (async()=>{
    const [{data:i},{data:p}] = await Promise.all([
      supabase.from('items').select('id,name,photo_url,brand,type,size_label,tags,status').limit(200),
      supabase.from('people').select('id,name').order('name')
    ]);
    setItems(i||[]); setOwners(p||[]);
  })(); }, []);

  const toggle = (id)=>{ const n=new Set(selected); n.has(id)?n.delete(id):n.add(id); setSelected(n); };

  async function runByIds(){
    const ids=[...selected];
    if(!ids.length) return alert('Pick some items from the grid.');
    const { data, error } = await supabase.rpc('quick_pack_by_ids', { ids });
    if(error) return alert(error.message);
    setResult(data||[]);
  }

  async function runByFilters(){
    const tags = filters.tags_raw ? filters.tags_raw.split(/[,\s]+/).filter(Boolean).map(t=>t.toLowerCase()) : null;
    const payload = {
      owner_ids: filters.owner_ids.length? filters.owner_ids : null,
      brand_like: filters.brand_like ? `%${filters.brand_like}%` : null,
      type_like: filters.type_like ? `%${filters.type_like}%` : null,
      min_waist: null, max_waist: null, inseam_eq: null,
      size_label_like: filters.size_label_like ? `%${filters.size_label_like}%` : null,
      required_tags: tags, status_in: ['clean','in_use'] // skip dirty by default
    };
    const { data, error } = await supabase.rpc('quick_pack_filter', payload);
    if(error) return alert(error.message);
    setResult(data||[]);
  }

  const copyList = ()=>{
    const grouped = groupRows(result);
    const lines=[];
    for(const pl of Object.keys(grouped)){
      lines.push(pl);
      for(const co of Object.keys(grouped[pl])){
        lines.push(`  ${co}`);
        for(const sl of Object.keys(grouped[pl][co])){
          lines.push(`    ${sl}`);
          for(const r of grouped[pl][co][sl]){
            lines.push(`      - ${r.name} (${r.brand??'?'}, ${r.size_label??'?'})`);
          }
        }
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    alert('Copied!');
  };

  const grouped = groupRows(result);

  return (
    <div style={{padding:12}}>
      <h3>Select by Photo</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:8}}>
        {items.map(it=>(
          <label key={it.id} style={{border:'1px solid #eee',borderRadius:8,padding:6}}>
            <input type="checkbox" checked={selected.has(it.id)} onChange={()=>toggle(it.id)} />
            <img src={it.photo_url||'https://via.placeholder.com/160'} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:6}}/>
            <div style={{fontSize:12}}>{it.name}</div>
          </label>
        ))}
      </div>
      <button onClick={runByIds}>Generate Loadout from selected</button>

      <hr style={{margin:'16px 0'}} />

      <h3>Build by Filters</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
        <select multiple value={filters.owner_ids} onChange={(e)=>setFilters(f=>({...f, owner_ids:[...e.target.selectedOptions].map(o=>o.value)}))}>
          {owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input placeholder="Type contains (pants…)" value={filters.type_like} onChange={e=>setFilters(f=>({...f,type_like:e.target.value}))}/>
        <input placeholder="Brand contains" value={filters.brand_like} onChange={e=>setFilters(f=>({...f,brand_like:e.target.value}))}/>
        <input placeholder="Size label (34x32 / L)" value={filters.size_label_like} onChange={e=>setFilters(f=>({...f,size_label_like:e.target.value}))}/>
      </div>
      <input style={{width:'100%',marginBottom:8}} placeholder="Required tags (storm fr…)" value={filters.tags_raw} onChange={e=>setFilters(f=>({...f,tags_raw:e.target.value}))}/>
      <button onClick={runByFilters}>Generate Loadout from filters</button>

      {!!result.length && (
        <>
          <h3 style={{marginTop:16}}>Result</h3>
          <button onClick={copyList}>Copy list</button>
          {Object.keys(grouped).map(pl=>(
            <div key={pl} style={{marginTop:8}}>
              <strong>{pl}</strong>
              {Object.keys(grouped[pl]).map(co=>(
                <div key={co} style={{marginLeft:12}}>
                  <div>{co}</div>
                  {Object.keys(grouped[pl][co]).map(sl=>(
                    <div key={sl} style={{marginLeft:24}}>
                      <div style={{fontStyle:'italic'}}>{sl}</div>
                      <ul>
                        {grouped[pl][co][sl].map(r=>(
                          <li key={r.item_id}>{r.name} ({r.brand??'?'}, {r.size_label??'?'})</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}