import type { Metadata } from "next";
import viewingImage from "@/assets/site/book-viewing.png";
import frame from "@/components/layout/editorial-page.module.css";
import { ViewingScheduler } from "@/features/inquiries/ViewingScheduler";
import {
  loadViewingOptions,
  resolveViewingProperty,
} from "@/features/inquiries/viewing-property";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./book-viewing.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Book a Property Viewing in Pampanga",
  description:
    "Choose a published property in Pampanga and request a viewing date and time. RC Premier Properties staff confirm every request before the visit.",
  canonicalPath: "/book-viewing",
  imagePath: viewingImage.src,
});

export default async function BookViewingPage({
  searchParams,
}: PageProps<"/book-viewing">) {
  const query = await searchParams;
  const rawPropertyId = Array.isArray(query.propertyId)
    ? query.propertyId[0]
    : query.propertyId;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  // Development-only previews; ignored by production builds.
  const propertyFixture = firstValue(query.viewingPropertyFixture);
  const listingFixture =
    firstValue(query.viewingFixture) ?? (propertyFixture ? "4" : undefined);
  const context = await resolveViewingProperty(rawPropertyId, propertyFixture);
  // Listings to choose from are only needed when the page has no confirmed property.
  const options =
    context.status === "resolved"
      ? undefined
      : await loadViewingOptions(listingFixture);

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      <section className={styles.booking} aria-labelledby="book-viewing-heading">
        <header className={styles.intro}>
          <p className={styles.eyebrow} data-enter>
            Plan your visit
          </p>
          <h1
            id="book-viewing-heading"
            className={styles.headline}
            data-enter="heading"
            data-enter-delay="1"
          >
            See the property <em>in person</em>
          </h1>
          <p className={styles.lede} data-enter data-enter-delay="2">
            Choose a property, date and preferred time. Our team will confirm your
            request.
          </p>
        </header>

        <div className={styles.stage} data-enter data-enter-delay="3">
          <ViewingScheduler context={context} {...(options ? { options } : {})} />
        </div>
      </section>
    </main>
  );
}
