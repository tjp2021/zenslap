# Getting Started

## Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

## Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd autocrm
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

1. Create a new Supabase project
2. Run the database migrations:
```bash
npx supabase db push
```

3. Set up authentication:
   - Enable Email/Password sign-up
   - Configure OAuth providers (optional)

4. Configure RLS policies:
   - Navigate to Authentication > Policies
   - Apply the provided RLS policies for tickets table

## Development

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── (dashboard)/       # Protected routes
├── components/            # React components
│   ├── tickets/          # Ticket-related components
│   └── ui/               # UI components
├── lib/                   # Shared utilities
│   ├── api/              # API handlers
│   ├── context/          # React contexts
│   ├── supabase/         # Supabase client
│   ├── types/            # TypeScript types
│   └── validation/       # Schema validation
└── hooks/                # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Deployment

1. Configure environment variables in your hosting platform
2. Deploy using the platform's deployment process
3. Run database migrations in production

## Common Issues

### Authentication Issues
- Ensure Supabase URL and anon key are correct
- Check if RLS policies are properly configured
- Verify user roles and permissions

### Real-time Updates
- Enable real-time in Supabase dashboard
- Check WebSocket connection in browser console
- Verify subscription channels 