import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-xl text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">MediCare Manager</h1>
        <p className="text-gray-600 mb-8">Book appointments, get AI summaries, and manage your health effectively.</p>
        <div className="space-y-4">
          <Link to="/login" className="block w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">Login</Link>
          <Link to="/register" className="block w-full bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-300 transition">Register</Link>
        </div>
      </div>
    </div>
  );
}

function Login() {
  return <div className="p-8">Login Page (To be implemented)</div>;
}

function Register() {
  return <div className="p-8">Register Page (To be implemented)</div>;
}

function Dashboard() {
  return <div className="p-8">Dashboard (To be implemented based on role)</div>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
