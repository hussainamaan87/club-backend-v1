export const normalizePhone = (input: string) => {
  let phone = input.replace(/\D/g, "");

  // assume India default
  if (phone.length === 10) {
    phone = "91" + phone;
  }

  return phone;
};