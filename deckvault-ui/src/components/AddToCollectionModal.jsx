import { useState, useEffect, useRef } from 'react';
import { addToCollection } from '../api/collection';
import './AddToCollectionModal.css';

const today = () => new Date().toISOString().slice(0, 10);

export default function AddToCollectionModal({ card, onClose, onAdded }) {
  // Fix A: lazy initializer for today()
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(() => today());
  const [error, setError] = useState('');

  // Fix D: ref to focus the first input on mount
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Fix C: close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await addToCollection({
        scryfallId: card.id,
        name: card.name,
        setCode: card.set,
        imageUrl: card.imageUris?.normal ?? null,
        quantity: Number(quantity),
        purchasePrice: Number(price),
        purchaseDate: date,
      });
      onAdded();
      onClose();
    } catch {
      setError('Failed to add card. Please try again.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Fix F: ARIA dialog attributes */}
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title">Add to Collection</h3>
        <p>{card.name} · {card.set.toUpperCase()}</p>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            {/* Fix E: associate label with input via htmlFor/id */}
            <label htmlFor="modal-qty">Quantity</label>
            {/* Fix D: attach firstInputRef; Fix B: store as number */}
            <input
              id="modal-qty"
              ref={firstInputRef}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>
          <div className="modal-field" style={{ marginTop: '0.75rem' }}>
            {/* Fix E: associate label with input via htmlFor/id */}
            <label htmlFor="modal-price">Purchase Price ($)</label>
            <input
              id="modal-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="modal-field" style={{ marginTop: '0.75rem' }}>
            {/* Fix E: associate label with input via htmlFor/id */}
            <label htmlFor="modal-date">Purchase Date</label>
            <input
              id="modal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {/* Fix G: role="alert" for immediate screen reader announcement */}
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
