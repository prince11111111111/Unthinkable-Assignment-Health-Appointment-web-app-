import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';

// Protected Route Wrapper
const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  
  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/login" />;
  
  return children;
};

import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Make Login the absolute landing page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Dashboards */}
          <Route path="/patient" element={<ProtectedRoute role="PATIENT"><PatientDashboard /></ProtectedRoute>} />
          <Route path="/doctor" element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          
          {/* Shared Settings Route */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
