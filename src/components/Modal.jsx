import React from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  className = '', 
  closeOnBackdropClick = false 
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-content ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content-inner">
          {children}
        </div>
        {onClose && (
          <button 
            type="button" 
            className="modal-go-back" 
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal;
