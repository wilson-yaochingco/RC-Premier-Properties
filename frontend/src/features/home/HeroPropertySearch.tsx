"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hero-search__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M10 10.833a2.083 2.083 0 1 0 0-4.166 2.083 2.083 0 0 0 0 4.166Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.25 8.75c0 4.583-6.25 9.583-6.25 9.583s-6.25-5-6.25-9.583a6.25 6.25 0 0 1 12.5 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hero-search__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="m2.5 7.5 7.5-5 7.5 5v10a.833.833 0 0 1-.833.833H3.333A.833.833 0 0 1 2.5 17.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 18.333V10h5v8.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hero-search__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M17.083 10.417 10.417 17.083a1.667 1.667 0 0 1-2.36-.006L2.917 11.94a1.667 1.667 0 0 1-.417-1.077V4.167A1.667 1.667 0 0 1 4.167 2.5h6.696c.442 0 .866.176 1.178.489l5.042 5.068a1.667 1.667 0 0 1 0 2.36Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.25" cy="6.25" r="1.25" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hero-search__submit-icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle
        cx="9.167"
        cy="9.167"
        r="5.833"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="m13.333 13.333 4.167 4.167"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hero-search__chevron"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroPropertySearch() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("purpose", "sale");

    if (location) {
      params.set("location", location);
    }
    if (propertyType) {
      params.set("propertyType", propertyType);
    }
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (min) params.set("minPrice", min);
      if (max) params.set("maxPrice", max);
    }

    router.push(`/properties?${params.toString()}`);
  };

  return (
    <div className="hero-search">
      <form
        onSubmit={handleSubmit}
        className="hero-search__form"
        role="search"
        aria-label="Search properties for sale in Pampanga"
      >
        <div className="hero-search__group">
          <div className="hero-search__field">
            <span className="hero-search__field-icon">
              <MapPinIcon />
            </span>
            <div className="hero-search__field-body">
              <label htmlFor="search-location" className="hero-search__label">
                Location
              </label>
              <div className="hero-search__select-wrap">
                <select
                  id="search-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="hero-search__select"
                >
                  <option value="">Any location</option>
                  <option value="Angeles City">Angeles City</option>
                  <option value="City of San Fernando">City of San Fernando</option>
                  <option value="Mabalacat City">Mabalacat City</option>
                  <option value="Porac">Porac</option>
                  <option value="Guagua">Guagua</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Lubao">Lubao</option>
                  <option value="Arayat">Arayat</option>
                  <option value="Magalang">Magalang</option>
                  <option value="Bacolor">Bacolor</option>
                  <option value="Candaba">Candaba</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          <div className="hero-search__divider" aria-hidden="true" />

          <div className="hero-search__field">
            <span className="hero-search__field-icon">
              <HomeIcon />
            </span>
            <div className="hero-search__field-body">
              <label htmlFor="search-type" className="hero-search__label">
                Property Type
              </label>
              <div className="hero-search__select-wrap">
                <select
                  id="search-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="hero-search__select"
                >
                  <option value="">Any type</option>
                  <option value="house-and-lot">House &amp; Lot</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="condominium">Condominium</option>
                  <option value="lot">Lot / Land</option>
                  <option value="commercial">Commercial</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          <div className="hero-search__divider" aria-hidden="true" />

          <div className="hero-search__field">
            <span className="hero-search__field-icon">
              <TagIcon />
            </span>
            <div className="hero-search__field-body">
              <label htmlFor="search-price" className="hero-search__label">
                Price range
              </label>
              <div className="hero-search__select-wrap">
                <select
                  id="search-price"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="hero-search__select"
                >
                  <option value="">Any price</option>
                  <option value="0-5000000">Up to ₱5,000,000</option>
                  <option value="5000000-10000000">₱5M – ₱10,000,000</option>
                  <option value="10000000-20000000">₱10M – ₱20,000,000</option>
                  <option value="20000000-">₱20,000,000+</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="hero-search__submit">
          <SearchIcon />
          <span>Search Properties</span>
        </button>
      </form>
    </div>
  );
}
