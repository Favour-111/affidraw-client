export type Campaign = {
  id: string; slug: string; title: string; description: string; sponsorName: string; sponsorLogoUrl: string | null;
  sponsorVerified: boolean; category: { id: string; name: string; slug: string }; images: { url: string; alt: string | null }[]; videos: { url: string }[];
  prizeValue: number | null; ticketPrice: number; currency: string; capacity: number; ticketsSold: number; ticketsRemaining: number;
  maxTicketsPerUser: number; status: string; featured: boolean; startsAt: string | null; publishedAt: string | null;
  rules: { eligibility: string; draw: string; refunds: string; delivery: string };
  youtubeUrl: string | null; drawScheduledAt: string | null; result: { winningTicketNumber: number; publishedAt: string } | null;
};
export type Me = { id: string; name: string; email: string; phone: string | null; role: 'USER' | 'BUSINESS' | 'ADMIN'; verificationStatus: string; emailNotifications: boolean; hasPin: boolean; hasPassword: boolean; googleLinked: boolean; clerkLinked?: boolean };
