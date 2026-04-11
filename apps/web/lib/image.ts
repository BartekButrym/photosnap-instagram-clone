export const getImageUrl = (image: string) => {
  if (!image) return "";

  return `${process.env.NEXT_PUBLIC_API_URL}/uploads/images/${image}`;
};
