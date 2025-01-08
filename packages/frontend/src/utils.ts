/**
 * Generate a random ID
 * @param length - The length of the ID
 * @returns The random ID
 */
export const generateRandomID = (length: number): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};
