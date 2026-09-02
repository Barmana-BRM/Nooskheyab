export const formatJalaliDateTime = (value: string | Date): string =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(value));

export const formatJalaliDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(value));

export const remainingLabel = (value: string): string => {
  const minutes = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} ساعت و ${minutes % 60} دقیقه` : `${minutes} دقیقه`;
};
