# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account
- AWS account (for Amplify deployment)
- Git repository set up

## Environment Setup

1. Create a `.env.production` file with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

2. Configure Supabase Production Project:
   - Create a new project in Supabase
   - Enable required auth providers
   - Set up RLS policies
   - Run migrations:
     ```bash
     npx supabase db push
     ```

## Build Process

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Build the application:
```bash
npm run build
# or
yarn build
```

3. Test the production build locally:
```bash
npm run start
# or
yarn start
```

## Deployment Options

### 1. AWS Amplify (Recommended)

1. Connect your repository to AWS Amplify:
   - Go to AWS Amplify Console
   - Click "New App" > "Host Web App"
   - Connect your Git provider
   - Select your repository

2. Configure build settings:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

3. Add environment variables in Amplify Console:
   - Go to App Settings > Environment Variables
   - Add all variables from `.env.production`

### 2. Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Configure environment variables in Vercel dashboard

### 3. Manual Deployment

1. Set up a production server with:
   - Node.js 18+
   - PM2 or similar process manager
   - Nginx as reverse proxy

2. Configure Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Deploy using PM2:
```bash
pm2 start npm --name "autocrm" -- start
```

## Post-Deployment Checklist

1. Database
   - [ ] Verify Supabase connection
   - [ ] Test RLS policies
   - [ ] Run migrations

2. Authentication
   - [ ] Test user signup
   - [ ] Test user login
   - [ ] Verify role-based access

3. Features
   - [ ] Test ticket creation
   - [ ] Verify real-time updates
   - [ ] Check file uploads (if applicable)

4. Performance
   - [ ] Enable caching
   - [ ] Configure CDN
   - [ ] Set up monitoring

## Monitoring and Maintenance

1. Set up monitoring:
   - Application logs
   - Error tracking (e.g., Sentry)
   - Performance monitoring

2. Configure alerts for:
   - Server errors
   - Performance degradation
   - Database issues

3. Regular maintenance:
   - Database backups
   - Security updates
   - Dependency updates

## Rollback Procedure

1. Keep previous deployment version:
```bash
pm2 save
```

2. If issues occur:
```bash
git checkout previous-version
npm install
npm run build
pm2 restart autocrm
```

## Security Considerations

1. Enable HTTPS
2. Set up CORS properly
3. Configure CSP headers
4. Regular security audits
5. Keep dependencies updated

## Troubleshooting

Common issues and solutions:

1. Build Failures
   - Clear `.next` directory
   - Remove `node_modules` and reinstall
   - Check Node.js version

2. Database Connection Issues
   - Verify environment variables
   - Check RLS policies
   - Test connection strings

3. Real-time Issues
   - Check WebSocket connections
   - Verify Supabase real-time configuration
   - Test network connectivity 