# Public About page

The About page is an editorial brand page with no property API dependency. Its metadata
and canonical URL are retained. Copy draws from the existing About and Why RC Premier
messaging; no metrics or company achievements are inferred.

Five sections: full-bleed video hero, company statement and six-image staggered photography mosaic,
perspective/approach split, five-destination architectural gallery, and the shared
EditorialCta. The global header/footer are unchanged.

The hero uses `/media/about-hero.mp4`, a distinct optimized copy of the supplied
17.7-second 1920?1080 H.264 master. The web copy is about 7.8 MB, contains no audio,
and has MP4 fast-start metadata. The master remains outside the repository in Downloads.
Home continues to use `/media/homepage-hero.mp4`. The existing shared video behavior
provides muted autoplay, looping, inline playback and a stable first frame for reduced
motion. A neutral charcoal background appears until video data is ready; no photograph
or poster sits behind it. The existing shade, headline, dimensions and motion remain.
Primary typography is Manrope.
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
Next Image with responsive sizes. The hero video loads independently.

The About hero fills the viewport behind the shared cinematic header. Its hero boundary uses the same sticky and scroll-direction lifecycle as Home, with the brand mark visible over the film.

The closing EditorialCta uses its `wide` variant here only: full-gutter width,
and below 1024px the house drawings keep a substantial size, cropped off the card edges.

The "Thoughtful homes, clearer decisions" heading uses PageMotion's opacity/position
entrance, retaining its original responsive text flow. SplitText treated desktop-only
hidden line breaks as line boundaries on mobile and reverted four temporary lines to
two at completion. This heading is deliberately not split; its DOM and dimensions
stay unchanged throughout the reveal, including viewport changes and reduced motion.
