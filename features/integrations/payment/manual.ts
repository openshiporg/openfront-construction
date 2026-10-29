export async function createPaymentFunction({ order, amount, currency }: { order: any; amount: number; currency: string }) { return { id: order.paymentId, reference: order.paymentId, status: "pending", amount, currency: currency.toUpperCase() }; }
export async function capturePaymentFunction({ paymentId, amount }: { paymentId: string; amount: number }) { return { id: paymentId, status: "succeeded", amount }; }
export async function refundPaymentFunction({ paymentId, amount }: { paymentId: string; amount: number }) { return { id: paymentId, status: "refunded", amount }; }
export async function getPaymentStatusFunction({ paymentId }: { paymentId: string }) { return { id: paymentId, status: "pending" }; }
export async function generatePaymentLinkFunction({ paymentId }: { paymentId: string }) { return { id: paymentId, reference: paymentId }; }
export async function handleWebhookFunction() { return { isValid: false, type: "manual", resource: {} }; }
