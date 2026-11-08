"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePageScrollLock } from "@/hooks/usePageScrollLock";
import { Button } from "@/components/ui/Button";
import { shortPublicLocation } from "@/lib/public-location";
import { PropertyFilterIcon } from "./PropertyFilterIcon";
import { CatalogFilterForm } from "./CatalogFilterForm";
import type { CatalogFixtureScenario } from "./catalog-inventory";
import type { PropertyFormValues } from "./property-query";
import {
  priceDraft,
  validPrice,
  displayPrice,
  pesos,
  priceRangeError,
  PRICE_SLIDER_MAX,
  priceToProgress,
  progressToPrice,
  stepPrice,
  sliderPrice,
} from "./property-price-filter";
import styles from "./property-search.module.css";

const subscribeHydration = () => () => {};

/** Page scroll beyond this many pixels since opening dismisses an open filter panel. */
const DISMISS_SCROLL_PX = 48;
const CLOSE_MS = 160;

const PRIMARY_KEYS = new Set([
  "location",
  "bedrooms",
  "bedroomsMatch",
  "minPrice",
  "maxPrice",
  "page",
]);

function FilterPopover({
  label,
  summary,
  children,
  icon,
  closeOnSelect = false,
  action,
}: {
  closeOnSelect?: boolean;
  action?: ReactNode;
  icon: "location" | "bedrooms" | "price";
  label: string;
  summary: string;
  children: ReactNode;
}) {
  const id = useId();
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const scrollAtOpen = useRef(0);
  const pointerInside = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const position = useCallback(() => {
    const button = trigger.current;
    const element = panel.current;
    if (!button || !element) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const available = rect.top - viewportTop - 24;
    const sheet = window.matchMedia("(max-width: 47.99rem)").matches && available < 160;
    element.dataset.sheet = String(sheet);
    element.style.maxHeight = `${Math.max(0, sheet ? viewportHeight - 24 : available)}px`;
    element.style.bottom = `${sheet ? window.innerHeight - viewportTop - viewportHeight + 12 : window.innerHeight - rect.top + 12}px`;
    const mobile = window.matchMedia("(max-width: 47.99rem)").matches;
    const anchor = mobile ? button.closest("form")!.getBoundingClientRect() : rect;
    const width = Math.min(
      Math.max(
        anchor.width,
        !mobile ? (icon === "bedrooms" ? 390 : icon === "price" ? 320 : 0) : 0,
      ),
      window.innerWidth - 24,
    );
    element.style.width = `${width}px`;
    element.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))}px`;
  }, [icon]);

  // Fades the panel out, then closes it.
  const dismiss = useCallback(() => {
    const element = panel.current;
    if (!element?.matches(":popover-open") || element.dataset.closing) return;
    element.dataset.closing = "true";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = setTimeout(
      () => {
        delete element.dataset.closing;
        if (element.matches(":popover-open")) element.hidePopover();
      },
      reduced ? 0 : CLOSE_MS,
    );
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    scrollAtOpen.current = window.scrollY;
    // The one scroll listener also dismisses. Scrolling inside the panel (or any other
    // scroller) never does, and neither does scrolling while dragging inside the panel.
    const onScroll = (event: Event) => {
      position();
      const pageScroll =
        event.target === document || event.target === document.documentElement;
      if (
        pageScroll &&
        !pointerInside.current &&
        Math.abs(window.scrollY - scrollAtOpen.current) > DISMISS_SCROLL_PX
      ) {
        dismiss();
      }
    };
    window.addEventListener("resize", position);
    window.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [dismiss, open, position]);

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(
        event.key,
      ) ||
      event.target instanceof HTMLInputElement
    )
      return;
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index +
              (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
              buttons.length) %
            buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div className={styles.filter}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            panel.current?.showPopover();
            panel.current
              ?.querySelector<HTMLElement>("button:not(:disabled), input")
              ?.focus({ preventScroll: true });
          }
        }}
      >
        <span className={styles.label}>
          <PropertyFilterIcon kind={icon} />
          {label}
        </span>
        <span className={styles.summary}>{summary}</span>
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </button>
      {mounted
        ? createPortal(
            <div
              ref={panel}
              id={id}
              popover="auto"
              role="dialog"
              aria-label={label}
              className={styles.popover}
              data-lenis-prevent
              onBeforeToggle={(event) => {
                if (event.newState === "open") {
                  clearTimeout(closeTimer.current);
                  delete panel.current?.dataset.closing;
                  pointerInside.current = false;
                }
                position();
              }}
              onPointerDown={() => {
                pointerInside.current = true;
              }}
              onPointerUp={() => {
                pointerInside.current = false;
              }}
              onPointerCancel={() => {
                pointerInside.current = false;
              }}
              onLostPointerCapture={() => {
                pointerInside.current = false;
              }}
              onToggle={() => setOpen(Boolean(panel.current?.matches(":popover-open")))}
              onKeyDown={handleKeys}
              onClick={(event) => {
                if (
                  closeOnSelect &&
                  (event.target as HTMLElement).closest("button[aria-pressed]")
                ) {
                  trigger.current?.focus({ preventScroll: true });
                  panel.current?.hidePopover();
                }
              }}
            >
              <div className={styles.filterHeader}>
                <h2>
                  <PropertyFilterIcon kind={icon} />
                  {label}
                </h2>
                {action}
              </div>
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function PriceInput({
  field,
  value,
  onChange,
  invalid,
  formId,
}: {
  formId: string;
  field: "minimum" | "maximum";
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <label>
      {field === "minimum" ? "Min" : "Max"}
      <span>
        <span aria-hidden="true">₱</span>
        <input
          ref={input}
          id={`${formId}-${field}`}
          form={formId}
          type="text"
          inputMode="numeric"
          aria-label={
            field === "minimum" ? "Minimum price (PHP)" : "Maximum price (PHP)"
          }
          data-price-field={field}
          aria-invalid={invalid || undefined}
          value={displayPrice(value)}
          placeholder={field === "minimum" ? "No minimum" : "No maximum"}
          onChange={(event) => {
            const digits = event.target.value
              .slice(0, event.target.selectionStart ?? event.target.value.length)
              .replace(/\D/g, "").length;
            onChange(priceDraft(event.target.value));
            requestAnimationFrame(() => {
              const element = input.current;
              if (!element) return;
              let count = 0;
              let caret = 0;
              while (caret < element.value.length && count < digits) {
                if (/\d/.test(element.value[caret])) count++;
                caret++;
              }
              element.setSelectionRange(caret, caret);
            });
          }}
        />
      </span>
    </label>
  );
}

export function PropertySearchFilters({
  values,
  fixture,
  locations,
}: {
  values: PropertyFormValues;
  fixture?: CatalogFixtureScenario;
  locations: string[];
}) {
  const formId = useId();
  const [location, setLocation] = useState(shortPublicLocation(values.location));
  const [bedrooms, setBedrooms] = useState(
    Number.isInteger(Number(values.bedrooms)) &&
      Number(values.bedrooms) > 0 &&
      Number(values.bedrooms) <= 100
      ? values.bedrooms
      : "",
  );
  const [minimum, setMinimum] = useState(priceDraft(values.minPrice));
  const [maximum, setMaximum] = useState(priceDraft(values.maxPrice));
  const [resetAdditional, setResetAdditional] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  usePageScrollLock(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const element = drawer.current;
    if (!element) return;
    if (!element.open) element.showModal();
    const viewport = window.visualViewport;
    const resize = () => {
      element.style.height = `${viewport?.height ?? window.innerHeight}px`;
      element.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, [drawerOpen]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function closeDrawer() {
    if (closing) return;
    setClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = setTimeout(
      () => {
        drawer.current?.close();
        setDrawerOpen(false);
        setClosing(false);
        startButton.current?.focus({ preventScroll: true });
      },
      reduced ? 0 : 450,
    );
  }

  const error = priceRangeError(minimum, maximum);
  const priceSummary = error
    ? "Check price range"
    : minimum && maximum
      ? `${pesos.format(Number(minimum))} – ${pesos.format(Number(maximum))}`
      : minimum
        ? `From ${pesos.format(Number(minimum))}`
        : maximum
          ? `Up to ${pesos.format(Number(maximum))}`
          : "Any price";
  const sliderMinimum = validPrice(minimum)
    ? Math.min(PRICE_SLIDER_MAX, Number(minimum))
    : 0;
  const sliderMaximum = Math.max(
    sliderMinimum,
    validPrice(maximum)
      ? Math.min(PRICE_SLIDER_MAX, Number(maximum))
      : PRICE_SLIDER_MAX,
  );
  const trackHandle = useRef<{ field: "minimum" | "maximum"; offset: number } | null>(
    null,
  );
  const minimumPercent = priceToProgress(sliderMinimum);
  const maximumPercent = priceToProgress(sliderMaximum);

  function moveHandle(field: "minimum" | "maximum", amount: number) {
    const min = field === "minimum" ? 0 : sliderMinimum;
    const max = field === "minimum" ? sliderMaximum : PRICE_SLIDER_MAX;
    const next = sliderPrice(amount, min, max);
    if (field === "minimum") setMinimum(next);
    else setMaximum(next);
  }

  function trackProgress(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left - 9) / (rect.width - 18)) * 100),
    );
  }

  function handleRangeKey(
    event: KeyboardEvent<HTMLButtonElement>,
    field: "minimum" | "maximum",
  ) {
    const current = field === "minimum" ? sliderMinimum : sliderMaximum;

    const movements: Record<string, number> = {
      ArrowRight: stepPrice(current, 1),
      ArrowUp: stepPrice(current, 1),
      ArrowLeft: stepPrice(current, -1),
      ArrowDown: stepPrice(current, -1),
      PageUp: stepPrice(current, 1, 10),
      PageDown: stepPrice(current, -1, 10),
      Home: 0,
      End: PRICE_SLIDER_MAX,
    };
    const amount = movements[event.key];
    if (amount === undefined) return;
    event.preventDefault();
    moveHandle(field, amount);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (error) {
      event.preventDefault();
      event.stopPropagation();
      const input = document.getElementById(
        `${formId}-${error.field}`,
      ) as HTMLInputElement | null;
      input?.closest<HTMLDivElement>("[popover]")?.showPopover();
      input?.focus({ preventScroll: true });
    } else if (drawerOpen) closeDrawer();
  }

  function reset() {
    setLocation("");
    setBedrooms("");
    setMinimum("");
    setMaximum("");
    setResetAdditional(true);
  }

  const orderedLocations = [
    "Angeles City",
    "Porac",
    "Magalang",
    "Mabalacat City",
  ].filter((name) => locations.includes(name));
  const locationChoices =
    location && !orderedLocations.includes(location)
      ? [...orderedLocations, location]
      : orderedLocations;
  const bedroomChoices = ["", "1", "2", "3", "4", "5"];
  if (bedrooms && !bedroomChoices.includes(bedrooms)) bedroomChoices.push(bedrooms);
  const bedroomLabel = (value: string) =>
    value ? `${value} ${value === "1" ? "bedroom" : "bedrooms"}` : "All";
  const locationRows = [["", ...locationChoices.slice(0, 2)], locationChoices.slice(2)];
  const locationContent = (
    <div className={styles.locationChoices} role="group" aria-label="Choose a location">
      {locationRows.map((row, index) => (
        <div className={styles.options} key={index}>
          {row.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={location === option}
              onClick={() => setLocation(option)}
            >
              {option || "All Locations"}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
  const bedroomContent = (
    <div className={styles.bedroomChoices} role="group" aria-label="Bedrooms">
      {[bedroomChoices.slice(0, 4), bedroomChoices.slice(4)].map((row, index) => (
        <div className={styles.options} key={index}>
          {row.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={bedrooms === option}
              onClick={() => setBedrooms(option)}
            >
              {bedroomLabel(option)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
  const clearPriceAction = (
    <button
      type="button"
      className={styles.clear}
      disabled={!minimum && !maximum}
      onClick={() => {
        setMinimum("");
        setMaximum("");
      }}
    >
      Clear price range
    </button>
  );
  const priceContent = (
    <>
      {/* Decorative motif only: published price-distribution data is unavailable. */}
      <div className={styles.priceMotif} aria-hidden="true" data-price-motif>
        {[
          [6, 35],
          [13, 18],
          [16.5, 18],
          [20, 18],
          [27, 52],
          [30.5, 18],
          [34, 70],
          [41, 18],
          [44.5, 52],
          [51, 18],
          [69, 18],
        ].map(([position, height], index) => (
          <span
            key={index}
            data-muted={position < minimumPercent || position > maximumPercent}
            style={{ left: `${position}%`, height }}
          />
        ))}
      </div>
      <div
        className={styles.rangeControl}
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return;
          event.preventDefault();
          const progress = trackProgress(event);
          const thumb = (event.target as HTMLElement).closest<HTMLButtonElement>(
            "[data-price-handle]",
          );
          const field =
            (thumb?.dataset.priceHandle as "minimum" | "maximum" | undefined) ??
            (progress <= minimumPercent
              ? "minimum"
              : progress >= maximumPercent
                ? "maximum"
                : Math.abs(progress - minimumPercent) <=
                    Math.abs(progress - maximumPercent)
                  ? "minimum"
                  : "maximum");
          const selectedProgress =
            field === "minimum" ? minimumPercent : maximumPercent;
          trackHandle.current = {
            field,
            offset: thumb ? progress - selectedProgress : 0,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-price-handle="${field}"]`)
            ?.focus({ preventScroll: true });
          if (!thumb) moveHandle(field, progressToPrice(progress));
        }}
        onPointerMove={(event) => {
          const drag = trackHandle.current;
          if (drag)
            moveHandle(drag.field, progressToPrice(trackProgress(event) - drag.offset));
        }}
        onLostPointerCapture={() => {
          trackHandle.current = null;
        }}
        onPointerUp={() => {
          trackHandle.current = null;
        }}
        onPointerCancel={() => {
          trackHandle.current = null;
        }}
      >
        <div className={styles.rangeTrack} aria-hidden="true" />
        {(["minimum", "maximum"] as const).map((field) => {
          const amount = field === "minimum" ? sliderMinimum : sliderMaximum;
          const progress = field === "minimum" ? minimumPercent : maximumPercent;
          return (
            <button
              key={field}
              type="button"
              role="slider"
              className={styles.rangeHandle}
              data-price-handle={field}
              aria-label={`${field === "minimum" ? "Minimum" : "Maximum"} price slider`}
              aria-valuetext={pesos.format(amount)}
              aria-valuemin={field === "minimum" ? 0 : sliderMinimum}
              aria-valuemax={field === "minimum" ? sliderMaximum : PRICE_SLIDER_MAX}
              aria-valuenow={amount}
              style={{
                left: `calc(9px + (100% - 18px) * ${progress / 100})`,
                zIndex:
                  field === "minimum" && minimumPercent > 50
                    ? 3
                    : field === "maximum"
                      ? 2
                      : 1,
              }}
              onKeyDown={(event) => handleRangeKey(event, field)}
            />
          );
        })}
      </div>

      {(validPrice(minimum) && Number(minimum) > PRICE_SLIDER_MAX) ||
      (validPrice(maximum) && Number(maximum) > PRICE_SLIDER_MAX) ? (
        <p className={styles.hint}>
          The slider spans ₱0–₱100,000,000. Larger budgets can be entered below.
        </p>
      ) : null}
      <div className={styles.priceInputs}>
        <PriceInput
          formId={formId}
          field="minimum"
          value={minimum}
          onChange={setMinimum}
          invalid={error?.field === "minimum"}
        />
        <PriceInput
          formId={formId}
          field="maximum"
          value={maximum}
          onChange={setMaximum}
          invalid={error?.field === "maximum"}
        />
      </div>
      {error ? (
        <p className={styles.validation} role="alert">
          {error.message}
        </p>
      ) : null}
    </>
  );

  return (
    <CatalogFilterForm
      id={formId}
      className={styles.searchForm}
      onSubmitCapture={submit}
    >
      {Object.entries(values)
        .filter(([key]) => !PRIMARY_KEYS.has(key))
        .map(([name, value]) => (
          <input
            key={name}
            type="hidden"
            name={name}
            value={resetAdditional && name !== "purpose" ? "" : value}
          />
        ))}
      {fixture ? <input type="hidden" name="catalogFixture" value={fixture} /> : null}
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="bedrooms" value={bedrooms} />
      <input type="hidden" name="bedroomsMatch" value={bedrooms ? "exact" : ""} />
      <input type="hidden" name="minPrice" value={minimum} />
      <input type="hidden" name="maxPrice" value={maximum} />
      {!drawerOpen ? (
        <div className={styles.bar}>
          <FilterPopover
            icon="location"
            label="Location"
            summary={location || "All Locations"}
            closeOnSelect
          >
            {locationContent}
          </FilterPopover>
          <FilterPopover
            icon="bedrooms"
            label="Bedrooms"
            summary={bedrooms ? bedroomLabel(bedrooms) : "All bedrooms"}
            closeOnSelect
          >
            {bedroomContent}
          </FilterPopover>
          <FilterPopover
            icon="price"
            label="Price Range"
            summary={priceSummary}
            action={clearPriceAction}
          >
            {priceContent}
          </FilterPopover>
          <Button type="submit" variant="primary" className={styles.search}>
            Search
          </Button>
        </div>
      ) : null}
      <button
        ref={startButton}
        type="button"
        className={`${styles.startSearch} cta`}
        aria-haspopup="dialog"
        onClick={() => setDrawerOpen(true)}
      >
        <span>Start Search</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <dialog
        ref={drawer}
        className={styles.drawer}
        data-closing={closing}
        data-lenis-prevent
        aria-label="Filters"
        onCancel={(event) => {
          event.preventDefault();
          closeDrawer();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDrawer();
        }}
      >
        {drawerOpen ? (
          <div className={styles.drawerShell}>
            <header className={styles.drawerHeader}>
              <h2>Filters</h2>
              <button type="button" aria-label="Close search" onClick={closeDrawer}>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </header>
            <div className={styles.drawerContent}>
              <section aria-label="Location">
                <h3>
                  <PropertyFilterIcon kind="location" />
                  Location
                </h3>
                {locationContent}
              </section>
              <section aria-label="Bedrooms">
                <h3>
                  <PropertyFilterIcon kind="bedrooms" />
                  Bedrooms
                </h3>
                {bedroomContent}
              </section>
              <section aria-label="Price Range">
                <div className={styles.filterHeader}>
                  <h3>
                    <PropertyFilterIcon kind="price" />
                    Price Range
                  </h3>
                  {clearPriceAction}
                </div>
                {priceContent}
              </section>
            </div>
            <footer className={styles.drawerFooter}>
              <button type="button" className={styles.reset} onClick={reset}>
                Reset filters
              </button>
              <Button type="submit" variant="primary" className={styles.search}>
                Search
              </Button>
            </footer>
          </div>
        ) : null}
      </dialog>
    </CatalogFilterForm>
  );
}
