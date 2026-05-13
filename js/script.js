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
  window.addEventListener("resize", updateProgress);
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
});
