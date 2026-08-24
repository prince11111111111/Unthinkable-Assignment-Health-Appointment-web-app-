import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

function PatientDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Reschedule State
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'PATIENT') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const docsRes = await api.get('/patient/doctors');
      setDoctors(docsRes.data);
      
      const apptsRes = await api.get('/patient/appointments');
      setAppointments(apptsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      await api.post('/patient/book', {
        doctorId: selectedDoctorId,
        date: new Date(bookingDate).toISOString(),
        symptoms
      });
      showToast('Appointment booked successfully!', 'success');
      setBookingDate('');
      setSymptoms('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to book slot.', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.delete(`/patient/appointments/${id}`);
      fetchData();
      showToast('Appointment cancelled', 'success');
    } catch (err) {
      showToast('Failed to cancel appointment.', 'error');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/patient/appointments/${rescheduleAppt}`, {
        date: new Date(newDate).toISOString()
      });
      setRescheduleAppt(null);
      setNewDate('');
      await fetchData();
      showToast('Appointment rescheduled successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reschedule.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">MediCare <span className="text-slate-800">Patient</span></h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-slate-500">Welcome, {localStorage.getItem('name')}</span>
              <div className="flex space-x-4 border-l border-slate-200 pl-6">
                <button onClick={() => navigate('/settings')} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition">Settings</button>
                <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-700 transition">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Booking Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Book New Appointment</h2>

              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Doctor</label>
                  <select 
                    required
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  >
                    <option value="" disabled>Choose a specialist...</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>Dr. {doc.user.name} ({doc.specialization})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms</label>
                  <textarea 
                    required
                    rows="4"
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    placeholder="Describe what you are feeling..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isBooking}
                  className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isBooking ? 'Processing...' : 'Confirm Appointment'}
                </button>
              </form>
            </div>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Your Appointments</h2>
              
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  No appointments booked yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map(appt => (
                    <div key={appt.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">Dr. {appt.doctor.user.name}</h3>
                          <p className="text-sm text-slate-500">{new Date(appt.date).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full mb-2 inline-block ${
                            appt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                            appt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {appt.status}
                          </span>
                          
                          {appt.status === 'SCHEDULED' && (
                            <div className="flex gap-3 justify-end mt-1">
                              <button onClick={() => setRescheduleAppt(appt.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Reschedule</button>
                              <button onClick={() => handleCancel(appt.id)} className="text-xs font-semibold text-red-600 hover:text-red-800">Cancel</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {rescheduleAppt === appt.id && (
                        <form onSubmit={handleReschedule} className="mb-4 bg-blue-50 p-3 rounded-lg flex items-end gap-3 border border-blue-100 animate-in slide-in-from-top-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-blue-800 mb-1">New Date & Time</label>
                            <input 
                              type="datetime-local" 
                              required
                              value={newDate}
                              onChange={e => setNewDate(e.target.value)}
                              className="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setRescheduleAppt(null)} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-100">Cancel</button>
                            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
                          </div>
                        </form>
                      )}
                      
                      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                        <span className="font-medium">Symptoms:</span> {appt.symptoms}
                      </div>

                      {appt.postVisitSummary && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2">Doctor's Follow-up Plan</h4>
                          <p className="text-sm text-slate-700 mb-2">{appt.postVisitSummary.patientFriendlySummary}</p>
                          {appt.postVisitSummary.medicationSchedule?.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Medications:</span>
                              <ul className="list-disc list-inside text-sm text-slate-700 ml-1">
                                {appt.postVisitSummary.medicationSchedule.map((med, i) => <li key={i}>{med}</li>)}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 italic"><span className="font-bold">Next Steps:</span> {appt.postVisitSummary.followUp}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default PatientDashboard;
