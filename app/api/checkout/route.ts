// /api/dodopayments/checkout/route.ts
import { Checkout } from '@dodopayments/nextjs';

export const POST = Checkout({
  bearerToken: process.env.NEXT_PUBLIC_DODO_PAYMENTS_API_KEY!,
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}`,
  environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
  type: "session",
});