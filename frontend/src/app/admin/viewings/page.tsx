import { AdminInquiryList } from "@/features/admin/AdminInquiryList";
import { AdminViewingCalendar } from "@/features/admin/AdminViewingCalendar";
import styles from "@/features/admin/admin.module.css";

export default function AdminViewingsPage() {
  return (
    <div className={styles.viewingsPage}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Viewing appointment requests</p>
          <h1>Viewings</h1>
          <p>Review the calendar and manage each request through its inquiry record.</p>
        </div>
      </header>
      <AdminViewingCalendar />
      <AdminInquiryList viewingOnly />
    </div>
  );
}
