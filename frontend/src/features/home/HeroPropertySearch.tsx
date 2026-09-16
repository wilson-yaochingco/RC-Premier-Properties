function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.75" cy="10.75" r="6.75" stroke="currentColor" />
      <path d="m16 16 4.25 4.25" stroke="currentColor" />
    </svg>
  );
}

export function HeroPropertySearch() {
  return (
    <div className="hero-search">
      <form
        action="/properties"
        method="get"
        className="hero-search__form"
        role="search"
        aria-label="Search properties for sale"
      >
        <label className="visually-hidden" htmlFor="home-property-search">
          Location, Property ID, or keyword
        </label>
        <input
          id="home-property-search"
          name="keyword"
          maxLength={100}
          placeholder="Location, Property ID, or keyword"
        />
        <input type="hidden" name="purpose" value="sale" />
        <button type="submit" aria-label="Search properties">
          <SearchIcon />
        </button>
      </form>
    </div>
  );
}
