# Time Tracking & Invoicing SaaS Platform

## Project Overview

A modern, efficient time tracking and invoicing web application designed for seamless client management and financial tracking.

## Deployment Architecture

This application uses a two-server setup:

- **Server 1 (Reverse Proxy)**: aaPanel running on a separate server, handling SSL termination and routing
- **Server 2 (Application Server)**: Running the Time Tracking application (192.168.0.103)

## Deployment Instructions for Application Server (192.168.0.103)

### Prerequisites

- Node.js (v18.x or later)
  ```bash
  # Install Node.js using NVM
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # Reload shell configuration
  source ~/.bashrc
  # Install and use Node.js LTS
  nvm install --lts
  nvm use --lts
  ```

### 1. Clone and Setup

```bash
# Create project directory
mkdir -p /home/time-user/time-tracking
cd /home/time-user/time-tracking

# Clone the repository (replace with your actual repository URL)
git clone <YOUR_GIT_REPOSITORY_URL> .

# Install dependencies
npm install
```

### 2. Build and Configure the Application

```bash
# Build the production version
npm run build

# Install serve globally to host the production build
npm install -g serve
```

### 3. Configure Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start serve --name "time-tracking" -- -s /home/time-user/time-tracking/dist -l 8080

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

### 4. Testing the Application

After deployment, the application should be accessible on the server at `http://192.168.0.103:8080`

## Reverse Proxy Configuration (aaPanel Server)

Configure the reverse proxy to forward requests from `timetracking.techlinx.se` to the application server:

### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name timetracking.techlinx.se;
    
    # SSL Configuration
    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;
    
    # Proxy Configuration
    location / {
        proxy_pass http://192.168.0.103:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name timetracking.techlinx.se;
    return 301 https://$server_name$request_uri;
}
```

## Supabase Configuration

The application uses Supabase for backend services. The default configuration connects to a Supabase cloud instance.

If you need to connect to a different Supabase cloud project:

1. Navigate to your Supabase project dashboard
2. Go to Project Settings > API
3. Copy the Project URL, Anon Key, and Project Reference ID
4. Open `src/config/environment.ts`
5. Update the values in the configuration object

```typescript
export const environment: EnvironmentConfig = {
  supabase: {
    url: 'your-project-url',
    anonKey: 'your-anon-key',
    projectRef: 'your-project-ref',
  },
  fortnox: {
    authUrl: 'https://apps.fortnox.se/oauth-v1/auth',
    apiUrl: 'https://api.fortnox.se/3',
    redirectBaseUrl: '/settings?tab=fortnox',
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  features: {
    enableEdgeFunctions: true,
  }
};
```

## Maintenance Commands

### Updating the Application

```bash
cd /home/time-user/time-tracking
git pull
npm install
npm run build
pm2 restart time-tracking
```

### Viewing Logs

```bash
# View application logs
pm2 logs time-tracking

# View system logs
journalctl -u pm2-time-user
```

### Troubleshooting

If the application is not accessible:

1. Verify the application is running: `pm2 status`
2. Check application logs: `pm2 logs time-tracking`
3. Ensure port 8080 is not blocked: `sudo ufw status`
4. Test local access on the server: `curl http://localhost:8080`
5. Check reverse proxy configuration on the aaPanel server

## License

[Your License Here]
