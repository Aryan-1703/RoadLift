import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16', // Use the latest stable version
});

export class StripeService {
  
  /**
   * Creates a PaymentIntent to hold funds before the job completes.
   */
  static async createPaymentIntent(amount: number, customerEmail: string) {
    return await stripe.paymentIntents.create({
      // Stripe expects amount in cents
      amount: Math.round(amount * 100),
      currency: 'cad',
      receipt_email: customerEmail,
      capture_method: 'manual', // Authorize now, capture later when job is complete
      metadata: {
        integration_check: 'accept_a_payment',
      },
    });
  }

  /**
   * Captures the previously authorized funds once the job is marked COMPLETED.
   */
  static async capturePayment(paymentIntentId: string, finalAmount?: number) {
    const amountToCapture = finalAmount ? Math.round(finalAmount * 100) : undefined;
    
    return await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: amountToCapture,
    });
  }

  /**
   * Verify Webhook signature to ensure the event actually came from Stripe
   */
  static verifyWebhookSignature(payload: string | any, signature: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }
}