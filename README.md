# PYQJIIT
one place for everyone to share and view JIIT question papers.

## Setup
Prerequisites
- Node.js (18+ recommended)
- npm or yarn
- Supabase account

this app is built with React + Vite and integrated with Supabase + PostgreSQL.
```bash
git clone https://github.com/rushilkoul/pyqjiit.git
cd pyqjiit

npm install
```
### create a .env
refer `.env.example`: Fill up your Supabase credentials
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
### run the development server
```bash
npm run dev
```
available on `http://localhost:5173`


### Supabase schema:
The app looks for a table `papers` and a bucket `papers`
Run in the SQL editor to make your table `papers`:
```sql
CREATE TABLE IF NOT EXISTS public.papers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename text NOT NULL,
  file_key text NOT NULL,
  subject text,
  year text,
  batch text,
  uploaded_by text,
  uploaded_by_id uuid NOT NULL,
  verified boolean DEFAULT false,
  flagged boolean DEFAULT false,
  inserted_at timestamptz DEFAULT now(),
  semester text,
  CONSTRAINT check_valid_semester CHECK (
    semester IS NULL OR semester IN (
      'Semester 1','Semester 2','Semester 3','Semester 4',
      'Semester 5','Semester 6','Semester 7','Semester 8'
    )
  )
);

-- faster filtering, indexes
CREATE INDEX IF NOT EXISTS idx_papers_subject ON public.papers(subject);
CREATE INDEX IF NOT EXISTS idx_papers_year ON public.papers(year);
CREATE INDEX IF NOT EXISTS idx_papers_batch ON public.papers(batch);
CREATE INDEX IF NOT EXISTS idx_papers_semester ON public.papers(semester);
CREATE INDEX IF NOT EXISTS idx_papers_year_semester ON public.papers(year, semester);

-- RLS
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- policies
DROP POLICY IF EXISTS "Logged-in users can insert" ON public.papers;
CREATE POLICY "Logged-in users can insert"
ON public.papers
FOR INSERT TO authenticated
WITH CHECK (uploaded_by_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "All users can view papers" ON public.papers;
CREATE POLICY "All users can view papers"
ON public.papers
FOR SELECT
USING (true);
```
> [!IMPORTANT]
> these are NOT the exact queries i ran. <br />
> during development i changed a lot of stuff so this is my best attempt at recreating what i did, if there are issues let me know

Also make your `papers` bucket.

## Deploying
The project is configured for deployment on Vercel with the included `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
