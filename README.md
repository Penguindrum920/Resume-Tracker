# Resume Tracker

A full-featured React application for tracking job/internship applications, backed by Supabase Auth, Postgres, and private Storage uploads.

## Features

### Core
- **User Authentication** - Sign up/sign in with email and password
- **User Profiles** - Name, target role, location
- **Resume Upload** - Upload resumes per application (Supabase Storage)
- **Google Form Screenshot Upload** - Upload screenshots per application
- **Application Tracking** - Full CRUD with status management

### Application Management
- **Package Offered** - Track compensation/package for each application
- **Deadline Tracking** - Set and monitor application deadlines
- **Google Form Links** - Store direct links to application forms (opens in new tab)
- **Offer Types** - Internship, Internship + Job, Job, Contract, Freelance, Other
- **Statuses** - Applied, Review, Interview, Offer, Rejected, Withdrawn, Expired

### Quick Add (WhatsApp Message Parser)
- Paste an entire placement WhatsApp message
- Automatically extracts: Company, Role, Package, Deadline, Google Form Link, Offer Type, Job Description, Notes
- Editable preview before saving
- Understands variations like CTC, Salary, Compensation, Last Date, Apply Before, etc.

### Dashboard
- **Statistics** - Total, Pending, Review, Interviews, Offers, Rejected, Deadlines This Week
- **Upcoming Deadlines** - Color-coded reminder cards sorted by urgency (today, tomorrow, 3 days, 7 days, expired)
- **Recent Activity** - Last 5 applications with relative dates
- **Quick Actions** - New Application button

### Search, Filter & Sort
- **Global Search** - Across company, role, package, notes, description, offer type
- **Filters** - Company, Role, Status, Offer Type, Package Range (LPA), Deadline Range, Applied Date Range
- **Sorting** - By Deadline, Applied Date, Company, Package, Status (ascending/descending)

### Dark Mode
- Professional dark theme (not just color inversion)
- System preference detection via `prefers-color-scheme`
- localStorage persistence
- Theme toggle in sidebar

### UX Improvements
- Toast notifications (success, error, info)
- Skeleton loaders during data fetch
- Empty states with helpful messages
- Confirmation dialogs for destructive actions
- Smooth animations and transitions
- Inline form validation with error messages
- Responsive design (desktop, tablet, mobile)

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Supabase (Auth, Postgres, Storage)
- Lucide React icons
- Custom CSS (no framework)

## Project Structure

```
src/
  components/         # Reusable UI components
    AuthPanel.tsx      # Sign in / sign up form
    Sidebar.tsx        # Navigation, profile, theme toggle
    StatsGrid.tsx      # Dashboard statistics
    ApplicationForm.tsx # Add/Edit form with validation
    ApplicationCard.tsx # Application list item
    ApplicationDetail.tsx # Detail panel with all fields
    FilterBar.tsx      # Search filters and sort controls
    DeadlineReminders.tsx # Upcoming deadline cards
    RecentActivity.tsx # Recent applications
    QuickAddPage.tsx   # WhatsApp message parser page
    ToastContainer.tsx # Toast notifications
    ConfirmDialog.tsx  # Confirmation dialog
    Skeleton.tsx       # Loading skeletons
    EmptyState.tsx     # Empty state display
    ThemeToggle.tsx    # Dark/light mode toggle
  hooks/
    useTheme.ts        # Theme management with system preference
    useToast.ts        # Toast notification queue
    useApplications.ts # Application data and operations
  lib/
    supabase.ts        # Supabase client
    validation.ts      # Form validation utilities
    applicationUtils.ts # Search, filter, sort utilities
    deadlines.ts       # Deadline reminder engine
    placementParser.ts # WhatsApp message parser
  types.ts             # TypeScript types
  App.tsx              # Main app component
  main.tsx             # Entry point
  styles.css           # All styles including dark mode
supabase/
  schema.sql           # Database schema with RLS
```

## Local Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Install and run:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel Deployment

Set the same environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then deploy with:

```bash
vercel --prod
```

The included `vercel.json` points Vercel at the Vite build output.

## Supabase Auth

For production, set the Supabase Auth Site URL to your Vercel URL. Add local and production redirect URLs as needed:

```text
http://localhost:5173
https://your-vercel-domain.vercel.app
```
