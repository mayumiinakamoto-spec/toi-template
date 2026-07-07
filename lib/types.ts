export type Entry = {
  id: string;
  created_at: string;
  entry_date: string;
  role: "user" | "coach";
  mode: "toi" | "jogen" | null;
  body: string;
};
