import type { Metadata } from "next";
import Image from "next/image";
import facade from "@/assets/site/footer.png";
import { Button } from "@/components/ui/Button";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.content}>
        <p className={styles.eyebrow} data-enter>
          404 / Page not found
        </p>
        <h1 className={styles.headline} data-enter="heading" data-enter-delay="1">
          Not quite the <em>right address</em>.
        </h1>
        <p className={styles.description} data-enter data-enter-delay="2">
          The page you’re looking for isn’t here. Let’s help you find your way back.
        </p>
        <div className={styles.actions} data-enter data-enter-delay="3">
          <Button href="/" variant="primary">
            Back to Home
          </Button>
          <Button href="/properties" variant="outline">
            Explore Properties
          </Button>
        </div>
      </div>
      <figure className={styles.figure} data-enter="image" data-enter-delay="2">
        <Image
          src={facade}
          alt="Modern two-storey home with timber cladding and black-framed glazing"
          fill
          priority
          sizes="(max-width: 899px) 100vw, 40vw"
        />
        <span className={styles.numeral} aria-hidden="true">
          404
        </span>
      </figure>
    </main>
  );
}
