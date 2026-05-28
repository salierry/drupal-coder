'use strict';

class MobileMenu {
    constructor() {
        this.mobileToggle = document.querySelector('.mobile-toggle');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.mobileClose = document.querySelector('.mobile-close');
        this.menuItems = document.querySelectorAll('.mobile-menu-item');
        
        if (!this.mobileToggle || !this.mobileMenu || !this.mobileClose) {
            console.warn('Mobile menu elements not found');
            return;
        }
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.handleResize();
    }
    
    bindEvents() {
        if (!this.mobileToggle || !this.mobileClose) return;
        
        // Mobile menu toggle
        this.mobileToggle.addEventListener('click', () => this.toggle());
        this.mobileClose.addEventListener('click', () => this.close());
        
        // Mobile menu accordion
        this.menuItems.forEach(item => {
            const header = item.querySelector('.mobile-menu-header');
            if (header) {
                header.addEventListener('click', () => this.toggleAccordion(item));
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileMenu.classList.contains('open')) {
                this.close();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.mobileMenu.classList.contains('open') && 
                !this.mobileMenu.contains(e.target) && 
                !this.mobileToggle.contains(e.target)) {
                this.close();
            }
        });
    }
    
    toggle() {
        const isOpen = this.mobileMenu.classList.contains('open');
        if (isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.mobileMenu.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.mobileToggle.setAttribute('aria-expanded', 'true');
        this.mobileMenu.setAttribute('aria-hidden', 'false');
        
        // Add opening animation
        this.mobileMenu.style.transform = 'translateX(0)';
    }
    
    close() {
        this.mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
        this.mobileToggle.setAttribute('aria-expanded', 'false');
        this.mobileMenu.setAttribute('aria-hidden', 'true');
        
        // Close all accordions
        this.menuItems.forEach(item => {
            item.classList.remove('active');
        });
    }
    
    toggleAccordion(item) {
        const isActive = item.classList.contains('active');
        
        // Close all other items
        this.menuItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        
        // Toggle current item
        if (!isActive) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    }
    
    handleResize() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.close();
            }
        });
    }
}

class DropdownMenu {
    constructor() {
        this.dropdowns = document.querySelectorAll('.nav-item.has-dropdown');
        this.init();
    }
    
    init() {
        this.dropdowns.forEach(dropdown => {
            const link = dropdown.querySelector('a');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Mouse events
            dropdown.addEventListener('mouseenter', () => this.openDropdown(dropdown));
            dropdown.addEventListener('mouseleave', () => this.closeDropdown(dropdown));
            
            // Touch events for mobile
            link.addEventListener('touchstart', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    this.toggleDropdown(dropdown);
                }
            });
            
            // Keyboard navigation
            link.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleDropdown(dropdown);
                } else if (e.key === 'Escape') {
                    this.closeDropdown(dropdown);
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-item.has-dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }
    
    openDropdown(dropdown) {
        if (window.innerWidth > 768) {
            this.closeAllDropdowns();
            dropdown.classList.add('open');
        }
    }
    
    closeDropdown(dropdown) {
        if (window.innerWidth > 768) {
            dropdown.classList.remove('open');
        }
    }
    
    toggleDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        this.closeAllDropdowns();
        if (!isOpen) {
            dropdown.classList.add('open');
        }
    }
    
    closeAllDropdowns() {
        this.dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
}

class StickyHeader {
    constructor() {
        this.header = document.querySelector('.header-nav');
        this.hero = document.querySelector('.hero');
        this.init();
    }
    
    init() {
        if (!this.header) return;
        
        this.checkScroll();
        window.addEventListener('scroll', () => this.checkScroll());
        window.addEventListener('resize', () => this.checkScroll());
    }
    
    checkScroll() {
        const scrollY = window.scrollY;
        const heroHeight = this.hero ? this.hero.offsetHeight : 0;
        
        if (scrollY > 100) {
            this.header.style.background = 'rgba(26, 26, 26, 0.95)';
            this.header.style.backdropFilter = 'blur(10px)';
            this.header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            this.header.style.background = 'rgba(26, 26, 26, 0.95)';
            this.header.style.backdropFilter = 'blur(10px)';
            this.header.style.boxShadow = 'none';
        }
    }
}

class FormHandler {
    constructor() {
        this.forms = document.querySelectorAll('form');
        this.init();
    }
    
    init() {
        this.forms.forEach(form => {
            // Bottom form
            if (form.id === 'bottom-form') {
                this.handleBottomForm(form);
            }
            
            // Form validation enhancement
            this.enhanceFormValidation(form);
        });

        // Initialize FAQ functionality
        this.initFAQ();
    }
    
    setFormLoading(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea, button');
        
        if (isLoading) {
            submitBtn.innerHTML = '<span class="loading"></span> Отправка...';
            submitBtn.disabled = true;
            inputs.forEach(input => {
                if (input !== submitBtn) input.disabled = true;
            });
        } else {
            submitBtn.textContent = 'СВЯЖИТЕСЬ С НАМИ';
            submitBtn.disabled = false;
            inputs.forEach(input => {
                input.disabled = false;
            });
        }
    }
    
    handleBottomForm(form) {
        const status = document.getElementById('bottom-form-status');
        const submitBtn = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Update UI
            this.setFormLoading(form, true);
            if (status) {
                status.textContent = '';
                status.className = 'form-status';
            }

            try {
                // Собираем данные вручную из формы
                const name = form.querySelector('[name="name"]').value;
                const phone = form.querySelector('[name="phone"]').value;
                const email = form.querySelector('[name="email"]').value;
                const message = form.querySelector('[name="message"]').value;

                console.log('Form values:', { name, phone, email, message });

                // Отправляем JSON на наш сервер
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, phone, email, message })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    if (status) {
                        status.innerHTML = `
                            <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 5px;">
                                <strong>Форма успешно отправлена!</strong><br>
                                Ваш логин: <strong>${result.login}</strong><br>
                                Ваш пароль: <strong>${result.password}</strong><br>
                                <a href="${result.profile_url}" target="_blank">Перейти в профиль</a>
                            </div>
                        `;
                        status.className = 'form-status success';
                    }
                    form.reset();

                    // Сохраняем credentials в localStorage для возможности входа
                    localStorage.setItem('user_credentials', JSON.stringify({
                        login: result.login,
                        password: result.password
                    }));
                } else {
                    throw new Error(result.detail?.message || result.detail || 'Ошибка при отправке');
                }

            } catch (error) {
                console.error('Form submission error:', error);
                if (status) {
                    status.textContent = 'Ошибка при отправке. Пожалуйста, попробуйте ещё раз или свяжитесь с нами по телефону 8 800 222-26-73';
                    status.className = 'form-status error';
                }
            } finally {
                this.setFormLoading(form, false);
            }
        });
    }
    enhanceFormValidation(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        inputs.forEach(input => {
            input.addEventListener('invalid', () => {
                input.style.borderColor = '#dc3545';
            });
            
            input.addEventListener('input', () => {
                if (input.validity.valid) {
                    input.style.borderColor = '#28a745';
                } else {
                    input.style.borderColor = '';
                }
            });
        });
    }

    initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        });
    }
}

class SmoothScroll {
    constructor() {
        this.init();
    }
    
    init() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                
                if (targetId === '#') return;
                
                const target = document.querySelector(targetId);
                if (target) {
                    const headerHeight = document.querySelector('.header-nav').offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update URL
                    history.pushState(null, null, targetId);
                    
                    // Close mobile menu if open
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu.classList.contains('open')) {
                        mobileMenu.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                }
            });
        });
        
        // Active navigation highlighting
        this.highlightActiveNav();
        window.addEventListener('scroll', () => this.highlightActiveNav());
    }
    
    highlightActiveNav() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-list a[href^="#"]');
        
        let current = '';
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }
}

class ContactButtons {
    constructor() {
        this.contactButtons = document.querySelectorAll('#contact-open, #hero-contact, #cta-contact, .pricing-btn');
        this.init();
    }
    
    init() {
        this.contactButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const rect = e.target.getBoundingClientRect();
                localStorage.setItem('popupButtonRect', JSON.stringify({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                }));
                
                // Trigger React popup
                window.dispatchEvent(new CustomEvent('open-react-popup'));
            });
        });
    }
}

class Animations {
    constructor() {
        this.init();
    }
    
    init() {
        // Intersection Observer for fade-in animations
        if ('IntersectionObserver' in window) {
            this.setupScrollAnimations();
        }
        
        // Hover effects for cards
        this.setupCardInteractions();
    }
    
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        document.querySelectorAll('.service-card, .pricing-card, .case-card, .team-member, .review-card, .faq-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
    
    setupCardInteractions() {
        // Add hover effects to all interactive cards
        const cards = document.querySelectorAll('.service-card, .pricing-card, .case-card, .team-member');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }
}

class PerformanceOptimizer {
    constructor() {
        this.init();
    }
    
    init() {
        this.lazyLoadImages();
        this.throttleScrollEvents();
        this.preloadCriticalResources();
    }
    
    lazyLoadImages() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    throttleScrollEvents() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = setTimeout(() => {
                    scrollTimeout = null;
                    // Handle scroll-based logic here
                }, 100);
            }
        });
    }
    
    preloadCriticalResources() {
        // Preload critical images
        const criticalImages = [];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = src;
            link.as = 'image';
            document.head.appendChild(link);
        });
    }
}

class VideoHandler {
    constructor() {
        this.video = document.querySelector('.hero-new-video');
        this.init();
    }
    
    init() {
        if (!this.video) return;
        
        this.setupVideo();
    }
    
    setupVideo() {
        // Ensure video plays correctly on mobile
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('muted', '');
        
        // Handle video loading
        this.video.addEventListener('loadeddata', () => {
            console.log('Hero video loaded successfully');
        });
        
        this.video.addEventListener('error', () => {
            console.error('Error loading hero video');
            // Fallback to background image if video fails to load
            document.querySelector('.hero-new-with-video').style.backgroundImage = 'url("assets/hero-pattern.svg")';
        });
    }
}

// Global utility function for loading states
window.setLoadingState = (element, isLoading) => {
    if (isLoading) {
        element.disabled = true;
        element.innerHTML = '<span class="loading"></span> ' + element.textContent;
    } else {
        element.disabled = false;
        element.textContent = element.textContent.replace('...', '');
    }
};

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Основная функция инициализации
export function initSite() {
    // Initialize all components
    new MobileMenu();
    new DropdownMenu();
    new StickyHeader();
    new FormHandler();
    new SmoothScroll();
    new ContactButtons();
    new Animations();
    new PerformanceOptimizer();
    new VideoHandler();
    
    console.log('Drupal-coder website initialized successfully');
}