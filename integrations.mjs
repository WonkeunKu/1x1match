export function createPaymentProvider({ provider = "mock" } = {}) {
  if (provider !== "mock") {
    throw new Error(`Payment provider "${provider}" is not connected yet. Use PAYMENT_PROVIDER=mock for now.`);
  }

  return {
    name: "mock",

    async captureParticipationFee({ member, match, amount }) {
      return {
        ok: true,
        provider: "mock",
        paymentId: `mock-pay-${match.id}-${member.id}`,
        amount,
      };
    },

    async refundParticipationFee({ member, match, amount }) {
      return {
        ok: true,
        provider: "mock",
        refundId: `mock-refund-${match.id}-${member.id}`,
        amount,
      };
    },
  };
}

export function createSmsProvider({ provider = "mock" } = {}) {
  if (provider !== "mock") {
    throw new Error(`SMS provider "${provider}" is not connected yet. Use SMS_PROVIDER=mock for now.`);
  }

  return {
    name: "mock",

    async send({ to, message, type }) {
      return {
        ok: true,
        provider: "mock",
        messageId: `mock-sms-${Date.now()}`,
        to,
        type,
        message,
      };
    },
  };
}

