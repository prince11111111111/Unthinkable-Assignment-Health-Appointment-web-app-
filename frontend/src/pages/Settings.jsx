import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

function Settings() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setFormData({
        name: res.data.name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        role: res.data.role || ''
      });
    } catch (err) {
      showToast('Failed to load profile data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/settings', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      showToast(res.data.message, 'success');
      // Update local storage name if it changed
      localStorage.setItem('name', res.data.user.name);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete your account and all your appointments permanently.')) return;
    try {
      await api.delete('/auth/me');
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete account.', 'error');
    }
  };

  const goBack = () => {
    const role = localStorage.getItem('role');
    if (role === 'PATIENT') navigate('/patient');
    else if (role === 'DOCTOR') navigate('/doctor');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button onClick={goBack} className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 flex items-center">
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h2>

          {message.text && (
            <div className={`mb-6 p-4 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +1 555-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Role</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg sm:text-sm cursor-not-allowed"
                value={formData.role}
              />
              <p className="mt-1 text-xs text-slate-500">Contact an administrator to change your role.</p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-red-100">
            <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-500 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 hover:text-red-700 transition-colors"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
