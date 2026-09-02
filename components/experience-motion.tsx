"use client";

import { useEffect } from "react";

const revealSelector = [
  ".category-item",
  ".section-heading",
  ".builder-workbench",
  ".product-card",
  ".solutions-copy",
  ".solution-list > a",
  ".branch-map",
  ".commerce-shop-hero > *",
  ".commerce-product-card",
  ".solution-page section > *",
  ".cctv-page section > *",
  ".network-page section > *",
  ".smart-page section > *",
].join(",");

const tiltSelector = ".product-card,.commerce-product-card,.category-item";

export function ExperienceMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("motion-ready");

    const progress = document.querySelector<HTMLElement>(".experience-progress > i");
    const pointer = document.querySelector<HTMLElement>(".experience-pointer");
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
    const homeSections = Array.from(document.querySelectorAll<HTMLElement>("main.site-shell section[id]"));

    revealItems.forEach((item, index) => {
      item.classList.add("motion-reveal");
      item.style.setProperty("--reveal-order", String(index % 6));
    });

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      if (progress) progress.style.transform = "scaleX(1)";
      return () => root.classList.remove("motion-ready");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!current) return;
        const id = (current.target as HTMLElement).id;
        homeSections.forEach((section) => section.classList.toggle("section-active", section.id === id));
        document.querySelectorAll<HTMLElement>("[data-section-link]").forEach((link) => {
          link.classList.toggle("active", link.dataset.sectionLink === id);
        });
      },
      { threshold: [0.18, 0.4, 0.65], rootMargin: "-18% 0px -28% 0px" },
    );
    homeSections.forEach((section, index) => {
      section.style.setProperty("--section-order", String(index));
      sectionObserver.observe(section);
    });

    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const counterTimers: number[] = [];
    counters.forEach((counter, index) => {
      const target = Number(counter.dataset.count || 0);
      const pad = Number(counter.dataset.pad || 0);
      const start = window.setTimeout(() => {
        const startedAt = performance.now();
        const tick = (time: number) => {
          const progressValue = Math.min(1, (time - startedAt) / 950);
          const eased = 1 - Math.pow(1 - progressValue, 3);
          counter.textContent = String(Math.round(target * eased)).padStart(pad, "0");
          if (progressValue < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }, 650 + index * 110);
      counterTimers.push(start);
    });

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const amount = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progress) progress.style.transform = `scaleX(${amount})`;

      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        const speed = Number(element.dataset.parallax || 0.08);
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    updateScroll();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });

    const handlePointer = (event: PointerEvent) => {
      if (!pointer || event.pointerType === "touch") return;
      pointer.style.setProperty("--pointer-x", `${event.clientX}px`);
      pointer.style.setProperty("--pointer-y", `${event.clientY}px`);
      pointer.classList.add("is-active");
    };
    const hidePointer = () => pointer?.classList.remove("is-active");
    window.addEventListener("pointermove", handlePointer, { passive: true });
    document.documentElement.addEventListener("mouseleave", hidePointer);

    const tiltItems = Array.from(document.querySelectorAll<HTMLElement>(tiltSelector));
    const resets = new Map<HTMLElement, () => void>();
    tiltItems.forEach((item) => {
      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        item.style.setProperty("--tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
        item.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
        item.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
        item.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
      };
      const reset = () => {
        item.style.setProperty("--tilt-x", "0deg");
        item.style.setProperty("--tilt-y", "0deg");
      };
      item.addEventListener("pointermove", move, { passive: true });
      item.addEventListener("pointerleave", reset);
      resets.set(item, () => {
        item.removeEventListener("pointermove", move);
        item.removeEventListener("pointerleave", reset);
      });
    });

    return () => {
      observer.disconnect();
      sectionObserver.disconnect();
      counterTimers.forEach((timer) => window.clearTimeout(timer));
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("pointermove", handlePointer);
      document.documentElement.removeEventListener("mouseleave", hidePointer);
      resets.forEach((reset) => reset());
      root.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      <div className="experience-progress" aria-hidden="true"><i /></div>
      <div className="experience-pointer" aria-hidden="true" />
    </>
  );
}
