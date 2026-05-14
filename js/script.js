/**
 * ═══════════════════════════════════════════════════════════════
 * MANUEL SILVESTRE — PORTFOLIO  |  script.js
 *
 * Modules (class-based, ES2022):
 *  1. HeroScene      — Three.js animated background
 *  2. CustomCursor   — Magnetic cursor with trailer
 *  3. Navigation     — Scroll behavior + mobile drawer
 *  4. TypingEffect   — Typewriter for hero role text
 *  5. ScrollReveal   — IntersectionObserver reveal system
 *  6. CounterAnim    — Animated stat numbers
 *  7. ProjectTilt    — Pointer-follow 3D perspective tilt
 *  8. TimelineAnim   — Draws timeline track on scroll
 *  9. ScrollProgress — Top progress bar
 * 10. ContactForm    — Front-end form validation + mailto
 * ═══════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';

/* ─────────────────────────────────────────────
   UTILITY — lerp
───────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;

/* ══════════════════════════════════════════════
   1. THREE.JS HERO SCENE
   Deep-space background with:
   — 2 000 static star points
   — 3 500 coloured particles (cyan / purple / blue)
   — 6 floating wireframe geometries
   — Smooth mouse-driven camera parallax
══════════════════════════════════════════════ */
class HeroScene {
  constructor() {
    this.canvas = document.getElementById('hero-canvas');
    if (!this.canvas) return;

    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.isMobile = this.W < 768;

    this.mouseTarget = { x: 0, y: 0 };
    this.mouseCurrent = { x: 0, y: 0 };
    this.clock = new THREE.Clock();
    this.meshes = [];          // { mesh, rotSpeed, floatBase, floatAmp, floatSpeed, floatOffset }
    this.running = true;
    this.raf = null;

    this._build();
    this._bindEvents();
    this._animate();
  }

  _build() {
    /* ── Renderer ── */
    this.renderer = new THREE.WebGLRenderer({
      canvas:           this.canvas,
      alpha:            false,
      antialias:        false,
      powerPreference:  'high-performance',
    });
    this.renderer.setSize(this.W, this.H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050816, 1);

    /* ── Scene & Camera ── */
    this.scene  = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050816, 0.012);

    this.camera = new THREE.PerspectiveCamera(60, this.W / this.H, 0.1, 500);
    this.camera.position.z = 30;

    /* ── Lights ── */
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const l1 = new THREE.PointLight(0x00d4ff, 4, 80);
    l1.position.set(12, 12, 8);
    this.scene.add(l1);

    const l2 = new THREE.PointLight(0x7b2fff, 3, 80);
    l2.position.set(-12, -12, -8);
    this.scene.add(l2);

    /* ── Stars (static white dots far away) ── */
    this._buildStars(2000);

    /* ── Coloured particle field ── */
    this._buildParticles(this.isMobile ? 1400 : 3200);

    /* ── Floating wireframe geometries ── */
    this._buildGeometries();
  }

  _buildStars(count) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 300;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, transparent: true, opacity: 0.55 });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  _buildParticles(count) {
    const pos    = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Four possible colors: cyan, purple, blue, white
    const palette = [
      [0.00, 0.83, 1.00],  // #00d4ff  cyan
      [0.48, 0.18, 1.00],  // #7b2fff  purple
      [0.26, 0.53, 1.00],  // #4288ff  blue
      [1.00, 1.00, 1.00],  // white
    ];

    for (let i = 0; i < count; i++) {
      // Distribute particles inside a sphere shell (not bunched at center)
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 18 + Math.random() * 48;

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi) - 15; // push slightly behind camera

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size:           0.22,
      vertexColors:   true,
      transparent:    true,
      opacity:        0.82,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _buildGeometries() {
    const configs = [
      {
        geo:     new THREE.IcosahedronGeometry(2.8, 1),
        color:   0x00d4ff,
        opacity: 0.22,
        pos:     [9, 4, -12],
      },
      {
        geo:     new THREE.OctahedronGeometry(1.8, 0),
        color:   0x7b2fff,
        opacity: 0.28,
        pos:     [-11, -3, -16],
      },
      {
        geo:     new THREE.TorusGeometry(2.4, 0.18, 8, 60),
        color:   0x00d4ff,
        opacity: 0.18,
        pos:     [14, -6, -22],
      },
      {
        geo:     new THREE.TetrahedronGeometry(2, 0),
        color:   0xff006e,
        opacity: 0.22,
        pos:     [-8, 6, -13],
      },
      {
        geo:     new THREE.DodecahedronGeometry(1.5, 0),
        color:   0x00ffaa,
        opacity: 0.2,
        pos:     [1, -9, -10],
      },
      {
        geo:     new THREE.TorusKnotGeometry(1.3, 0.28, 60, 8),
        color:   0x7b2fff,
        opacity: 0.18,
        pos:     [-16, 1, -28],
      },
    ];

    configs.forEach(({ geo, color, opacity, pos }) => {
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe:   true,
        transparent: true,
        opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(mesh);

      this.meshes.push({
        mesh,
        rotSpeed:    { x: (Math.random() - 0.5) * 0.009, y: (Math.random() - 0.5) * 0.013 },
        floatBase:   pos[1],
        floatAmp:    0.35 + Math.random() * 0.9,
        floatSpeed:  0.25 + Math.random() * 0.45,
        floatOffset: Math.random() * Math.PI * 2,
      });
    });
  }

  _bindEvents() {
    /* Mouse parallax */
    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      this.mouseTarget.x =  (clientX / window.innerWidth  - 0.5);
      this.mouseTarget.y = -(clientY / window.innerHeight - 0.5);
    }, { passive: true });

    /* Resize */
    window.addEventListener('resize', () => {
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.W, this.H);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }, { passive: true });

    /* Pause when hero is off-screen (performance) */
    const hero = document.getElementById('hero');
    if (hero) {
      const io = new IntersectionObserver(([e]) => {
        this.running = e.isIntersecting;
      }, { threshold: 0 });
      io.observe(hero);
    }
  }

  _animate() {
    this.raf = requestAnimationFrame(() => this._animate());

    if (!this.running) return;

    const t = this.clock.getElapsedTime();

    /* Lerp mouse camera parallax */
    this.mouseCurrent.x = lerp(this.mouseCurrent.x, this.mouseTarget.x, 0.04);
    this.mouseCurrent.y = lerp(this.mouseCurrent.y, this.mouseTarget.y, 0.04);
    this.camera.position.x = this.mouseCurrent.x * 6;
    this.camera.position.y = this.mouseCurrent.y * 4;
    this.camera.lookAt(this.scene.position);

    /* Slowly rotate the whole particle sphere */
    if (this.particles) {
      this.particles.rotation.y = t * 0.016;
      this.particles.rotation.x = Math.sin(t * 0.008) * 0.06;
    }

    /* Gentle star drift */
    if (this.stars) {
      this.stars.rotation.y = t * 0.004;
    }

    /* Animate each wireframe object */
    this.meshes.forEach(({ mesh, rotSpeed, floatBase, floatAmp, floatSpeed, floatOffset }) => {
      mesh.rotation.x += rotSpeed.x;
      mesh.rotation.y += rotSpeed.y;
      mesh.position.y = floatBase + Math.sin(t * floatSpeed + floatOffset) * floatAmp;
    });

    this.renderer.render(this.scene, this.camera);
  }
}

/* ══════════════════════════════════════════════
   2. CUSTOM CURSOR
   — dot follows pointer exactly
   — trailer lags behind (CSS lerp via transition)
   — Swap class on hoverable elements
══════════════════════════════════════════════ */
class CustomCursor {
  constructor() {
    this.dot      = document.getElementById('cursor');
    this.trailer  = document.getElementById('cursor-trailer');
    if (!this.dot || !this.trailer) return;

    // Hide on touch devices
    if (!window.matchMedia('(pointer: fine)').matches) {
      this.dot.style.display = 'none';
      this.trailer.style.display = 'none';
      return;
    }

    this._bind();
  }

  _bind() {
    const { dot, trailer } = this;
    let rx = 0, ry = 0; // raw mouse coords

    /* Instant dot position via direct style (no CSS transition) */
    document.addEventListener('mousemove', ({ clientX: x, clientY: y }) => {
      rx = x; ry = y;
      dot.style.left = `${x}px`;
      dot.style.top  = `${y}px`;
      // Trailer uses CSS transition for natural lag
      trailer.style.left = `${x}px`;
      trailer.style.top  = `${y}px`;
    }, { passive: true });

    /* Hover state — expand trailer, shrink dot */
    const hoverEls = document.querySelectorAll(
      'a, button, [data-project], .tech-card, .proj-card, .ci-link, .social-btn'
    );
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    /* Hide when leaving window */
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      trailer.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      trailer.style.opacity = '1';
    });
  }
}

/* ══════════════════════════════════════════════
   3. NAVIGATION
   — Glassmorphism on scroll
   — Active link tracking
   — Mobile drawer open/close
   — Smooth scroll-to-section
══════════════════════════════════════════════ */
class Navigation {
  constructor() {
    this.nav      = document.getElementById('nav');
    this.toggle   = document.getElementById('nav-toggle');
    this.drawer   = document.getElementById('nav-mobile');
    this.links    = document.querySelectorAll('.nav-link');
    this.mobileLinks = document.querySelectorAll('.mobile-link');
    this.sections = document.querySelectorAll('section[id]');

    // Create backdrop overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'nav-overlay';
    document.body.appendChild(this.overlay);

    this._bindScroll();
    this._bindMobile();
    this._bindLinks();
  }

  _bindScroll() {
    const onScroll = () => {
      const scrolled = window.scrollY > 60;
      this.nav.classList.toggle('scrolled', scrolled);
      this._setActiveLink();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  _setActiveLink() {
    let current = '';
    const mid = window.innerHeight * 0.4;

    this.sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= mid && rect.bottom >= mid) {
        current = sec.id;
      }
    });

    this.links.forEach(link => {
      const active = link.dataset.section === current;
      link.classList.toggle('active', active);
    });
  }

  _bindMobile() {
    const open = () => {
      this.drawer.classList.add('open');
      this.drawer.setAttribute('aria-hidden', 'false');
      this.toggle.setAttribute('aria-expanded', 'true');
      this.overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      this.drawer.classList.remove('open');
      this.drawer.setAttribute('aria-hidden', 'true');
      this.toggle.setAttribute('aria-expanded', 'false');
      this.overlay.classList.remove('show');
      document.body.style.overflow = '';
    };

    this.toggle.addEventListener('click', () => {
      const isOpen = this.drawer.classList.contains('open');
      isOpen ? close() : open();
    });

    this.overlay.addEventListener('click', close);

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    /* Close drawer when a mobile link is clicked */
    this.mobileLinks.forEach(link => {
      link.addEventListener('click', close);
    });
  }

  _bindLinks() {
    /* Smooth scroll for all internal anchor links */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
}

/* ══════════════════════════════════════════════
   4. TYPING EFFECT
   Typewriter for role titles in hero section
══════════════════════════════════════════════ */
class TypingEffect {
  constructor() {
    this.el = document.getElementById('typed-text');
    if (!this.el) return;

    this.roles = [
      'Backend Developer',
      'Full Stack Engineer',
      'System Architect',
      'API Developer',
      'Automation Enthusiast',
    ];

    this.roleIndex   = 0;
    this.charIndex   = 0;
    this.isDeleting  = false;
    this.typeSpeed   = 80;
    this.deleteSpeed = 45;
    this.pauseAfter  = 2200;
    this.pauseStart  = 600;

    this._tick();
  }

  _tick() {
    const current = this.roles[this.roleIndex];

    if (this.isDeleting) {
      this.el.textContent = current.substring(0, --this.charIndex);
    } else {
      this.el.textContent = current.substring(0, ++this.charIndex);
    }

    let delay = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

    if (!this.isDeleting && this.charIndex === current.length) {
      delay = this.pauseAfter;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.roleIndex  = (this.roleIndex + 1) % this.roles.length;
      delay = this.pauseStart;
    }

    setTimeout(() => this._tick(), delay);
  }
}

/* ══════════════════════════════════════════════
   5. SCROLL REVEAL
   IntersectionObserver adds .visible to .reveal
   elements as they enter the viewport
══════════════════════════════════════════════ */
class ScrollReveal {
  constructor() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    this.io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.io.unobserve(entry.target); // animate only once
        }
      });
    }, {
      threshold:  0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    items.forEach(el => this.io.observe(el));
  }
}

/* ══════════════════════════════════════════════
   6. COUNTER ANIMATION
   Counts from 0 to data-count when in view
══════════════════════════════════════════════ */
class CounterAnim {
  constructor() {
    const cards = document.querySelectorAll('.stat-card');
    if (!cards.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const el   = card.querySelector('.stat-val');
        if (!el || card.dataset.counted) return;

        card.dataset.counted = 'true';
        card.classList.add('counted');
        io.unobserve(card);

        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const dur    = 1400;
        const start  = performance.now();

        const step = (now) => {
          const progress = Math.min((now - start) / dur, 1);
          // Ease-out quad
          const ease   = 1 - (1 - progress) ** 3;
          const current = Math.floor(ease * target);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        };

        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });

    cards.forEach(c => io.observe(c));
  }
}

/* ══════════════════════════════════════════════
   7. PROJECT CARD 3D TILT
   Pointer-follow perspective transform on hover
══════════════════════════════════════════════ */
class ProjectTilt {
  constructor() {
    const cards = document.querySelectorAll('.proj-card');
    if (!cards.length) return;

    // Skip on touch devices
    if (!window.matchMedia('(pointer: fine)').matches) return;

    cards.forEach(card => this._attach(card));
  }

  _attach(card) {
    const INTENSITY = 12; // max tilt degrees
    const GLARE     = true;

    const inner = card.querySelector('.proj-inner');
    if (!inner) return;

    card.addEventListener('mousemove', ({ clientX, clientY }) => {
      const rect = card.getBoundingClientRect();
      const cx   = (clientX - rect.left) / rect.width  - 0.5;  // -0.5 → 0.5
      const cy   = (clientY - rect.top)  / rect.height - 0.5;

      const rx = -cy * INTENSITY;
      const ry =  cx * INTENSITY;

      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;

      if (GLARE) {
        const gx = (cx + 0.5) * 100;
        const gy = (cy + 0.5) * 100;
        inner.style.background = `
          radial-gradient(circle at ${gx}% ${gy}%,
            rgba(255,255,255,.04) 0%,
            transparent 60%),
          var(--bg-2)
        `;
      }
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      inner.style.background = '';
    });
  }
}

/* ══════════════════════════════════════════════
   8. TIMELINE ANIMATION
   Fills the vertical track line proportionally
   as the user scrolls through the section
══════════════════════════════════════════════ */
class TimelineAnim {
  constructor() {
    this.section  = document.getElementById('education');
    this.progress = document.getElementById('timeline-progress');
    if (!this.section || !this.progress) return;

    window.addEventListener('scroll', () => this._update(), { passive: true });
    this._update();
  }

  _update() {
    const rect   = this.section.getBoundingClientRect();
    const start  = rect.top;
    const end    = rect.bottom - window.innerHeight;
    const ratio  = Math.min(Math.max(-start / (rect.height - window.innerHeight), 0), 1);
    this.progress.style.height = `${ratio * 100}%`;
  }
}

/* ══════════════════════════════════════════════
   9. SCROLL PROGRESS BAR
   Top bar fills proportionally with page scroll
══════════════════════════════════════════════ */
class ScrollProgress {
  constructor() {
    this.bar = document.getElementById('scroll-progress');
    if (!this.bar) return;
    window.addEventListener('scroll', () => this._update(), { passive: true });
  }

  _update() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const pct = (scrollTop / (scrollHeight - clientHeight)) * 100;
    this.bar.style.width = `${pct}%`;
  }
}

/* ══════════════════════════════════════════════
  10. MOUSE GLOW FOLLOWER
   Radial glow blob follows the cursor in the hero
══════════════════════════════════════════════ */
class MouseGlow {
  constructor() {
    this.blob = document.getElementById('mouse-glow');
    if (!this.blob) return;

    document.addEventListener('mousemove', ({ clientX, clientY }) => {
      this.blob.style.left = `${clientX}px`;
      this.blob.style.top  = `${clientY}px`;
    }, { passive: true });
  }
}

/* ══════════════════════════════════════════════
  11. CONTACT FORM
   Front-end validation + mailto fallback.
   In a production setup, replace the submit
   handler body with a fetch() to your API.
══════════════════════════════════════════════ */
class ContactForm {
  constructor() {
    this.form    = document.getElementById('contact-form');
    this.success = document.getElementById('form-success');
    this.submit  = document.getElementById('form-submit');
    if (!this.form) return;
    this._bind();
  }

  _validate() {
    let valid = true;

    const fields = [
      { id: 'c-name',    type: 'text',  label: 'Name'    },
      { id: 'c-email',   type: 'email', label: 'Email'   },
      { id: 'c-subject', type: 'text',  label: 'Subject' },
      { id: 'c-message', type: 'text',  label: 'Message' },
    ];

    fields.forEach(({ id, type, label }) => {
      const input = document.getElementById(id);
      const err   = input?.nextElementSibling;
      if (!input) return;

      input.style.borderColor = '';

      if (!input.value.trim()) {
        if (err) err.textContent = `${label} is required.`;
        input.style.borderColor = '#ff4a4a';
        valid = false;
      } else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        if (err) err.textContent = 'Please enter a valid email address.';
        input.style.borderColor = '#ff4a4a';
        valid = false;
      } else {
        if (err) err.textContent = '';
      }
    });

    return valid;
  }

  _bind() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this._validate()) return;

      /* Show loading state */
      const label  = this.submit.querySelector('.btn-label');
      const loader = this.submit.querySelector('.btn-loader');
      label.style.display  = 'none';
      loader.style.display = 'inline-flex';
      this.submit.disabled = true;

      /* Simulate async delay (replace with real API call) */
      await new Promise(r => setTimeout(r, 1200));

      /* Build mailto as graceful fallback */
      const name    = document.getElementById('c-name')?.value || '';
      const email   = document.getElementById('c-email')?.value || '';
      const subject = document.getElementById('c-subject')?.value || '';
      const message = document.getElementById('c-message')?.value || '';

      const mailtoLink = `mailto:manuelsilvestre@email.com`
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;

      // Open mail client in background
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      /* Reset UI */
      label.style.display  = '';
      loader.style.display = 'none';
      this.submit.disabled = false;
      this.form.reset();
      this.success.classList.add('show');

      setTimeout(() => this.success.classList.remove('show'), 5000);
    });

    /* Clear errors on input */
    this.form.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => {
        el.style.borderColor = '';
        const err = el.nextElementSibling;
        if (err?.classList.contains('form-err')) err.textContent = '';
      });
    });
  }
}

/* ══════════════════════════════════════════════
  12. TECH CARD TILT (lighter version)
  Subtle tilt on technology cards
══════════════════════════════════════════════ */
class TechTilt {
  constructor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.tech-card').forEach(card => {
      card.addEventListener('mousemove', ({ clientX, clientY }) => {
        const rect = card.getBoundingClientRect();
        const cx   = (clientX - rect.left) / rect.width  - 0.5;
        const cy   = (clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = `perspective(400px) rotateX(${-cy * 8}deg) rotateY(${cx * 8}deg) translateY(-6px) scale(1.02)`;
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
}

/* ══════════════════════════════════════════════
  13. BORDER ANGLE ANIMATION
  Rotates the conic-gradient angle on proj cards
  for an animated neon border effect on hover
══════════════════════════════════════════════ */
class BorderRotate {
  constructor() {
    this.cards = [...document.querySelectorAll('.proj-card')];
    if (!this.cards.length) return;

    this.angles = new Map(this.cards.map(c => [c, 0]));
    this.active = new Set();
    this._loop();

    this.cards.forEach(card => {
      card.addEventListener('mouseenter', () => this.active.add(card));
      card.addEventListener('mouseleave', () => this.active.delete(card));
    });
  }

  _loop() {
    this.active.forEach(card => {
      const a = (this.angles.get(card) + 2) % 360;
      this.angles.set(card, a);
      const border = card.querySelector('.proj-glow-border');
      if (border) {
        border.style.background = `conic-gradient(from ${a}deg,
          transparent 0deg,
          #00d4ff 60deg,
          #7b2fff 120deg,
          transparent 180deg)`;
      }
    });
    requestAnimationFrame(() => this._loop());
  }
}

/* ══════════════════════════════════════════════
  14. ANIMATED GRADIENT BACKGROUND
  Slowly shifting ambient gradient across page
══════════════════════════════════════════════ */
class AmbientGradient {
  constructor() {
    this._t = 0;
    this._loop();
  }

  _loop() {
    this._t += 0.004;

    const x1 = 50 + Math.sin(this._t) * 20;
    const y1 = 50 + Math.cos(this._t * 0.7) * 20;
    const x2 = 50 + Math.sin(this._t * 0.5 + 1) * 15;
    const y2 = 50 + Math.cos(this._t * 0.8 + 2) * 15;

    // Just update a CSS custom property — paint is handled via CSS
    document.documentElement.style.setProperty('--grad-x1', `${x1}%`);
    document.documentElement.style.setProperty('--grad-y1', `${y1}%`);

    requestAnimationFrame(() => this._loop());
  }
}

/* ══════════════════════════════════════════════
   BOOTSTRAP — initialise everything on DOM ready
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Core Three.js scene
  const heroScene = new HeroScene();

  // UI interactions
  new CustomCursor();
  new Navigation();
  new TypingEffect();
  new ScrollReveal();
  new CounterAnim();
  new ProjectTilt();
  new TechTilt();
  new TimelineAnim();
  new ScrollProgress();
  new MouseGlow();
  new ContactForm();
  new BorderRotate();
  new AmbientGradient();

  /* ── Entrance animation: hero reveals on first load ── */
  // The reveal elements inside hero use data-delay CSS vars,
  // so they auto-trigger via ScrollReveal on page load since
  // the hero section is already visible. Force trigger for them:
  setTimeout(() => {
    document.querySelectorAll('.hero .reveal').forEach(el => {
      el.classList.add('visible');
    });
  }, 100);
});
