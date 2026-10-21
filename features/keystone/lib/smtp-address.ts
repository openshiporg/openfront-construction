/** Bounded single ASCII mailbox, never an address-list/parser/raw/options input.
 * SMTP host/auth are server configuration and are not tenant/user controlled. */
export function smtpAddress(value: string): string {
  if (value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,187}[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value)) {
    throw new Error("A single valid email address is required");
  }
  return value;
}
