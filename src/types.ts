export type OfferType =
  | "internship"
  | "internship_job"
  | "job"
  | "contract"
  | "freelance"
  | "other";

export type ApplicationStatus =
  | "applied"
  | "review"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "expired";

export type ProfileRow = {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  role: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  job_title: string | null;
  package_offered: string | null;
  applied_on: string;
  deadline: string | null;
  google_form_link: string | null;
  offer_type: OfferType;
  status: ApplicationStatus;
  job_description: string;
  google_form_screenshot_path: string | null;
  resume_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          full_name: string;
          username?: string | null;
          email?: string | null;
          role?: string | null;
          location?: string | null;
        };
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
        Relationships: [];
      };
      applications: {
        Row: ApplicationRow;
        Insert: {
          id?: string;
          user_id: string;
          company: string;
          job_title?: string | null;
          package_offered?: string | null;
          applied_on: string;
          deadline?: string | null;
          google_form_link?: string | null;
          offer_type: OfferType;
          status?: ApplicationStatus;
          job_description: string;
          google_form_screenshot_path?: string | null;
          resume_path?: string | null;
          notes?: string | null;
        };
        Update: Partial<Omit<ApplicationRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_email_by_username: {
        Args: { username_input: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const offerTypeLabels: Record<OfferType, string> = {
  internship: "Internship",
  internship_job: "Internship + Job",
  job: "Job",
  contract: "Contract",
  freelance: "Freelance",
  other: "Other",
};

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  review: "Review",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export const statuses: ApplicationStatus[] = [
  "applied",
  "review",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "expired",
];

export const offerTypes: OfferType[] = [
  "internship",
  "internship_job",
  "job",
  "contract",
  "freelance",
  "other",
];
