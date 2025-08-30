// src/App.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  // search + filters
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);

  // reference data
  const [people, setPeople] = useState([]);
  const [places, setPlaces] = useState([]);

  // dropdown filters (owner/place/status)
  const [filters, setFilters] = useState({
    owner_id: '',
    place_id: '',
    status: '',
  });

  // NEW: extra filter fields
  const [tagText, setTagText] = useState('');    // "storm school donate"
  const [brand, setBrand] = useState('');        // "carhartt"
  const [typeF, setTypeF] = useState('');        // "pants"
  const [sizeLabel, setSizeLabel] = useState(''); // "34x32" or "L"

  // load reference tables once
  async function loadRef() {
    const [{ data: ppl }, { data: plc }] = await Promise.all([
      supabase.from('people').select('id,name').order('name'),
      supabase.from('places').select('id,name').order('name'),
    ]);
    setPeople(ppl || []);
    setPlaces(plc || []);
  }

  // fetch items with all active filters
  async function loadItems() {
    let query = supabase
      .from('items')
      .select(
        'id,name,category,type,brand,size_label,tags,status,photo_url,owner_id,place_id,container_id,slot_id,updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(100);

    if (q) query = query.ilike('name', `%${q}%`);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.place_id) query = query.eq('place_id', filters.place_id);
    if (filters.status) query = query.eq('status', filters.status);

    // NEW: advanced filters
    if (brand) query = query.ilike('brand', `%${brand}%`);
    if (typeF) query = query.ilike('type', `%${typeF}%`);
    if (sizeLabel) query = query.ilike('size_label', `%${sizeLabel}%`);
    if (tagText) {
      const tags = tagText
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((t) => t.toLowerCase());
      if (tags.length) query = query.contains('tags', tags); // requires text[] column + GIN index
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setItems([]);
      return;
    }
    setItems(data || []);
  }

  useEffect(() => {
    loadRef();
  }, []);
  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters, brand, typeF, sizeLabel, tagText]);

  // quick toggle dirty/clean + movement log
  const onToggleDirty = async (item) => {
    const next = item.status === 'dirty' ? 'clean' : 'dirty';
    await supabase.from('items').update({ status: next }).eq('id', item.id);
    await supabase.from('movements').insert({
      item_id: item.id,
      action: next === 'dirty' ? 'marked_dirty' : 'marked_clean',
      to_place_id: item.place_id,
      to_container_id: item.container_id,
      to_slot_id: item.slot_id,
    });
    loadItems();
  };

  return (
    <div style={{ padding: '12px', maxWidth: 900, margin: '0 auto' }}>
      {/* search box */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name (e.g., 'Carhartt jacket', 'Spiderman shoes')"
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: 8,
          marginBottom: 8,
        }}
      />

      {/* basic dropdown filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <select
          value={filters.owner_id}
          onChange={(e) =>
            setFilters((f) => ({ ...f, owner_id: e.target.value }))
          }
        >
          <option value="">All People</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.place_id}
          onChange={(e) =>
            setFilters((f) => ({ ...f, place_id: e.target.value }))
          }
        >
          <option value="">All Places</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
        >
          <option value="">Any Status</option>
          <option value="clean">clean</option>
          <option value="dirty">dirty</option>
          <option value="in_use">in_use</option>
          <option value="missing">missing</option>
        </select>
      </div>

      {/* NEW: advanced text filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Brand contains"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <input
          placeholder="Type contains (pants, charger…)"
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
        />
        <input
          placeholder="Size label (34x32, L…)"
          value={sizeLabel}
          onChange={(e) => setSizeLabel(e.target.value)}
        />
        <input
          placeholder="Tags (storm school donate)"
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
        />
      </div>

      {/* results */}
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            border: '1px solid #eee',
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
          }}
        >
          <img
            src={it.photo_url || 'https://via.placeholder.com/64'}
            alt=""
            width="64"
            height="64"
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{it.name}</div>

            {/* NEW: show brand/type/size/tags */}
            <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.brand || '—'} • {it.type || it.category || '—'} •{' '}
              {it.size_label || '—'} • {it.status}
              {it.tags?.length ? <> • tags: {it.tags.join(', ')}</> : null}
            </div>
          </div>
          <button
            onClick={() => onToggleDirty(it)}
            style={{ padding: '8px 10px' }}
          >
            {it.status === 'dirty' ? 'Mark clean' : 'Mark dirty'}
          </button>
        </div>
      ))}

      {!items.length && (
        <div style={{ opacity: 0.6, marginTop: 8 }}>No items match. Try widening filters.</div>
      )}
    </div>
  );
}