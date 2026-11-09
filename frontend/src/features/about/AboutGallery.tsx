"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import exterior from "../../../public/media/properties/photography-v1/furnished-brand-new-modern-home/furnished-brand-new-modern-home-exterior-front.webp";
import interior from "../../../public/media/properties/photography-v1/furnished-brand-new-modern-home/furnished-brand-new-modern-home-living-room.webp";
import viewing from "@/assets/site/bungalow-street.jpg";
import selling from "../../../public/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-exterior-carport.png";
import contact from "../../../public/media/properties/photography-v1/furnished-brand-new-modern-home/furnished-brand-new-modern-home-stairwell-window.webp";
import styles from "@/app/about/about.module.css";

const DESTINATIONS = [
  {
    title: "Explore properties",
    href: "/properties",
    image: exterior,
    alt: "Two-storey modern home with timber-slat balcony screens",
  },
  {
    title: "Discover locations",
    href: "/locations",
    image: interior,
    alt: "Furnished living room with a sofa and low coffee table",
  },
  {
    title: "Request a viewing",
    href: "/book-viewing",
    image: viewing,
    alt: "Modern single-storey home seen from the street, with its gated frontage",
  },
  {
    title: "Sell your property",
    href: "/sell",
    image: selling,
    alt: "Modern two-storey home with a covered carport",
  },
  {
    title: "Talk to RC Premier",
    href: "/contact",
    image: contact,
    alt: "Stairwell with a tall window bringing in daylight",
  },
] as const;

const TIP_GAP = 4;

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
          <h2 id="gallery-heading" data-motion="heading">
            Our <em>capabilities</em>
          </h2>
          <p data-motion="fade">
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
        data-motion="group"
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
            // The label's bottom-left corner sits at the pointer; it flips left near the
            // right edge and drops below the pointer near the top edge.
            const right = event.clientX + TIP_GAP;
            const x = Math.max(
              0,
              right + tip.offsetWidth > window.innerWidth
                ? event.clientX - tip.offsetWidth - TIP_GAP
                : right,
            );
            const above = event.clientY - tip.offsetHeight - TIP_GAP;
            const y = above >= 0 ? above : event.clientY + TIP_GAP;
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
