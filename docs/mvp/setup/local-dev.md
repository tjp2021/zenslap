# Local Development Setup

## Prerequisites
- Node.js 18+
- npm/yarn
- Supabase CLI

## Quick Start
1. Clone repository
```bash
git clone <repository-url>
cd autocrm
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Start development server
```bash
npm run dev
```

## Supabase Setup
1. Initialize Supabase
```bash
supabase init
```

2. Start local Supabase
```bash
supabase start
```

3. Apply migrations
```bash
supabase db reset
``` 