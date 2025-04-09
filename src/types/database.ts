
export interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
}
