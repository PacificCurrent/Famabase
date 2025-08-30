import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import App from './App.jsx';
import AddItem from './pages/AddItem.jsx';
import Laundry from './pages/Laundry.jsx';
import Loadout from './pages/Loadout.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <nav style={{padding:'8px',display:'flex',gap:'10px',borderBottom:'1px solid #eee'}}>
      <Link to="/">Home</Link>
      <Link to="/add">Add Item</Link>
      <Link to="/laundry">Laundry</Link>
      <Link to="/loadout">Loadout</Link>
    </nav>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/add" element={<AddItem />} />
      <Route path="/laundry" element={<Laundry />} />
      <Route path="/loadout" element={<Loadout />} />
    </Routes>
  </BrowserRouter>
);