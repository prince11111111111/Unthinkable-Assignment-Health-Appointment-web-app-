import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users'); // users, appointments, leaves
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data State
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]); // For leaves tab

  // Search State
  const [userSearch, setUserSearch] = useState('');
  const [apptSearch, setApptSearch] = useState('');

  // Modals / Edit State
  const [editingUser, setEditingUser] = useState(null);
  
  // Leaves State
  const [activeDoctor, setActiveDoctor] = useState(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, apptsRes, docsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/appointments'),
        api.get('/admin/doctors')
      ]);
      setUsers(usersRes.data);
      setAppointments(apptsRes.data);
      setDoctors(docsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // --- USER ACTIONS ---
  const handleDeleteUser = async (id, role) => {
    if (role === 'ADMIN') return showToast('Cannot delete Admin accounts.', 'error');
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their appointments.')) return;
    
    try {
      await api.delete(`/admin/users/${id}`);
      fetchData();
      showToast('User deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete user.', 'error');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone
      };
      if (editingUser.password) payload.password = editingUser.password;
      
      await api.patch(`/admin/users/${editingUser.id}`, payload);
      setEditingUser(null);
      fetchData();
      showToast('User updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update user.', 'error');
    }
  };

  // --- APPOINTMENT ACTIONS ---
  const handleDeleteAppt = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this appointment?')) return;
    try {
      await api.delete(`/admin/appointments/${id}`);
      fetchData();
      showToast('Appointment deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete appointment.', 'error');
    }
  };

  // --- LEAVE ACTIONS ---
  const handleMarkLeave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post(`/admin/doctors/${activeDoctor}/leave`, { leaveDate });
      showToast(`Leave marked successfully. ${res.data.affectedCount} appointment(s) cancelled.`, 'success');
      setActiveDoctor(null);
      setLeaveDate('');
      fetchData(); // Refresh everything since appointments changed
    } catch (error) {
      showToast('Failed to mark leave', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FILTERING ---
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredAppts = appointments.filter(a => 
    a.patient.user.email.toLowerCase().includes(apptSearch.toLowerCase()) || 
    a.doctor.user.email.toLowerCase().includes(apptSearch.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-slate-900 shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">MediCare <span className="text-purple-400">Admin</span></h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-slate-300">Admin {localStorage.getItem('name')}</span>
              <div className="flex space-x-4 border-l border-slate-700 pl-6">
                <button onClick={() => navigate('/settings')} className="text-sm font-medium text-slate-300 hover:text-white transition">Settings</button>
                <button onClick={handleLogout} className="text-sm font-medium text-red-400 hover:text-red-300 transition">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TABS */}
        <div className="flex space-x-1 border-b border-slate-200 mb-6">
          {['users', 'appointments', 'leaves'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">User Directory</h2>
              <input 
                type="text" 
                placeholder="Search by email..." 
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 w-64"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'DOCTOR' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button onClick={() => setEditingUser(user)} className="text-purple-600 hover:text-purple-900">Edit</button>
                        {user.role !== 'ADMIN' && (
                          <button onClick={() => handleDeleteUser(user.id, user.role)} className="text-red-600 hover:text-red-900">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-slate-500">No users found.</div>}
            </div>
          </div>
        )}

        {/* TAB 2: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">All Appointments</h2>
              <input 
                type="text" 
                placeholder="Search by patient/doctor email..." 
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 w-72"
                value={apptSearch}
                onChange={e => setApptSearch(e.target.value)}
              />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredAppts.map(appt => (
                    <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{new Date(appt.date).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appt.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                          appt.status === 'COMPLETED' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {appt.patient.user.name}<br/><span className="text-xs text-slate-400">{appt.patient.user.email}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        Dr. {appt.doctor.user.name}<br/><span className="text-xs text-slate-400">{appt.doctor.user.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDeleteAppt(appt.id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAppts.length === 0 && <div className="p-8 text-center text-slate-500">No appointments found.</div>}
            </div>
          </div>
        )}

        {/* TAB 3: LEAVES */}
        {activeTab === 'leaves' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Manage Doctor Leaves</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                      {doc.user.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-900">Dr. {doc.user.name}</h3>
                      <p className="text-xs text-slate-500">{doc.specialization}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-slate-50">
                    {activeDoctor !== doc.id ? (
                      <button 
                        onClick={() => setActiveDoctor(doc.id)}
                        className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                      >
                        Mark Leave Day
                      </button>
                    ) : (
                      <form onSubmit={handleMarkLeave} className="animate-in slide-in-from-top-2 duration-200">
                        <div className="mb-3">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Date</label>
                          <input 
                            type="date"
                            required
                            value={leaveDate}
                            onChange={e => setLeaveDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={() => setActiveDoctor(null)}
                            className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded-lg text-xs font-medium hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-[2] bg-purple-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Processing...' : 'Confirm Leave'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text" required
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" required
                  value={editingUser.email}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input 
                  type="tel"
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password (Optional)</label>
                <input 
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editingUser.password || ''}
                  onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
