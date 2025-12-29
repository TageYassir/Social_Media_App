// File: components/Creation/Modal.js
import React from 'react';

export default function Modal({ children, onClose, wide = false }) {
  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div 
        className={`cn-modal-sheet ${wide ? 'cn-modal-wide' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="cn-modal-close" 
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}