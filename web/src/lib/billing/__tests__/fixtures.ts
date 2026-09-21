import type { Stripe } from 'stripe'

type Event = Stripe.Event

const baseEvent = {
  apiVersion: '2025-08-27.basil',
  created: 1724736000,
  livemode: false,
  pendingWebhooks: 0,
  request: { id: 'req_test', idempotency_key: null },
}

export const subscriptionCreatedEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_sub_created',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_1',
        object: 'subscription',
        customer: 'cus_test_1',
        status: 'trialing',
        current_period_start: 1724736000,
        current_period_end: 1727328000,
        cancel_at_period_end: false,
        trial_end: 1725340800,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test_1',
              object: 'subscription_item',
              price: { id: 'price_test_growth', object: 'price' },
            },
          ],
          has_more: false,
          url: '/v1/subscription_items?subscription=sub_test_1',
        },
      } as never,
    },
    ...overrides,
  }) as Stripe.Event

export const subscriptionUpdatedEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_sub_updated',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_1',
        object: 'subscription',
        customer: 'cus_test_1',
        status: 'active',
        current_period_start: 1724736000,
        current_period_end: 1727328000,
        cancel_at_period_end: false,
        trial_end: null,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test_1',
              object: 'subscription_item',
              price: { id: 'price_test_starter', object: 'price' },
            },
          ],
          has_more: false,
          url: '/v1/subscription_items?subscription=sub_test_1',
        },
      } as never,
    },
    ...overrides,
  }) as Stripe.Event

export const subscriptionDeletedEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_sub_deleted',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_1',
        object: 'subscription',
        customer: 'cus_test_1',
        status: 'canceled',
        current_period_start: 1724736000,
        current_period_end: 1727328000,
        cancel_at_period_end: false,
        trial_end: null,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test_1',
              object: 'subscription_item',
              price: { id: 'price_test_starter', object: 'price' },
            },
          ],
          has_more: false,
          url: '/v1/subscription_items?subscription=sub_test_1',
        },
      } as never,
    },
    ...overrides,
  }) as Stripe.Event

export const invoicePaymentFailedEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_invoice_failed',
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_1',
        object: 'invoice',
        subscription: 'sub_test_1',
        status: 'open',
      } as never,
    },
    ...overrides,
  }) as Stripe.Event

export const trialWillEndEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_trial_will_end',
    type: 'customer.subscription.trial_will_end',
    data: {
      object: {
        id: 'sub_test_1',
        object: 'subscription',
        customer: 'cus_test_1',
        status: 'trialing',
        current_period_start: 1724736000,
        current_period_end: 1727328000,
        cancel_at_period_end: false,
        trial_end: 1725340800,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test_1',
              object: 'subscription_item',
              price: { id: 'price_test_growth', object: 'price' },
            },
          ],
          has_more: false,
          url: '/v1/subscription_items?subscription=sub_test_1',
        },
      } as never,
    },
    ...overrides,
  }) as Stripe.Event

export const unhandledEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    ...baseEvent,
    id: 'evt_test_unhandled',
    type: 'customer.created',
    data: { object: { id: 'cus_test_1', object: 'customer' } as never },
    ...overrides,
  }) as Stripe.Event
