export interface MarketAthlete {
  username: string
  name: string
  sport: string
  position: string
  school: string
  classYear: string
  location: string
  followers: string
  engagementRate: string
  headline: string
  bio: string
  brandInterests: string[]
  verificationStatus: 'verified' | 'pending'
  stats: { label: string; value: string }[]
  sponsors: string[]
  mediaKitViews: string
  avatarHue: number
}

export const MARKET_ATHLETES: MarketAthlete[] = [
  {
    username: 'jordan-carter',
    name: 'Jordan Carter',
    sport: 'Basketball',
    position: 'Point Guard',
    school: 'State University',
    classYear: 'Junior',
    location: 'Columbus, OH',
    followers: '125K',
    engagementRate: '6.2%',
    headline: 'Point guard · Fitness & tech storyteller · Community builder',
    bio: 'State University point guard averaging 16.4 PPG. I document the training grind, game-day routines, and the business behind college athletics. Partner with me to reach a highly engaged audience of hoops fans and aspiring athletes.',
    brandInterests: ['Fitness & Nutrition', 'Sports Apparel', 'Tech & Gadgets', 'Local Business'],
    verificationStatus: 'verified',
    stats: [
      { label: 'Instagram', value: '85.2K' },
      { label: 'TikTok', value: '31.4K' },
      { label: 'YouTube', value: '8.6K' },
      { label: 'Avg. engagement', value: '6.2%' },
    ],
    sponsors: ['Apex Nutrition', 'UrbanFit Co.', 'TechGear'],
    mediaKitViews: '142',
    avatarHue: 210,
  },
  {
    username: 'maya-reyes',
    name: 'Maya Reyes',
    sport: 'Soccer',
    position: 'Midfielder',
    school: 'Pacific Coast University',
    classYear: 'Sophomore',
    location: 'San Diego, CA',
    followers: '48K',
    engagementRate: '7.8%',
    headline: 'Midfielder · Lifestyle & wellness · First-gen college student',
    bio: 'Division I midfielder with a growing lifestyle audience. I create content around training, wellness, and the student-athlete experience. Reliable, brand-friendly, and always disclosure-ready.',
    brandInterests: ['Wellness', 'Beauty & Skincare', 'Travel', 'Education'],
    verificationStatus: 'verified',
    stats: [
      { label: 'Instagram', value: '29.1K' },
      { label: 'TikTok', value: '18.7K' },
      { label: 'X', value: '2.3K' },
      { label: 'Avg. engagement', value: '7.8%' },
    ],
    sponsors: ['Coastal Wellness', 'GlowLab'],
    mediaKitViews: '96',
    avatarHue: 340,
  },
  {
    username: 'devon-williams',
    name: 'Devon Williams',
    sport: 'Football',
    position: 'Wide Receiver',
    school: 'Riverside State',
    classYear: 'Senior',
    location: 'Riverside, CA',
    followers: '203K',
    engagementRate: '5.1%',
    headline: 'Wide receiver · Motivation & mindset · Sneakerhead',
    bio: 'Big-play receiver with a motivational brand. From off-season training to game-day highlights, my audience follows the journey. Open to apparel, energy, and motivational campaigns.',
    brandInterests: ['Apparel & Sneakers', 'Energy & Supplements', 'Gaming', 'Motivation'],
    verificationStatus: 'verified',
    stats: [
      { label: 'Instagram', value: '118K' },
      { label: 'TikTok', value: '74.9K' },
      { label: 'YouTube', value: '10.1K' },
      { label: 'Avg. engagement', value: '5.1%' },
    ],
    sponsors: ['GridIron Energy', 'KickKulture'],
    mediaKitViews: '208',
    avatarHue: 20,
  },
  {
    username: 'priya-sharma',
    name: 'Priya Sharma',
    sport: 'Tennis',
    position: 'Singles',
    school: 'Eastbridge University',
    classYear: 'Freshman',
    location: 'Boston, MA',
    followers: '27K',
    engagementRate: '8.9%',
    headline: 'Tennis · Academics & athletics · Study with me',
    bio: 'Freshman tennis player balancing D1 competition with a pre-med track. My content blends match prep, recovery, and student life. Ideal for wellness, tech, and academic brands.',
    brandInterests: ['Academics & EdTech', 'Wellness', 'Tech', 'Fashion'],
    verificationStatus: 'pending',
    stats: [
      { label: 'Instagram', value: '15.4K' },
      { label: 'TikTok', value: '11.6K' },
      { label: 'YouTube', value: '1.2K' },
      { label: 'Avg. engagement', value: '8.9%' },
    ],
    sponsors: [],
    mediaKitViews: '41',
    avatarHue: 270,
  },
  {
    username: 'tyler-brooks',
    name: 'Tyler Brooks',
    sport: 'Baseball',
    position: 'Outfielder',
    school: 'Lakeside University',
    classYear: 'Junior',
    location: 'Tampa, FL',
    followers: '61K',
    engagementRate: '4.8%',
    headline: 'Outfielder · BBQ & outdoors · Small-town kid',
    bio: 'College outfielder with a down-home brand: grilling, fishing, and baseball. My audience is family-focused and loyal. Great fit for local businesses, food, and outdoor gear.',
    brandInterests: ['Food & Beverage', 'Outdoor Gear', 'Local Business', 'Automotive'],
    verificationStatus: 'verified',
    stats: [
      { label: 'Instagram', value: '38.2K' },
      { label: 'TikTok', value: '22.8K' },
      { label: 'Facebook', value: '4.1K' },
      { label: 'Avg. engagement', value: '4.8%' },
    ],
    sponsors: ['Southern Grill Co.', 'ReelOutdoors'],
    mediaKitViews: '73',
    avatarHue: 40,
  },
  {
    username: 'amara-okafor',
    name: 'Amara Okafor',
    sport: 'Track & Field',
    position: 'Sprints',
    school: 'Summit University',
    classYear: 'Graduate',
    location: 'Denver, CO',
    followers: '34K',
    engagementRate: '6.6%',
    headline: 'Sprint specialist · Fitness & finance for athletes',
    bio: 'Graduate sprinter and finance enthusiast. I talk training, recovery, and the money side of being a college athlete. Perfect for fintech, fitness, and personal-brand campaigns.',
    brandInterests: ['Fintech', 'Fitness', 'Nutrition', 'Career Development'],
    verificationStatus: 'verified',
    stats: [
      { label: 'Instagram', value: '19.7K' },
      { label: 'TikTok', value: '14.3K' },
      { label: 'LinkedIn', value: '1.8K' },
      { label: 'Avg. engagement', value: '6.6%' },
    ],
    sponsors: ['Vertex Finance', 'PureFuel'],
    mediaKitViews: '88',
    avatarHue: 160,
  },
]

export function getMarketAthleteByUsername(username: string): MarketAthlete | undefined {
  return MARKET_ATHLETES.find((athlete) => athlete.username === username)
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
