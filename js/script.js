import * as THREE from "./three.module.js";

function initProjectsScene(section, canvas, reducedMotion) {
  if (!section || !canvas || reducedMotion) {
    return null;
  }
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    return null;
  }

  renderer.setClearColor(0x000000, 0);

  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(-0.15, 0.1, 6.4);

  const cluster = new THREE.Group();
  scene.add(cluster);

  const coreGeometry = new THREE.IcosahedronGeometry(1.55, 3);
  const basePositions = Float32Array.from(coreGeometry.attributes.position.array);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7af0b7,
    emissive: 0x113438,
    emissiveIntensity: 1.2,
    roughness: 0.18,
    metalness: 0.08,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });
  const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  cluster.add(coreMesh);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.045, 18, 180),
    new THREE.MeshBasicMaterial({
      color: 0x8c9cff,
      transparent: true,
      opacity: 0.48,
    })
  );
  ring.rotation.x = Math.PI / 2.5;
  ring.rotation.y = Math.PI / 7;
  cluster.add(ring);

  const particleCount = 360;
  const particlePositions = new Float32Array(particleCount * 3);

  for (let index = 0; index < particleCount; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2.7 + Math.random() * 1.7;
    const offset = index * 3;

    particlePositions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[offset + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[offset + 2] = radius * Math.cos(phi);
  }

  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      color: 0xc9fff0,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  cluster.add(particles);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
  const keyLight = new THREE.PointLight(0x7af0b7, 24, 16, 2);
  const fillLight = new THREE.PointLight(0x2de2e6, 18, 18, 2);
  const rimLight = new THREE.PointLight(0x8c9cff, 10, 22, 2);

  keyLight.position.set(2.8, 1.6, 5);
  fillLight.position.set(-3.2, -1.8, 4.5);
  rimLight.position.set(-0.6, 3.8, -1.4);
  scene.add(ambientLight, keyLight, fillLight, rimLight);

  let frameId = 0;
  let isVisible = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const startTime = performance.now();

  const getSectionProgress = () => {
    const rect = section.getBoundingClientRect();
    const total = rect.height + window.innerHeight;
    return clamp((window.innerHeight - rect.top) / total, 0, 1);
  };

  const renderFrame = () => {
    const elapsed = (performance.now() - startTime) * 0.001;
    const sectionProgress = getSectionProgress();
    const positions = coreGeometry.attributes.position.array;
    const wobble = 1 + sectionProgress * 0.08;

    for (let index = 0; index < positions.length; index += 3) {
      const baseX = basePositions[index];
      const baseY = basePositions[index + 1];
      const baseZ = basePositions[index + 2];
      const wave = Math.sin(elapsed * 1.7 + baseX * 1.9 + sectionProgress * 5.5) * 0.09;
      const lift = Math.cos(elapsed * 1.35 + baseY * 2.15 - sectionProgress * 4.3) * 0.07;

      positions[index] = baseX * (wobble + wave);
      positions[index + 1] = baseY * (wobble + lift);
      positions[index + 2] = baseZ * (wobble + wave * 0.7);
    }

    coreGeometry.attributes.position.needsUpdate = true;
    cluster.rotation.y = elapsed * 0.28 + sectionProgress * 2.35;
    cluster.rotation.x = 0.35 + sectionProgress * 0.42;
    cluster.position.y = Math.sin(elapsed * 1.2) * 0.12 - sectionProgress * 0.3;
    ring.rotation.z = elapsed * 0.14 + sectionProgress * 1.6;
    particles.rotation.y = -elapsed * 0.08 - sectionProgress * 1.2;
    particles.rotation.x = elapsed * 0.04 + 0.2;
    camera.position.x = -0.25 + sectionProgress * 0.65;
    camera.position.z = 6.4 - sectionProgress * 1.45;

    renderer.render(scene, camera);
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderFrame();
  };

  const tick = () => {
    if (!isVisible) {
      return;
    }

    renderFrame();
    frameId = window.requestAnimationFrame(tick);
  };

  const setVisibility = (nextVisible) => {
    if (nextVisible === isVisible) {
      return;
    }

    isVisible = nextVisible;

    if (isVisible) {
      frameId = window.requestAnimationFrame(tick);
      return;
    }

    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      setVisibility(Boolean(entries[0]?.isIntersecting));
    },
    {
      threshold: 0.08,
    }
  );

  visibilityObserver.observe(section);
  resize();

  return {
    resize,
    destroy() {
      setVisibility(false);
      visibilityObserver.disconnect();
      coreGeometry.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      particlesGeometry.dispose();
      particles.material.dispose();
      coreMaterial.dispose();
      renderer.dispose();
    },
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const revealTargets = document.querySelectorAll(".reveal");
  const navLinks = Array.from(document.querySelectorAll('.navbar a[href^="#"]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const progressBar = document.getElementById("scroll-progress");
  const currentYear = document.getElementById("current-year");
  const copyEmailButton = document.getElementById("copy-email");
  const navCollapse = document.getElementById("siteNav");
  const projectsScene = initProjectsScene(
    document.getElementById("projects"),
    document.getElementById("projects-canvas"),
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));

  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", isActive);
        });
      });
    },
    {
      threshold: 0.45,
      rootMargin: "-15% 0px -45% 0px",
    }
  );

  sections.forEach((section) => activeObserver.observe(section));

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.bootstrap && navCollapse?.classList.contains("show")) {
        const collapse = bootstrap.Collapse.getOrCreateInstance(navCollapse);
        collapse.hide();
      }
    });
  });

  const updateProgress = () => {
    if (!progressBar) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
  };

  let ticking = false;
  const parallaxElements = Array.from(document.querySelectorAll("[data-parallax]"));

  const updateParallax = () => {
    const scrollY = window.scrollY;

    parallaxElements.forEach((element) => {
      const speed = element.dataset.parallax === "slow" ? 0.08 : element.dataset.parallax === "mid" ? 0.14 : 0.2;
      const offset = scrollY * speed;
      element.style.transform = `translate3d(0, ${offset}px, 0)`;
    });

    updateProgress();
    ticking = false;
  };

  const requestFrame = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", () => {
    updateProgress();
    projectsScene?.resize();
  });
  updateProgress();
  updateParallax();

  if (copyEmailButton) {
    copyEmailButton.addEventListener("click", async () => {
      const email = copyEmailButton.dataset.email;
      if (!email) return;

      try {
        await navigator.clipboard.writeText(email);
        copyEmailButton.querySelector("span").textContent = "Email copiado";
        setTimeout(() => {
          copyEmailButton.querySelector("span").textContent = "Copiar email";
        }, 1800);
      } catch (error) {
        window.location.href = `mailto:${email}`;
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    projectsScene?.destroy();
  });
});
