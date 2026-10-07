import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import api from './api'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-state">Checking your session...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AuthPage({ mode }) {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault(); setError('')
    if (isRegister && !form.name.trim()) return setError('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email address.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setSubmitting(true)
    try {
      await (isRegister ? register(form) : login({ email: form.email, password: form.password }))
      navigate('/', { replace: true })
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to connect to the backend.') }
    finally { setSubmitting(false) }
  }

  return <main className="auth-layout">
    <section className="auth-intro"><p className="eyebrow">SKILLSNEXIS / WEEK 03</p><h1>Make room for the work that matters.</h1><p className="intro-copy">A focused task desk for turning loose ends into visible progress.</p><div className="signal-list"><span>01</span><span>Private task workspace</span><span>02</span><span>JWT-secured sessions</span></div></section>
    <section className="auth-card"><p className="eyebrow">{isRegister ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p><h2>{isRegister ? 'Start your workspace' : 'Sign in to continue'}</h2><p className="muted">{isRegister ? 'Your tasks stay tied to your account.' : 'Pick up exactly where you left off.'}</p><form onSubmit={handleSubmit} className="stack-form">
      {isRegister && <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
      <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
      {error && <p className="form-error">{error}</p>}<button className="button button-primary" disabled={submitting}>{submitting ? 'Working...' : isRegister ? 'Create account' : 'Log in'}</button>
    </form><p className="switch-copy">{isRegister ? 'Already have an account?' : 'Need an account?'} <NavLink to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Register'}</NavLink></p></section>
  </main>
}

function Dashboard() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState({ title: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [uploadedImage, setUploadedImage] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => { api.get('/tasks').then(({ data }) => setTasks(data.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Could not load tasks.')).finally(() => setLoading(false)) }, [])

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesFilter = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed)
    return matchesFilter && `${task.title} ${task.description}`.toLowerCase().includes(search.toLowerCase())
  }), [tasks, filter, search])

  const submitTask = async (event) => {
    event.preventDefault(); if (!form.title.trim()) return setError('A task title is required.')
    setSaving(true); setError('')
    try {
      if (editingId) { const { data } = await api.put(`/tasks/${editingId}`, form); setTasks(tasks.map((task) => task._id === editingId ? data.data : task)) }
      else { const { data } = await api.post('/tasks', form); setTasks([data.data, ...tasks]) }
      setForm({ title: '', description: '' }); setEditingId(null)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save task.') }
    finally { setSaving(false) }
  }
  const toggleTask = async (task) => { try { const { data } = await api.put(`/tasks/${task._id}`, { completed: !task.completed }); setTasks(tasks.map((item) => item._id === task._id ? data.data : item)) } catch (requestError) { setError(requestError.response?.data?.message || 'Could not update task.') } }
  const deleteTask = async (id) => { try { await api.delete(`/tasks/${id}`); setTasks(tasks.filter((task) => task._id !== id)) } catch (requestError) { setError(requestError.response?.data?.message || 'Could not delete task.') } }
  const chooseImage = (event) => { const file = event.target.files[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type) || file.size > 5 * 1024 * 1024) return setError('Choose a JPG, JPEG, or PNG image under 5 MB.'); setSelectedImage(file); setPreview(URL.createObjectURL(file)); setError('') }
  const uploadImage = async () => { if (!selectedImage) return setError('Choose an image before uploading.'); const body = new FormData(); body.append('image', selectedImage); setUploading(true); setError(''); try { const { data } = await api.post('/uploads/image', body); setUploadedImage(data.data.url) } catch (requestError) { setError(requestError.response?.data?.message || 'Could not upload image.') } finally { setUploading(false) } }

  return <div className="app-shell"><header className="topbar"><div><p className="eyebrow">SKILLSNEXIS / TASK DESK</p><strong>Today, {user.name.split(' ')[0]}.</strong></div><button className="button button-quiet" onClick={logout}>Log out</button></header><main className="dashboard">
    <section className="dashboard-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Keep the next step close.</h1></div><div className="task-count"><strong>{tasks.filter((task) => !task.completed).length}</strong><span>open tasks</span></div></section>
    <div className="dashboard-grid"><section className="work-column"><form className="task-composer" onSubmit={submitTask}><p className="eyebrow">{editingId ? 'EDIT TASK' : 'NEW TASK'}</p><input placeholder="What needs doing?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><textarea placeholder="Add a little context (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div className="composer-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add task'}</button>{editingId && <button type="button" className="button button-quiet" onClick={() => { setEditingId(null); setForm({ title: '', description: '' }) }}>Cancel</button>}</div></form>
      <div className="toolbar"><div className="filters">{['all', 'pending', 'completed'].map((item) => <button type="button" key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item}</button>)}</div><input className="search" placeholder="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {error && <p className="form-error inline-error" role="alert">{error}</p>}{loading ? <div className="empty-state" role="status">Loading your tasks...</div> : visibleTasks.length === 0 ? <div className="empty-state"><strong>No tasks here yet.</strong><span>Add a task above or change the filter.</span></div> : <div className="task-list">{visibleTasks.map((task) => <article className={task.completed ? 'task-item completed' : 'task-item'} key={task._id}><button type="button" className="check-button" aria-label={`Mark ${task.title} ${task.completed ? 'pending' : 'completed'}`} onClick={() => toggleTask(task)}>{task.completed ? '✓' : ''}</button><div className="task-copy"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<small>{new Date(task.createdAt).toLocaleDateString()}</small></div><div className="task-actions"><button type="button" onClick={() => { setEditingId(task._id); setForm({ title: task.title, description: task.description }) }}>Edit</button><button type="button" onClick={() => deleteTask(task._id)}>Delete</button></div></article>)}</div>}
    </section><aside className="side-column"><section className="upload-panel"><p className="eyebrow">WORKSPACE IMAGE</p><h2>Keep a visual note.</h2><p className="muted">Upload a JPG or PNG to test the protected media flow.</p><label className="upload-drop">{preview ? <img src={preview} alt="Selected preview" /> : <><strong>Choose image</strong><span>JPG, JPEG, PNG · max 5 MB</span></>}<input type="file" accept="image/jpeg,image/png" aria-label="Choose image" onChange={chooseImage} /></label><button className="button button-secondary" onClick={uploadImage} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload image'}</button>{uploadedImage && <div className="uploaded-result" role="status"><span>Uploaded successfully</span><img src={uploadedImage} alt="Uploaded workspace" /></div>}</section><section className="account-note"><span className="avatar">{user.name.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><p>{user.email}</p></div></section></aside></div>
  </main></div>
}

export default function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider></BrowserRouter> }
