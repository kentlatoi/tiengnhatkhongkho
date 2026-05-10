# JLPT LMS - Supabase Database Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in project details and wait for creation
4. Go to **Settings → API** to get your credentials

## 2. Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
VITE_DATA_PROVIDER=supabase
```

> ⚠️ **NEVER expose** `service_role` key, `secret` key, or database password in frontend code.
> Only use the **publishable anon key** (`VITE_SUPABASE_ANON_KEY`).

## 3. Create Database Tables

Run this SQL in Supabase **SQL Editor**:

```sql
-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  avatar_url TEXT,
  phone TEXT,
  birthday DATE,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CLASSES
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'N5',
  schedule TEXT,
  icon TEXT DEFAULT '🗻',
  teacher_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CLASS MEMBERS (student ↔ class relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- ============================================
-- LESSON SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  start_time TEXT,
  end_time TEXT,
  homework TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  files JSONB DEFAULT '[]',
  audio_files JSONB DEFAULT '[]',
  video_files JSONB DEFAULT '[]',
  quiz JSONB DEFAULT '[]',
  flashcards JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- UPLOADED FILES (metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT DEFAULT 'document',
  bucket_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CALENDAR EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  class_name TEXT,
  teacher_id UUID REFERENCES profiles(id),
  teacher_name TEXT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  homework TEXT,
  location TEXT,
  meeting_link TEXT,
  lesson_session_id UUID REFERENCES lesson_sessions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- VOCABULARY
-- ============================================
CREATE TABLE IF NOT EXISTS vocabulary_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES vocabulary_topics(id) ON DELETE CASCADE,
  japanese TEXT NOT NULL,
  hiragana TEXT,
  romaji TEXT,
  vietnamese TEXT,
  english TEXT,
  example TEXT,
  learned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GRAMMAR
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grammar_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES grammar_topics(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  explanation TEXT,
  vietnamese_explanation TEXT,
  english_explanation TEXT,
  examples JSONB DEFAULT '[]',
  notes TEXT,
  learned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- QUIZZES
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FLASHCARDS
-- ============================================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In case order_index was missed in earlier schema setups:
-- ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
-- NOTIFY pgrst, 'reload schema';

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

## 4. Create Storage Buckets

Go to **Storage** in Supabase Dashboard and create:

| Bucket Name     | Public | Purpose                    |
|----------------|--------|----------------------------|
| `avatars`       | ✅ Yes  | User profile pictures      |
| `class-images`  | ✅ Yes  | Class cover images         |
| `lesson-files`  | ❌ No   | PDF, Word, images, videos  |
| `listening-files`| ❌ No  | MP3, MP4, WAV audio files  |

### Storage Policies

For **public buckets** (`avatars`, `class-images`), add these policies:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars', 'class-images'));

-- Allow public read
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('avatars', 'class-images'));

-- Allow users to update their own avatars
CREATE POLICY "Allow avatar update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');
```

For **private buckets** (`lesson-files`, `listening-files`):

```sql
-- Allow teacher/admin upload
CREATE POLICY "Allow teacher upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('lesson-files', 'listening-files'));

-- Allow authenticated read (download via signed URL)
CREATE POLICY "Allow authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('lesson-files', 'listening-files'));
```

### Private Bucket: Signed URLs

For private buckets, the app uses **signed URLs** to provide temporary download access:

```javascript
// Example: Generate signed URL (valid for 1 hour)
const { data } = await supabase.storage
  .from('lesson-files')
  .createSignedUrl('path/to/file.pdf', 3600);
// data.signedUrl → use this for preview/download
```

## 5. Create Admin Auth User

### Step 1: Create Auth User
Go to **Authentication → Users** in Supabase Dashboard:
1. Click **Add User → Create New User**
2. Email: `912khangnguyen@gmail.com`
3. Password: (set your secure password)
4. Check **Auto Confirm User**

### Step 2: Create Admin Profile
After the auth user is created, copy the user's `id` from the Auth panel, then run:

```sql
INSERT INTO profiles (auth_id, email, full_name, role)
VALUES (
  'paste-auth-user-id-here',
  '912khangnguyen@gmail.com',
  'Kent Nguyen',
  'admin'
);
```

## 6. Switching Between localStorage and Supabase

### Use Supabase (production):
Set these in `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DATA_PROVIDER=supabase
```

### Use localStorage (development/offline):
Simply remove or comment out the env variables. The app auto-detects:
- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist → Supabase
- If missing → localStorage with seed data
- Console warning will appear in localStorage mode

The switch is handled in `src/lib/supabaseClient.js`:
```javascript
export function isSupabase() {
  return !!supabase;
}
```

## 7. File Upload Architecture

```
User uploads file
     ↓
Frontend reads file
     ↓
Upload to Supabase Storage bucket
     ↓
Save metadata to `uploaded_files` table
     ↓
For private files: generate signed URL for access
For public files: use public URL directly
```

### Supported File Types

**Lesson Files** (`lesson-files` bucket):
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Images (`.jpg`, `.jpeg`, `.png`, `.webp`)
- Videos (`.mp4`, `.mov`, `.webm`)

**Listening Files** (`listening-files` bucket):
- Audio (`.mp3`, `.mp4`, `.wav`, `.m4a`, `.aac`)

## 8. Row Level Security (RLS)

Enable RLS on all tables for production. Example policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- Classes: all authenticated can read
CREATE POLICY "Read all classes" ON classes FOR SELECT TO authenticated USING (true);

-- Class members: all authenticated can read
CREATE POLICY "Read class members" ON class_members FOR SELECT TO authenticated USING (true);

-- Sessions: all authenticated can read
CREATE POLICY "Read sessions" ON lesson_sessions FOR SELECT TO authenticated USING (true);
```

> **Note**: For initial development, you can disable RLS on tables to avoid permission issues.
> Enable and configure policies before going to production.

## 9. Security Checklist

| ❌ Never Expose | ✅ Safe to Use |
|-----------------|---------------|
| `service_role` key | `anon` key (publishable) |
| Database password | Supabase URL |
| Secret/JWT key | Public bucket URLs |
| `.env.local` file | `.env.example` file |

## 10. Testing Checklist

### Admin Flow
- [ ] Login with admin credentials
- [ ] View all users
- [ ] Create teacher/student account
- [ ] View all classes
- [ ] Open class detail
- [ ] Delete class
- [ ] View all calendar events
- [ ] View activity logs

### Teacher Flow
- [ ] Login with teacher credentials
- [ ] Create class
- [ ] Assign students to class
- [ ] Add lesson session
- [ ] Upload PDF/image/Word file
- [ ] Upload MP3/MP4 listening file
- [ ] Create calendar event
- [ ] Edit calendar event

### Student Flow
- [ ] Login with student credentials
- [ ] See only assigned classes
- [ ] Open class detail
- [ ] View session details
- [ ] Download file
- [ ] Play listening file
- [ ] See only assigned class calendar
- [ ] View vocabulary/grammar

## 11. Migration SQL (for existing databases)

If your database was created with an older schema, run these to add missing columns:

```sql
-- ============================================
-- PROFILES: rename auth_id → auth_user_id
-- ============================================
ALTER TABLE profiles RENAME COLUMN auth_id TO auth_user_id;

-- ============================================
-- CLASSES: add missing columns
-- ============================================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'N5';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🗻';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- If you had 'thumbnail' instead of 'icon':
-- ALTER TABLE classes RENAME COLUMN thumbnail TO icon;

-- If you had 'teacher_name' column (no longer needed):
-- ALTER TABLE classes DROP COLUMN IF EXISTS teacher_name;

-- ============================================
-- RLS: Allow all CRUD for authenticated users (dev mode)
-- ============================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON class_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE lesson_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON lesson_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
