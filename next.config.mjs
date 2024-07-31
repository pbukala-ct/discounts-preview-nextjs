/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
      NEXT_PUBLIC_CTP_PROJECT_KEY: process.env.NEXT_PUBLIC_CTP_PROJECT_KEY,
      NEXT_PUBLIC_CTP_AUTH_URL: process.env.NEXT_PUBLIC_CTP_AUTH_URL,
      NEXT_PUBLIC_CTP_API_URL: process.env.NEXT_PUBLIC_CTP_API_URL,
      NEXT_PUBLIC_CTP_SCOPE: process.env.NEXT_PUBLIC_CTP_SCOPE,
      NEXT_PUBLIC_CTP_REGION: process.env.NEXT_PUBLIC_CTP_REGION,
      CTP_CLIENT_ID: process.env.CTP_CLIENT_ID,
      CTP_CLIENT_SECRET: process.env.CTP_CLIENT_SECRET,
    },
    reactStrictMode: false,
    images: {
      domains: ['images.cdn.australia-southeast1.gcp.commercetools.com'],
    },
  }

export default nextConfig;
