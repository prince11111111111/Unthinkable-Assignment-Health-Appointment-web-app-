import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('schedule'); // schedule, book, leaves
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Summary Form State
  const [activeApptId, setActiveApptId] = useState(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule State
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [newDate, setNewDate] = useState('');

  // Booking State
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Leave State
  const [leaveDate, setLeaveDate] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'DOCTOR') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptsRes, patientsRes] = await Promise.all([
        api.get('/doctor/appointments'),
        api.get('/doctor/patients')
      ]);
      setAppointments(apptsRes.data);
      setPatients(patientsRes.data);
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

  // --- TAB 1: SCHEDULE ACTIONS ---
  const handleSubmitSummary = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/doctor/appointments/${activeApptId}/summary`, { notes, prescription });
      setActiveApptId(null);
      setNotes('');
      setPrescription('');
      fetchData();
      showToast('Summary submitted successfully', 'success');
    } catch (error) {
      showToast('Failed to submit summary', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.delete(`/doctor/appointments/${id}`);
      fetchData();
      showToast('Appointment cancelled', 'success');
    } catch (err) {
      showToast('Failed to cancel appointment.', 'error');
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/doctor/appointments/${rescheduleAppt}`, {
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

  // --- TAB 2: BOOKING ACTION ---
  const handleBook = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    try {
      await api.post('/doctor/appointments', {
        patientId: bookingPatientId,
        date: new Date(bookingDate).toISOString(),
        symptoms: bookingSymptoms
      });
      showToast('Appointment booked successfully!', 'success');
      setBookingPatientId('');
      setBookingDate('');
      setBookingSymptoms('');
      setActiveTab('schedule');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to book slot.', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  // --- TAB 3: LEAVE ACTION ---
  const handleMarkLeave = async (e) => {
    e.preventDefault();
    setIsLeaving(true);
    try {
      const res = await api.post('/doctor/leave', { leaveDate });
      showToast(`Leave marked successfully. ${res.data.affectedCount} appointment(s) cancelled.`, 'success');
      setLeaveDate('');
      setActiveTab('schedule');
      fetchData();
    } catch (error) {
      showToast('Failed to mark leave', 'error');
    } finally {
      setIsLeaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-teal-600">MediCare <span className="text-slate-800">Doctor</span></h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-slate-500">Dr. {localStorage.getItem('name')}</span>
              <div className="flex space-x-4 border-l border-slate-200 pl-6">
                <button onClick={() => navigate('/settings')} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition">Settings</button>
                <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-700 transition">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TABS */}
        <div className="flex space-x-1 border-b border-slate-200 mb-8">
          {['schedule', 'book for patient', 'manage leaves'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab 
                  ? 'border-teal-600 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB 1: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                You have no appointments scheduled.
              </div>
            ) : appointments.map(appt => (
              <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition hover:shadow-md">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{appt.patient.user.name}</h3>
                    <p className="text-sm text-slate-500">{new Date(appt.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                      appt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                      appt.status === 'COMPLETED' ? 'bg-teal-100 text-teal-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {appt.status}
                    </span>
                    
                    {appt.status === 'SCHEDULED' && (
                      <div className="mt-2 flex gap-2 justify-end">
                        <button onClick={() => setRescheduleAppt(appt.id)} className="text-xs text-blue-600 hover:underline">Reschedule</button>
                        <button onClick={() => handleCancel(appt.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-grow">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Patient Symptoms</h4>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg mb-4">{appt.symptoms}</p>
                  
                  {appt.preVisitSummary && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                        <span className="mr-1">✨</span> AI Pre-Visit Analysis
                      </h4>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2 text-sm text-slate-700">
                        <p><span className="font-semibold text-blue-900">Urgency:</span> {appt.preVisitSummary.urgency}</p>
                        <p><span className="font-semibold text-blue-900">Chief Complaint:</span> {appt.preVisitSummary.chiefComplaint}</p>
                        {appt.preVisitSummary.questionsForDoctor?.length > 0 && (
                          <div>
                            <span className="font-semibold text-blue-900">Suggested Questions:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {appt.preVisitSummary.questionsForDoctor.map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {rescheduleAppt === appt.id && (
                    <form onSubmit={handleReschedule} className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-blue-800 mb-1">New Date & Time</label>
                      <input 
                        type="datetime-local" 
                        required
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full px-2 py-1.5 border border-blue-200 rounded text-sm focus:ring-blue-500 mb-2"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setRescheduleAppt(null)} className="flex-1 bg-white border border-blue-200 text-blue-700 py-1 rounded text-xs hover:bg-blue-100">Cancel</button>
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-1 rounded text-xs hover:bg-blue-700">Save</button>
                      </div>
                    </form>
                  )}
                </div>

                {appt.status === 'SCHEDULED' && rescheduleAppt !== appt.id && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50">
                    {activeApptId !== appt.id ? (
                      <button 
                        onClick={() => setActiveApptId(appt.id)}
                        className="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 transition"
                      >
                        Complete & Write Summary
                      </button>
                    ) : (
                      <form onSubmit={handleSubmitSummary} className="space-y-3 animate-in slide-in-from-bottom-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Doctor's Notes (Private)</label>
                          <textarea 
                            required rows="2"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Prescription / Orders</label>
                          <textarea 
                            required rows="2"
                            value={prescription}
                            onChange={e => setPrescription(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-teal-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setActiveApptId(null)} className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm font-medium bg-white text-slate-700">Cancel</button>
                          <button type="submit" disabled={isSubmitting} className="flex-2 px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                            {isSubmitting ? 'Sending...' : 'Generate Patient Summary & Finish'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
                
                {appt.status === 'COMPLETED' && (
                  <div className="p-5 border-t border-slate-100 bg-teal-50">
                    <p className="text-xs text-teal-800 font-medium">Summary sent to patient.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: BOOK FOR PATIENT */}
        {activeTab === 'book for patient' && (
          <div className="animate-in fade-in duration-300 max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Schedule on Behalf of Patient</h2>
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
                  <select 
                    required
                    value={bookingPatientId}
                    onChange={e => setBookingPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  >
                    <option value="" disabled>Choose a patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.user.name} ({p.user.email})</option>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms / Reason</label>
                  <textarea 
                    required rows="4"
                    value={bookingSymptoms}
                    onChange={e => setBookingSymptoms(e.target.value)}
                    placeholder="Describe the reason for the visit..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  ></textarea>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isBooking}
                    className="w-full bg-teal-600 text-white rounded-lg py-2.5 font-medium hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {isBooking ? 'Processing...' : 'Confirm Appointment & Notify Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE LEAVES */}
        {activeTab === 'manage leaves' && (
          <div className="animate-in fade-in duration-300 max-w-xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Mark Leave Day</h2>
              <p className="text-sm text-slate-500 mb-6">
                Selecting a leave date will instantly cancel all existing appointments for that day and automatically email the affected patients. It will also block new bookings for that date.
              </p>
              
              <form onSubmit={handleMarkLeave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Leave</label>
                  <input 
                    type="date"
                    required
                    value={leaveDate}
                    onChange={e => setLeaveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isLeaving}
                    className="w-full bg-red-600 text-white rounded-lg py-2.5 font-medium hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {isLeaving ? 'Processing...' : 'Confirm Leave & Cancel Appointments'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default DoctorDashboard;
