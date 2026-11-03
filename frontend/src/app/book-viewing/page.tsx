import type { Metadata } from "next";
import viewingImage from "@/assets/site/book-viewing.png";
import frame from "@/components/layout/editorial-page.module.css";
import { DevHomepagePreview } from "@/features/home/DevHomepagePreview";
import { ViewingScheduler } from "@/features/inquiries/ViewingScheduler";
import {
  loadViewingOptions,
  resolveViewingProperty,
} from "@/features/inquiries/viewing-property";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
} from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./book-viewing.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Request a Property Tour",
  description:
    "Request a property tour with RC Premier Properties in Pampanga. Requested schedules require staff confirmation.",
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
          <p className={styles.eyebrow}>Plan your visit</p>
          <h1 id="book-viewing-heading" className={styles.headline}>
            See the property in person.
          </h1>
          <p className={styles.lede}>
            Choose a preferred date and time. RC Premier will follow up to confirm the
            schedule.
          </p>
        </header>

        <div className={styles.stage}>
          <ViewingScheduler context={context} {...(options ? { options } : {})} />
          <p className={styles.closing}>
            Prefer to talk it through first? Call{" "}
            <a href={OFFICIAL_PHONE_HREF}>{OFFICIAL_PHONE}</a> or email{" "}
            <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a>.
          </p>
        </div>
      </section>
      <DevHomepagePreview />
    </main>
  );
}
