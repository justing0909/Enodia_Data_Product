// simple form component to add a point with name and description
import React, { useState } from 'react';
import { addPoint } from './api';

export default function AddPointForm({ onAdd }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // handle input changes (updates form state with input values)
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // handle form submission
  // this will call the API to add a point and reset the form on success
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await addPoint(form);
      onAdd(result);
      setForm({ name: '', description: '' });
    } catch (err) {
      setError('Failed to add point');
    }
    setLoading(false);
  }

  return (
    // simple form to add a point with name and description
    <form onSubmit={handleSubmit}>
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
      <input name="description" value={form.description} onChange={handleChange} placeholder="Description" />
      <button type="submit" disabled={loading}>Add Point</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}