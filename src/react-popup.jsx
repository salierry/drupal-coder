import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

function PopupForm({ onClose }) {
  const popupRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('50% 50%');

  const [formData, setFormData] = useState(() => {
    return {
      name: localStorage.getItem('popup_name') || '',
      phone: localStorage.getItem('popup_phone') || '',
      email: localStorage.getItem('popup_email') || '',
      message: localStorage.getItem('popup_message') || ''
    };
  });

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  
  function calculatePosition() {
    try {
      const buttonRect = JSON.parse(localStorage.getItem('popupButtonRect') || '{}');
      if (buttonRect.top && buttonRect.left) {
        const centerX = buttonRect.left + buttonRect.width / 2;
        const centerY = buttonRect.top + buttonRect.height / 2;
        
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        
        const originX = ((centerX - viewportCenterX) / viewportCenterX) * 50 + 50;
        const originY = ((centerY - viewportCenterY) / viewportCenterY) * 50 + 50;
        
        return `${Math.max(10, Math.min(90, originX))}% ${Math.max(10, Math.min(90, originY))}%`;
      }
    } catch (e) {
      console.error('Error calculating position:', e);
    }
    return '50% 50%';
  }

 
  useEffect(() => {
    const origin = calculatePosition();
    setTransformOrigin(origin);

    const popupElement = popupRef.current;
    if (!popupElement) return;

    popupElement.style.transformOrigin = origin;

    let animationFrame;
    let progress = 0;

    function animate() {
      progress += 0.1;
      const scale = Math.min(progress, 1);
      const opacity = Math.min(progress, 1);
      
      popupElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      popupElement.style.opacity = opacity;

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setVisible(true);
      }
    }

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

 
  useEffect(() => {
    localStorage.setItem('popup_name', formData.name);
    localStorage.setItem('popup_phone', formData.phone);
    localStorage.setItem('popup_email', formData.email);
    localStorage.setItem('popup_message', formData.message);
  }, [formData]);


  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setStatus('');
  
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);
      submitData.append('message', formData.message);
      submitData.append('form_type', 'popup_contact');
      
      // Используем window.FORM_ENDPOINT с fallback
      const formEndpoint = window.FORM_ENDPOINT || "https://formcarry.com/s/0VNi-UehV3I";
      console.log('Sending form to:', formEndpoint);
  
      const response = await fetch(formEndpoint, {
        method: 'POST',
        body: submitData
      });
  
      let result;
      
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (responseText) {
          result = JSON.parse(responseText);
        } else {
          result = { code: 200, status: 'success' };
        }
      } catch (parseError) {
        console.log('JSON parse failed, but form was submitted');
        if (response.ok) {
          result = { code: 200, status: 'success' };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      console.log('Formcarry response:', result);
  
      if (result.code === 200 || response.status === 200 || response.status === 406) {
        setStatus('Отправлено! Мы свяжемся с вами в течение 15 минут');
        
        // Clear form and localStorage
        setFormData({ 
          name: '', 
          phone: '', 
          email: '', 
          message: '' 
        });
        
        ['popup_name', 'popup_phone', 'popup_email', 'popup_message']
          .forEach(key => localStorage.removeItem(key));
        
        setTimeout(() => {
          closePopup();
        }, 3000);
      } else {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      if (error.message.includes('406')) {
        setStatus('Отправлено! Мы свяжемся с вами в течение 15 минут');
        setFormData({ 
          name: '', 
          phone: '', 
          email: '', 
          message: '' 
        });
        setTimeout(() => {
          closePopup();
        }, 3000);
      } else {
        setStatus('Ошибка при отправке. Пожалуйста, попробуйте снова или свяжитесь с нами по телефону 8 800 222-26-73');
      }
    } finally {
      setSending(false);
    }
  }
  
  function closePopup() {
    let animationFrame;
    let progress = 1;
    setVisible(false);

    const popupElement = popupRef.current;
    if (!popupElement) {
      onClose();
      return;
    }

    function animate() {
      progress -= 0.1;
      const scale = Math.max(progress, 0);
      const opacity = Math.max(progress, 0);
      
      popupElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      popupElement.style.opacity = opacity;

      if (progress > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        onClose();
      }
    }

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }

  // Close on ESC and focus management
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closePopup();
    }
    
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus management
  useEffect(() => {
    if (visible && popupRef.current) {
      const focusableElements = popupRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      function trapFocus(e) {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      }

      if (firstElement) {
        firstElement.focus();
        popupRef.current.addEventListener('keydown', trapFocus);
      }

      return () => {
        if (popupRef.current) {
          popupRef.current.removeEventListener('keydown', trapFocus);
        }
      };
    }
  }, [visible]);

  return (
    <div 
      className="popup-wrapper modern-popup" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="popup-title"
      aria-describedby="popup-description"
    >
      <div 
        className="popup-bg modern-popup-bg" 
        onClick={closePopup}
        role="button"
        aria-label="Закрыть всплывающее окно"
        tabIndex="0"
        onKeyDown={(e) => e.key === 'Enter' && closePopup()}
      ></div>

      <div 
        className="popup-window modern-popup-window" 
        ref={popupRef}
        style={{ transformOrigin }}
        role="document"
      >
        <div className="popup-header">
          <h2 id="popup-title">Обсудить проект</h2>
          <p id="popup-description">Заполните форму и мы свяжемся с вами в течение 15 минут</p>
        </div>

        <form onSubmit={submit} noValidate className="modern-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="popup-name" className="form-label">
                Ваше имя *
              </label>
              <input
                id="popup-name"
                type="text"
                value={formData.name}
                required
                aria-required="true"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={sending}
                className="form-input"
                placeholder="Иван Иванов"
              />
            </div>

            <div className="form-group">
              <label htmlFor="popup-phone" className="form-label">
                Телефон *
              </label>
              <input
                id="popup-phone"
                type="tel"
                value={formData.phone}
                required
                aria-required="true"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={sending}
                className="form-input"
                placeholder="+7 (999) 999-99-99"
              />
            </div>

            <div className="form-group">
              <label htmlFor="popup-email" className="form-label">
                Email
              </label>
              <input
                id="popup-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={sending}
                className="form-input"
                placeholder="ivan@company.ru"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="popup-message" className="form-label">
                Опишите вашу задачу *
              </label>
              <textarea
                id="popup-message"
                value={formData.message}
                required
                aria-required="true"
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                disabled={sending}
                className="form-textarea"
                rows="4"
                placeholder="Расскажите о вашем проекте и задачах, которые нужно решить..."
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={sending}
            aria-busy={sending}
            className="submit-btn modern-submit-btn"
          >
            {sending ? (
              <>
                <span className="loading" aria-hidden="true"></span>
                Отправляем...
              </>
            ) : (
              'Отправить заявку'
            )}
          </button>

          {status && (
            <div 
              className="popup-status modern-popup-status" 
              role="status"
              aria-live="polite"
            >
              {status}
            </div>
          )}
        </form>

        <button 
          className="popup-close modern-popup-close" 
          onClick={closePopup}
          aria-label="Закрыть всплывающее окно"
          disabled={sending}
        >
          ×
        </button>
      </div>

      <style>
        {`
        .modern-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }
        
        .modern-popup-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          animation: fadeIn 0.3s ease;
          cursor: pointer;
        }
        
        .modern-popup-window {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          background: #1a1a1a;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        
        .popup-header {
          padding: 2rem 2rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }
        
        .popup-header h2 {
          margin: 0 0 0.5rem 0;
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .popup-header p {
          margin: 0;
          color: #8c939d;
          font-size: 0.9rem;
        }
        
        .modern-form {
          padding: 1.5rem 2rem 2rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        
        .form-label {
          margin-bottom: 0.5rem;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .form-input,
        .form-textarea {
          padding: 0.75rem 1rem;
          background: #2d2d2d;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #ffffff;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          font-family: inherit;
        }
        
        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #ff6b00;
          box-shadow: 0 0 0 2px rgba(255, 107, 0, 0.2);
        }
        
        .form-input:disabled,
        .form-textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .modern-submit-btn {
          width: 100%;
          padding: 1rem 2rem;
          background: #ff6b00;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .modern-submit-btn:hover:not(:disabled) {
          background: #e65c00;
          transform: translateY(-1px);
        }
        
        .modern-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .modern-popup-status {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 6px;
          text-align: center;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        
        .modern-popup-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #ffffff;
          font-size: 1.5rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .modern-popup-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .modern-popup-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .loading {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .modern-popup-window {
            width: 95%;
            max-height: 95vh;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .popup-header,
          .modern-form {
            padding: 1.5rem;
          }
        }
        
        @media (max-width: 480px) {
          .modern-popup-window {
            width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }
        }
        `}
      </style>
    </div>
  );
}

export function AppRouter() {
  const [popupOpen, setPopupOpen] = useState(false);

  // Open popup event listener
  useEffect(() => {
    function openPopup() {
      setPopupOpen(true);
      history.pushState({ popup: true }, '', '#contact');
    }
    
    window.addEventListener('open-react-popup', openPopup);
    return () => {
      window.removeEventListener('open-react-popup', openPopup);
    };
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      if (location.hash === '#contact') {
        setPopupOpen(true);
      } else {
        setPopupOpen(false);
      }
    }

    window.addEventListener('popstate', handlePopState);
    
    // Check initial state
    if (location.hash === '#contact') {
      setPopupOpen(true);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  function closePopup() {
    setPopupOpen(false);
    if (location.hash === '#contact') {
      history.back();
    }
  }

  return (
    <>
      {popupOpen && <PopupForm onClose={closePopup} />}
    </>
  );
}