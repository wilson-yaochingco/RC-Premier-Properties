import type { Metadata } from "next";
import viewingImage from "@/assets/site/book-viewing.png";
import { ViewingScheduler } from "@/features/inquiries/ViewingScheduler";
import { resolveViewingProperty } from "@/features/inquiries/viewing-property";
import { buildPageMetadata } from "@/lib/seo";
import frame from "@/components/layout/editorial-page.module.css";
import styles from "./book-viewing.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Request a Property Tour",
  description:
    "Request a property tour with RC Premier Properties in Pampanga. Requested schedules require staff confirmation.",
  canonicalPath: "/book-viewing",
  imagePath: viewingImage.src,
});

const NEXT_STEPS = [
  {
    number: "01",
    title: "Request",
    description: "Choose the property and a preferred date and time.",
  },
  {
    number: "02",
    title: "Review",
    description: "RC Premier reviews the requested property, date and time.",
  },
  {
    number: "03",
    title: "Confirm",
    description:
      "The team contacts you to confirm the visit or arrange another schedule.",
  },
] as const;

export default async function BookViewingPage({
  searchParams,
}: PageProps<"/book-viewing">) {
  const query = await searchParams;
  const rawPropertyId = Array.isArray(query.propertyId)
    ? query.propertyId[0]
    : query.propertyId;
  const context = await resolveViewingProperty(rawPropertyId);

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      <section className={styles.booking} aria-labelledby="book-viewing-heading">
        <div className={styles.container}>
          <header className={styles.intro}>
            <p className={styles.eyebrow}>Plan your visit</p>
            <h1 id="book-viewing-heading" className={styles.headline}>
              <span>See the property</span> <span>in person.</span>
            </h1>
            <p className={styles.lede}>
              Choose a preferred date and time. RC Premier will follow up to confirm the
              schedule.
            </p>
          </header>
          <ViewingScheduler context={context} />
        </div>
      </section>

      <section className={styles.next} aria-labelledby="viewing-next-heading">
        <div className={styles.container}>
          <div className={styles.nextLayout}>
            <h2 id="viewing-next-heading" className={styles.nextHeading}>
              What happens next?
            </h2>
            <ol className={styles.nextList}>
              {NEXT_STEPS.map((step) => (
                <li key={step.number}>
                  <span className={styles.nextNumber}>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
