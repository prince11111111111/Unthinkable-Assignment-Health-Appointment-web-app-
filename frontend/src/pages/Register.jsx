import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PATIENT'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Join Medicare Manager today
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-indigo-500/10 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1">
                <input
                  name="name"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Phone Number (Optional)</label>
              <div className="mt-1">
                <input
                  name="phone"
                  type="tel"
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <div className="mt-1">
                <select
                  name="role"
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl transition-all"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
             <p className="text-sm text-slate-600">
               Already have an account?{' '}
               <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                 Sign in
               </Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
