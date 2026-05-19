// useState manages form field values that change as the user types.
// useEffect runs side effects (focus management, event listeners) after render.
// useRef holds a reference to a DOM element without causing re-renders.
import { useState, useEffect, useRef } from 'react';
import { addToCollection } from '../api/collection';
import './AddToCollectionModal.css';

// Returns today's date in YYYY-MM-DD format — the format HTML date inputs expect
const today = () => new Date().toISOString().slice(0, 10);

// Props:
//   card     — the Scryfall card object the user clicked "Add" on
//   onClose  — callback to close the modal (called on cancel, Escape, or backdrop click)
//   onAdded  — callback to refresh the collection after a successful add
export default function AddToCollectionModal({ card, onClose, onAdded }) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  // Lazy initializer: () => today() is called once on mount, not on every re-render
  const [date, setDate] = useState(() => today());
  const [error, setError] = useState('');

  // useRef gives direct access to the DOM node — used here to focus the first input
  const firstInputRef = useRef(null);

  // Focus the quantity input when the modal opens — improves keyboard usability
  // The empty dependency array [] means this runs once after the first render
  useEffect(() => {
    firstInputRef.current?.focus();  // ?. safely skips if ref isn't attached yet
  }, []);

  // Close the modal when the user presses Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    // Add the listener to the whole document so it fires regardless of focus
    document.addEventListener('keydown', handleKeyDown);
    // Return a cleanup function — React calls this when the component unmounts
    // to prevent the listener from leaking after the modal closes
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();  // prevent the browser's default form submission (page reload)
    setError('');
    try {
      await addToCollection({
        scryfallId: card.id,
        name: card.name,
        setCode: card.set,
        imageUrl: card.imageUris?.normal ?? null,  // ?. safely handles cards without images
        quantity: Number(quantity),
        purchasePrice: Number(price),
        purchaseDate: date,
      });
      onAdded();   // trigger collection refresh in the parent
      onClose();   // close the modal
    } catch {
      setError('Failed to add card. Please try again.');
    }
  }

  return (
    // Clicking the semi-transparent overlay closes the modal
    <div className="modal-overlay" onClick={onClose}>
      {/* role="dialog" and aria-modal tell screen readers this is a modal dialog.
          stopPropagation prevents clicks inside the modal from bubbling up to the overlay. */}
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"  // points to the <h3> below for the accessible name
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title">Add to Collection</h3>
        <p>{card.name} · {card.set.toUpperCase()}</p>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            {/* htmlFor links the label to the input by matching the input's id */}
            <label htmlFor="modal-qty">Quantity</label>
            <input
              id="modal-qty"
              ref={firstInputRef}  // attaches the ref so we can focus this input on mount
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          <div className="modal-field" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="modal-price">Purchase Price ($)</label>
            <input
              id="modal-price"
              type="number"
              min="0"
              step="0.01"  // allows cents (two decimal places)
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="modal-field" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="modal-date">Purchase Date</label>
            <input
              id="modal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {/* role="alert" causes screen readers to announce the error immediately
              without the user needing to navigate to it */}
          {error && <p role="alert" className="modal-error">{error}</p>}
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
