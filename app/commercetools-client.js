import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk'
import { ClientBuilder } from '@commercetools/sdk-client-v2'

const projectKey = process.env.NEXT_PUBLIC_CTP_PROJECT_KEY
const scopes = [process.env.NEXT_PUBLIC_CTP_SCOPE]

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow({
    host: process.env.NEXT_PUBLIC_CTP_AUTH_URL,
    projectKey,
    credentials: {
      clientId: process.env.CTP_CLIENT_ID,
      clientSecret: process.env.CTP_CLIENT_SECRET,
    },
    scopes,
  })
  .withHttpMiddleware({
    host: process.env.NEXT_PUBLIC_CTP_API_URL,
  })
  .build()

const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({ projectKey })

export { apiRoot }