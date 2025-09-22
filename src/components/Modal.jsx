import React from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-go-back" onClick={onClose}>
          ← Go Back
        </button>
        <div className="modal-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
