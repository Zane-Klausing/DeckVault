// BrowserRouter enables client-side routing using the HTML5 History API —
// page transitions happen without a full server round-trip.
// Routes / Route define which component renders for each URL path.
// Navigate performs a redirect.
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Collection from './pages/Collection';
import Decks from './pages/Decks';
import Dashboard from './pages/Dashboard';
import './App.css';

// Root component — sets up the router and top-level layout.
// In Grails terms, this is like the main layout template that wraps all pages.
export default function App() {
  return (
    // Router wraps everything that needs access to routing — must be an ancestor
    // of any component that uses NavLink, useNavigate, or useMatch
    <Router>
      {/* NavBar renders on every page since it's outside the Routes */}
      <NavBar />
      <main>
        <Routes>
          {/* Redirect the root path to /collection so the app always lands on a real page */}
          <Route path="/" element={<Navigate to="/collection" replace />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  );
}
