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
  screenshots?: ApplicationScreenshotRow[];
};

export type ApplicationScreenshotRow = {
  id: string;
  application_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type UserIntegrationRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_account_email: string | null;
  spreadsheet_id: string;
  connected_at: string;
  last_sync_at: string | null;
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
      application_screenshots: {
        Row: ApplicationScreenshotRow;
        Insert: {
          id?: string;
          application_id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          display_order?: number;
        };
        Update: Partial<Omit<ApplicationScreenshotRow, "id" | "application_id" | "user_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "application_screenshots_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_screenshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_integrations: {
        Row: UserIntegrationRow;
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_account_email?: string | null;
          spreadsheet_id: string;
          connected_at?: string;
          last_sync_at?: string | null;
        };
        Update: Partial<Omit<UserIntegrationRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_email_by_username: {
        Args: { username_input: string };
        Returns: string;
      };
      create_profile: {
        Args: {
          user_id: string;
          p_full_name: string;
          p_username?: string | null;
          p_email?: string | null;
        };
        Returns: ProfileRow;
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
