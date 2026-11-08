import { PropertyTours } from "./PropertyTours";
import { loadTourVideos } from "./property-tours";
import styles from "./property-tours.module.css";

export async function PropertyToursSection() {
  const videos = await loadTourVideos();

  return (
    <section className={styles.section} aria-labelledby="property-tours-heading">
      <h2 id="property-tours-heading" className="visually-hidden">
        Property tours
      </h2>
      <div className={styles.container}>
        <PropertyTours videos={videos} />
      </div>
    </section>
  );
}
