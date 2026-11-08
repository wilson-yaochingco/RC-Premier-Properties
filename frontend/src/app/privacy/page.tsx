import type { Metadata } from "next";
import heroExterior from "@/assets/site/home_hero.jpg";
import { LegalPage, type LegalSection } from "@/features/legal/LegalPage";
import { OFFICIAL_EMAIL } from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How RC Premier Properties collects, uses and protects the personal information you share through its website, in line with the Philippine Data Privacy Act.",
  canonicalPath: "/privacy",
  imagePath: heroExterior.src,
});

const email = (
  <a href={`mailto:${OFFICIAL_EMAIL}`} className="privacy-link">
    {OFFICIAL_EMAIL}
  </a>
);

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          This website is operated by RC Premier Properties, a real estate business
          serving buyers and sellers in Pampanga, Philippines. In this policy, “we” and
          “us” mean RC Premier Properties, and we are the personal information
          controller for the information described below.
        </p>
        <p>
          This policy is written with the Data Privacy Act of 2012 (Republic Act No.
          10173), its Implementing Rules and Regulations and National Privacy Commission
          guidance in mind. You can reach us about anything in it at {email}.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "Information we collect",
    body: (
      <>
        <p>We collect only what you choose to send us through the website forms:</p>
        <ul>
          <li>
            <strong>Contact inquiries:</strong> your name, email address, phone number,
            the kind of inquiry, an optional subject and your message. If you start from
            a listing, we also record which property it concerns.
          </li>
          <li>
            <strong>Viewing requests:</strong> your name, phone number, email address,
            the property, your preferred date and time, and any notes you add.
          </li>
          <li>
            <strong>Seller inquiries:</strong> your name, email address, phone number,
            the property’s location or area, its type if you give it, and your
            description of the property. The form does not ask for identity, title or
            ownership documents, and you should not send them through it.
          </li>
        </ul>
        <p>
          We also keep a record that you agreed to this policy when you submitted a
          form, and when you did so. We do not ask for payment details, and no account
          is created when you submit an inquiry.
        </p>
        <p>
          Like most websites, our servers handle technical information such as your IP
          address while delivering pages and protecting forms against spam and abuse.
        </p>
      </>
    ),
  },
  {
    id: "why-we-use-it",
    title: "Why we use it",
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>respond to your inquiry and follow up on it;</li>
          <li>
            receive, review and arrange a viewing you have requested, and tell you
            whether it can be confirmed;
          </li>
          <li>
            discuss a property you are thinking of selling, and decide whether and how
            we can help;
          </li>
          <li>keep the website secure and prevent spam and misuse; and</li>
          <li>keep the records we need to run our business.</li>
        </ul>
        <p>
          The basis for this is your consent, which you give by ticking the box on each
          form, together with steps taken at your request before any agreement, and our
          legitimate interest in keeping the website safe. We do not use your details
          for marketing unless you separately ask us to, and submitting an inquiry does
          not sign you up for anything.
        </p>
      </>
    ),
  },
  {
    id: "inquiries-and-viewings",
    title: "How inquiries and viewing requests are handled",
    body: (
      <>
        <p>
          When you submit a form, your details are saved in our inquiry system and are
          visible only to authorized RC Premier staff, who sign in to a protected area
          to read and respond. We may notify our team by email that a new inquiry has
          arrived.
        </p>
        <p>
          A viewing request is a request only. It becomes an appointment when our staff
          confirm it with you, and we may contact you by phone or email to do that or to
          suggest another time.
        </p>
      </>
    ),
  },
  {
    id: "who-we-share-with",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We do not sell your personal information. We share it only with people and
          services that help us run the website and respond to you, such as the hosting,
          database and email services we use to store and deliver inquiries, and only to
          the extent they need it. We may also disclose information where the law or a
          lawful order requires it.
        </p>
        <p>
          Some pages load content from other services. A property tour video loads from
          YouTube’s privacy-enhanced player only once you press play, and map views load
          map tiles from a map provider, which means your browser connects to those
          services and they can see your IP address. Links to our social media profiles
          take you to those platforms, which have their own privacy policies.
        </p>
      </>
    ),
  },
  {
    id: "how-long-we-keep-it",
    title: "How long we keep it",
    body: (
      <p>
        We keep inquiry information for as long as it is needed to respond to you,
        follow up on a viewing or seller conversation, and maintain our business
        records, and no longer than is reasonably necessary. We review requests to
        delete information individually, and we may need to keep some details where the
        law requires it or where they are needed to establish or defend a legal claim.
      </p>
    ),
  },
  {
    id: "how-we-protect-it",
    title: "How we protect it",
    body: (
      <>
        <p>
          We use reasonable organizational and technical measures to protect personal
          information. Inquiries can be read only by signed-in staff with the right
          permission, the website limits how often forms can be submitted, and form
          submissions are checked before they are saved.
        </p>
        <p>
          No website or storage system is completely secure, so we cannot promise
          absolute security. If a personal data breach occurs that requires notice under
          Philippine law, we will notify the National Privacy Commission and affected
          individuals as the law requires.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>be informed about how your personal information is processed;</li>
          <li>object to processing, or withdraw your consent;</li>
          <li>access the personal information we hold about you;</li>
          <li>ask us to correct inaccurate or outdated information;</li>
          <li>
            ask us to suspend, withdraw, block or delete information that is incomplete,
            outdated, false, unlawfully obtained or no longer necessary;
          </li>
          <li>
            receive your information in a commonly used electronic format, where
            applicable;
          </li>
          <li>
            claim compensation for damages caused by inaccurate or unlawful processing;
            and
          </li>
          <li>
            lodge a complaint with the National Privacy Commission (privacy.gov.ph) if
            you believe your rights have been violated.
          </li>
        </ul>
        <p>
          Some of these rights are subject to conditions and exceptions set out in the
          law.
        </p>
      </>
    ),
  },
  {
    id: "privacy-requests",
    title: "Making a privacy request",
    body: (
      <p>
        To access, correct or delete your information, withdraw consent, or ask any
        privacy question, email {email} from the address you used on the form and tell
        us what you would like us to do. We may ask you to confirm your identity before
        we act on a request, and we will reply as soon as we reasonably can.
      </p>
    ),
  },
  {
    id: "cookies-and-storage",
    title: "Cookies and similar technologies",
    body: (
      <p>
        The public pages of this website do not use advertising or analytics cookies or
        trackers. Your browser may keep small functional items for the length of your
        visit, such as remembering that the introduction animation has played or where
        you were on the home page. These stay in your browser and are not sent to us. If
        we add analytics or advertising tools in the future, we will update this policy
        and ask for your consent first where it is required.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as our website or practices change. The date at the
        top of the page shows when it was last revised.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title={
        <>
          Privacy <em>Policy</em>.
        </>
      }
      description="What we collect when you contact us, request a viewing or tell us about a property, why we need it, and the choices you have."
      sections={sections}
    />
  );
}
