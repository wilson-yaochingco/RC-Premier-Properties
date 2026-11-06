# Public About page

The About page is an editorial brand page with no property API dependency. Its metadata
and canonical URL are retained. Copy draws from the existing About and Why RC Premier
messaging; no metrics or company achievements are inferred.

Five sections: static photographic hero, company statement and six-image staggered photography mosaic,
perspective/approach split, five-destination architectural gallery, and the shared
EditorialCta. The global header/footer are unchanged.

The hero is a static full-bleed Next Image (`home_hero.jpg`, the dusk residence also used on Home)
under a bottom-weighted shade; no video is rendered or requested. Primary typography is Manrope.
The mosaic reuses the repository site images home-hero-1.png, footer.png, why-rc-premier.png,
home-hero-2.png, properties.png and location.png (lower-right portrait).
Gallery images reuse the repository's existing Home, Book Viewing, Contact and footer imagery.
These are editorial illustrations, not claims of ownership or new project completions.

Gallery navigation uses native touch/trackpad scrolling and scroll snap, mouse dragging,
and arrow keys on the focusable rail or its links. The scrollbar is visually hidden;
all links remain reachable by keyboard. A fine-pointer Drag label follows the mouse
without replacing it. Reduced motion disables smooth navigation and image scaling. No
carousel dependency is introduced. Desktop shows roughly three items plus the next edge,
tablet two, and mobile one plus the next edge.

The removed About-only map component and its styles have no remaining callers. Shared
Pampanga geometry remains in place for other surfaces. All About photographs load through
Next Image with responsive sizes; only the hero image is prioritized.

The About hero fills the viewport behind the shared cinematic header. Its hero boundary uses the same sticky and scroll-direction lifecycle as Home, with the brand mark visible over the film.

The closing EditorialCta uses its `wide` variant here only: full-gutter width,
and below 1024px the house drawings keep a substantial size, cropped off the card edges.
