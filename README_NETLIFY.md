# Deploying Split-Biller Server to Netlify

This guide will help you deploy your Split-Biller server to Netlify.

## Pre-deployment Setup

1. Ensure you have a Netlify account
2. Install the Netlify CLI (optional for direct deployment):
   ```
   npm install -g netlify-cli
   ```

## Environment Variables

Set the following environment variables in Netlify:

- `MONGO_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to "production"

Plus any other environment variables your application requires.

## Deployment Methods

### Option 1: Deploy via GitHub

1. Push your code to a GitHub repository
2. Log in to Netlify and select "New site from Git"
3. Connect to your GitHub repository
4. Set build command as `npm install`
5. Set publish directory as `public`
6. Add the environment variables in the Netlify UI
7. Deploy!

### Option 2: Deploy via Netlify CLI

1. Navigate to the server directory
2. Run `netlify login` to authenticate
3. Run `netlify init` to set up a new site
4. Follow the prompts to configure your site
5. Run `netlify deploy --prod` to deploy

## Checking Deployment

After deployment, your API will be available at:
- API Base URL: `https://your-netlify-site-name.netlify.app/.netlify/functions/api`
- API Routes: `https://your-netlify-site-name.netlify.app/api/*`

## Troubleshooting

- **Function Timeout**: If you experience function timeouts, you may need to increase the function timeout in your Netlify settings.
- **Cold Start**: Serverless functions have a cold start, so the first request might be slow.
- **Logs**: Check the Netlify function logs for any errors.

## Limitations

Netlify has some limitations for serverless functions:
- 10-second execution timeout for the free tier
- 125MB uncompressed size limit for all functions combined
- Maximum of 1000 function invocations per site per month on the free tier 