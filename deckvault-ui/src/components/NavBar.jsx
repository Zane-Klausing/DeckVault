// NavLink is like a regular anchor tag but aware of the current route —
// it automatically applies an "active" class when its href matches the current URL.
// useMatch lets us detect the active route manually for custom ARIA attributes.
import { NavLink, useMatch } from 'react-router-dom';
import './NavBar.css';

/**
 * NavItem wraps NavLink to expose aria-current="page" on the active link.
 * React Router v7 does not forward function values to arbitrary DOM props,
 * so useMatch is used to detect the active route instead.
 */
// NavItem is a small helper component — a reusable building block just for this file.
// It wraps NavLink and adds the aria-current attribute for accessibility.
// { to, children } uses destructuring to pull props out — like named parameters.
function NavItem({ to, children }) {
  // useMatch returns a match object if the current URL matches `to`, or null if not
  const match = useMatch(to);
  return (
    // aria-current="page" signals to screen readers which nav link is the current page
    <NavLink to={to} aria-current={match ? 'page' : undefined}>
      {children}
    </NavLink>
  );
}

export default function NavBar() {
  return (
    // aria-label distinguishes this nav from any other <nav> elements on the page
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
