export type BookingStatus = "booked" | "cancellation_requested" | "cancelled";

export type MiqaatStatusRow = {
  id: string;
  year: string;
  hijri_month: string;
  hijri_day: string;
  gregorian_date: string;
  day_of_week: string;
  name: string;
  location: string | null;
  niyaz_notes: string | null;
  availability: "open" | "taken";
  booking_status: BookingStatus | null;
};

export type MyBookingRow = {
  booking_id: string;
  miqaat_id: string;
  hijri_month: string;
  hijri_day: string;
  gregorian_date: string;
  name: string;
  status: BookingStatus;
  created_at: string;
  cancellation_requested_at: string | null;
  days_until_miqaat: number;
};

export type AdminBookingRow = {
  id: string;
  miqaat_id: string;
  family_name: string;
  contact: string | null;
  headcount_estimate: number | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  cancellation_requested_at: string | null;
  admin_notes: string | null;
  miqaat: {
    id: string;
    hijri_month: string;
    hijri_day: string;
    gregorian_date: string;
    name: string;
    location: string | null;
  };
};
