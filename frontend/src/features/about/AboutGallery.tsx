"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import exterior from "@/assets/site/home-hero-2.png";
import interior from "@/assets/site/home-hero-3.png";
import viewing from "@/assets/site/home-hero-level18.jpg";
import selling from "@/assets/site/footer.png";
import contact from "@/assets/site/contact.png";
import styles from "@/app/about/about.module.css";

const DESTINATIONS = [
  {
    title: "Explore properties",
    href: "/properties",
    image: exterior,
    alt: "Residence with a pool and an upper balcony",
  },
  {
    title: "Discover locations",
    href: "/locations",
    image: interior,
    alt: "Double-height living and dining space with a mezzanine",
  },
  {
    title: "Request a viewing",
    href: "/book-viewing",
    image: viewing,
    alt: "White-brick residence glowing at dusk with warm interior lighting",
  },
  {
    title: "Sell your property",
    href: "/sell",
    image: selling,
    alt: "Contemporary residence with a timber-clad upper volume",
  },
  {
    title: "Talk to RC Premier",
    href: "/contact",
    image: contact,
    alt: "Dining area beside a staircase in a contemporary home",
  },
] as const;

export function AboutGallery() {
  const rail = useRef<HTMLUListElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  function updateProgress() {
    const element = rail.current;
    const track = progress.current;
    if (!element || !track) return;
    const overflow = element.scrollWidth - element.clientWidth;
    const initial = element.clientWidth / element.scrollWidth;
    const scrolled = Math.min(1, Math.max(0, element.scrollLeft / overflow));
    const fill = overflow > 1 ? initial + scrolled * (1 - initial) : 0;
    (track.firstElementChild as HTMLElement).style.width = `${fill * 100}%`;
    track.dataset.idle = String(overflow <= 1);
  }

  useEffect(() => {
    const element = rail.current!;
    const observer = new ResizeObserver(updateProgress);
    observer.observe(element);
    updateProgress();
    return () => observer.disconnect();
  }, []);

  function move(direction: number) {
    const element = rail.current!;
    const first = element.children[0] as HTMLElement;
    element.scrollBy({
      left:
        direction *
        (first.offsetWidth + parseFloat(getComputedStyle(element).columnGap)),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  function endDrag(event: React.PointerEvent<HTMLUListElement>) {
    if (!drag.current) return;
    suppressClick.current = drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section className={styles.gallery} aria-labelledby="gallery-heading">
      <div className={styles.galleryHeading}>
        <div className={styles.galleryIntro}>
          <h2 id="gallery-heading">Our capabilities</h2>
          <p>
            Explore residential properties, discover locations, arrange viewings, and
            connect directly with RC Premier across Pampanga.
          </p>
        </div>
        <div
          ref={progress}
          className={styles.progress}
          data-idle="true"
          aria-hidden="true"
        >
          <span />
        </div>
      </div>
      <ul
        ref={rail}
        id="about-gallery"
        className={styles.galleryRail}
        data-dragging={dragging}
        aria-label="Explore with RC Premier. Use the left and right arrow keys to scroll."
        tabIndex={0}
        onScroll={updateProgress}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
        onPointerEnter={(event) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover) and (pointer: fine)").matches
          )
            setHovering(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHovering(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          suppressClick.current = false;
          drag.current = {
            x: event.clientX,
            scroll: event.currentTarget.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          if (tooltip.current) {
            const tip = tooltip.current;
            const x = Math.max(
              0,
              Math.min(
                event.clientX - tip.offsetWidth / 2,
                window.innerWidth - tip.offsetWidth,
              ),
            );
            const y = Math.max(
              0,
              Math.min(
                event.clientY - tip.offsetHeight / 2,
                window.innerHeight - tip.offsetHeight,
              ),
            );
            tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          }
          const active = drag.current;
          if (!active) return;
          const delta = event.clientX - active.x;
          if (!active.moved && Math.abs(delta) > 6) {
            active.moved = true;
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (active.moved) {
            event.preventDefault();
            event.currentTarget.scrollLeft = active.scroll - delta;
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={(event) => {
          endDrag(event);
          suppressClick.current = false;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {DESTINATIONS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={styles.galleryLink} draggable={false}>
              <div className={styles.galleryImage}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 639px) 82vw, (max-width: 1023px) 44vw, 28vw"
                  draggable={false}
                />
              </div>
              <h3>
                {item.title}
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </h3>
            </Link>
          </li>
        ))}
      </ul>
      <span
        ref={tooltip}
        className={styles.dragTip}
        data-visible={hovering && !dragging}
        aria-hidden="true"
      >
        Drag
      </span>
    </section>
  );
}
