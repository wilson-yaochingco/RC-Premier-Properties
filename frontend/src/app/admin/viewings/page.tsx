import { AdminInquiryList } from "@/features/admin/AdminInquiryList";
import { AdminViewingCalendar } from "@/features/admin/AdminViewingCalendar";
import styles from "@/features/admin/admin.module.css";

export default function AdminViewingsPage() {
  return (
    <div className={styles.viewingsPage}>
      <AdminViewingCalendar />
      <AdminInquiryList viewingOnly />
    </div>
  );
}
