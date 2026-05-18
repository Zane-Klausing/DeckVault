import { NavLink, useMatch } from 'react-router-dom';
import './NavBar.css';

/**
 * NavItem wraps NavLink to expose aria-current="page" on the active link.
 * React Router v7 does not forward function values to arbitrary DOM props,
 * so useMatch is used to detect the active route instead.
 */
function NavItem({ to, children }) {
  const match = useMatch(to);
  return (
    <NavLink to={to} aria-current={match ? 'page' : undefined}>
      {children}
    </NavLink>
  );
}

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <span className="navbar-brand">DeckVault</span>
      <div className="navbar-links">
        <NavItem to="/collection">Collection</NavItem>
        <NavItem to="/decks">Decks</NavItem>
        <NavItem to="/dashboard">Dashboard</NavItem>
      </div>
    </nav>
  );
}
