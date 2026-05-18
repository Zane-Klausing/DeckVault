import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Collection from './pages/Collection';
import Decks from './pages/Decks';
import Dashboard from './pages/Dashboard';
import './App.css';

export default function App() {
  return (
    <Router>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/collection" replace />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  );
}
