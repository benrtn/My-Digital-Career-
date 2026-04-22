export type Language = 'fr' | 'en' | 'th'

export interface SocialLink {
  name: string
  url: string
}

export interface QuestionnaireUpload {
  name: string
  mimeType: string
  base64: string
}

export interface AppointmentSelection {
  slotId: string
  startAt: string
  endAt: string
  dateLabel: string
  timeLabel: string
  durationMinutes: number
  mode: 'google_meet'
}

export interface ChatAttachment {
  name: string
  url?: string
}

export interface ColorPalette {
  id: string
  nameKey: string
  descriptionKey: string
  primary: string
  secondary: string
  accent: string
  preview: string[]
}

export interface SiteStyle {
  id: string
  nameKey: string
  descriptionKey: string
}

export interface QuestionnaireData {
  firstName: string
  lastName: string
  email: string
  password: string
  profession: string
  seekingJob: boolean | null
  positionsSearched: string[]
  motivations: string[]
  motivationOther: string
  colorPalette: string
  siteStyle: string
  customRequestEnabled: boolean | null
  customRequest: string
  socialLinks: SocialLink[]
  cvLink: string
  photoLink: string
  extraLink: string
  cvFile?: QuestionnaireUpload | null
  photoFile?: QuestionnaireUpload | null
  extraFiles?: QuestionnaireUpload[]
  authorization: boolean
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'in_progress'
  | 'first_version'
  | 'revision'
  | 'delivered'
  | 'cancelled'

export interface Order {
  orderId: string
  date: string
  firstName: string
  lastName: string
  email: string
  status: OrderStatus
  amount: string
  currency: string
  colorPalette: string
  siteStyle: string
  profession: string
  positionsSearched: string[]
  chatEnabled: boolean
  firstVersionSent: boolean
  siteUrl?: string
}

export interface PortfolioItem {
  id: string
  titleKey: string
  professionKey: string
  descriptionKey: string
  style: string
  color: string
  mockColors: string[]
  gradient: string
  imagePath?: string
}

export interface ResultItem {
  id: string
  titleKey: string
  professionKey: string
  descriptionKey: string
  tags: string[]
  gradient: string
  accentColor: string
  imagePath: string
  siteUrl: string
}

export interface ContactFormData {
  name: string
  email: string
  message: string
}

export interface ClientSiteAccess {
  id: string
  name: string
  email: string
  password: string
  siteUrl: string
  previewImagePath: string
  downloadPath: string
  orderId?: string
  token?: string
}

export interface ChatMessage {
  id: string
  clientEmail: string
  clientName: string
  author: 'client' | 'admin'
  message: string
  timestamp: string
  read: boolean
  attachments?: ChatAttachment[]
}

export interface ChatConversation {
  clientEmail: string
  clientName: string
  orderStatus: string
  chatEnabled: boolean
  messages: ChatMessage[]
  lastMessage?: string
  lastMessageDate?: string
  unreadCount: number
}
