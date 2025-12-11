import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function formatDate(dateStr) {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function App(){
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ fetchTodos(); }, []);

  async function fetchTodos(){
    setLoading(true);
    try{
      const res = await axios.get(API + '/todos');
      setTodos(res.data);
    }catch(err){
      console.error(err);
      alert('Could not load todos. Is backend running?');
    }finally{ setLoading(false); }
  }

  async function addTodo(){
    if(!text.trim()) return;
    try{
      const res = await axios.post(API + '/todos', { text });
      setTodos(prev => [res.data, ...prev]);
      setText('');
    }catch(err){
      console.error(err);
      alert('Add failed');
    }
  }

  async function toggleComplete(id, completed){
    try{
      const res = await axios.put(API + '/todos/' + id, { completed: !completed });
      setTodos(todos.map(t => t._id === id ? res.data : t));
    }catch(err){ console.error(err); }
  }

  function startEdit(id, currentText){
    setEditingId(id);
    setEditingText(currentText);
  }

  async function saveEdit(id){
    if(!editingText.trim()) return;
    try{
      const res = await axios.put(API + '/todos/' + id, { text: editingText.trim() });
      setTodos(todos.map(t => t._id === id ? res.data : t));
      setEditingId(null);
      setEditingText('');
    }catch(err){ console.error(err); alert('Update failed'); }
  }

  async function deleteTodo(id){
    if(!window.confirm('Delete this todo?')) return;
    try{
      await axios.delete(API + '/todos/' + id);
      setTodos(todos.filter(t => t._id !== id));
    }catch(err){ console.error(err); alert('Delete failed'); }
  }

  const displayed = todos.filter(t => {
    if(filter === 'active') return !t.completed;
    if(filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="app">
      <div className="header">
        <div className="title">Stylish Todo App</div>
        <div style={{fontSize:13, color:'#9fb0d6'}}>Full-stack • React • Node • MongoDB</div>
      </div>

      <div className="card">
        <div className="input-row">
          <input type="text" placeholder="Add a new todo..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addTodo(); }} />
          <button className="btn btn-primary" onClick={addTodo}>Add</button>
        </div>

        <div className="controls">
          <button className={'filter-btn ' + (filter==='all'?'active':'')} onClick={()=>setFilter('all')}>All</button>
          <button className={'filter-btn ' + (filter==='active'?'active':'')} onClick={()=>setFilter('active')}>Active</button>
          <button className={'filter-btn ' + (filter==='completed'?'active':'')} onClick={()=>setFilter('completed')}>Completed</button>
          <div style={{flex:1}} />
          <button className="filter-btn" onClick={fetchTodos}>Refresh</button>
        </div>

        <div className="todo-list">
          {loading && <div className="empty">Loading...</div>}
          {!loading && displayed.length===0 && <div className="empty">No todos here yet — add one above.</div>}
          {displayed.map(todo => (
            <div key={todo._id} className="todo-item">
              <div className="left">
                <div className="check" onClick={()=>toggleComplete(todo._id, todo.completed)} title="Toggle complete">
                  {todo.completed ? '✅' : '○'}
                </div>

                <div style={{flex:1}}>
                  {editingId === todo._id ? (
                    <div>
                      <input className="edit-input" value={editingText} onChange={e=>setEditingText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') saveEdit(todo._id); }} />
                      <div style={{marginTop:6}} className="meta">Press Enter to save</div>
                    </div>
                  ) : (
                    <div>
                      <div className={'text ' + (todo.completed ? 'done' : '')}>{todo.text}</div>
                      <div className="meta">Created: {formatDate(todo.createdAt)}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="actions">
                {editingId === todo._id ? (
                  <button className="action-btn" onClick={()=>{ setEditingId(null); setEditingText(''); }}>Cancel</button>
                ) : (
                  <button className="action-btn" onClick={()=>startEdit(todo._id, todo.text)}>Edit</button>
                )}
                <button className="action-btn danger" onClick={()=>deleteTodo(todo._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:14, color:'#9fb0d6', fontSize:13, textAlign:'center'}}>Made for your CU Full Stack Capstone</div>
    </div>
  );
}
