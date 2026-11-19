// Tipos de lo que devuelve y recibe la API. Las fechas llegan como texto ISO ("2026-11-20T15:00:00.000Z").

export type PropertyType = "HOUSE" | "APARTMENT" | "LAND" | "COMMERCIAL";
export type OperationType = "SALE" | "RENT";
export type Currency = "ARS" | "USD";
export type PropertyStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "RESERVED"
  | "PAUSED"
  | "SOLD"
  | "RENTED"
  | "CANCELLED";
export type VisitRequestStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";
export type ActivityType =
  | "COMMENT"
  | "VISIT_REQUEST"
  | "PROPERTY_STATUS_CHANGE"
  | "REVIEW";

// ---------- Paginado ----------

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

// ---------- Autenticacion ----------

export interface Session {
  seller: { id: number; fullName: string; email: string; phone: string | null };
  agency: { id: number; name: string };
}

export interface LoginResponse extends Session {
  token: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  agency: { name: string; contactPhone: string };
}

export interface LoginInput {
  email: string;
  password: string;
}

// ---------- Inmobiliaria ----------

export interface RatingSummary {
  average: number | null; // null si todavia no tiene reseñas
  count: number;
}

export interface Agency {
  id: number;
  name: string;
  description: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string | null;
  createdAt: string;
  rating: RatingSummary;
}

// PUT /agencies/:id reemplaza el perfil completo.
export interface AgencyInput {
  name: string;
  description: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string | null;
}

// ---------- Propiedad ----------

export interface PropertyImage {
  url: string;
  isCover: boolean;
}

// La inmobiliaria resumida que viene dentro de una propiedad.
export interface PropertyAgency {
  id: number;
  name: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  officeAddress: string | null;
}

export interface Property {
  id: number;
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: number;
  currency: Currency;
  address: string;
  area: string; // zona / barrio
  coveredAreaM2: number | null;
  totalAreaM2: number;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ageYears: number | null;
  tags: string[]; // amenities
  status: PropertyStatus;
  images: PropertyImage[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  agency?: PropertyAgency;
}

// Body de POST /properties y PUT /properties/:id (el estado no se manda: cambia con PATCH /status).
export interface PropertyInput {
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: number;
  currency: Currency;
  address: string;
  area: string;
  coveredAreaM2?: number | null;
  totalAreaM2: number;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ageYears?: number | null;
  tags?: string[];
  images: PropertyImage[];
}

// Filtros de GET /properties (todos opcionales y combinables).
export interface PropertyFilters extends PageParams {
  type?: PropertyType;
  operation?: OperationType;
  currency?: Currency;
  minPrice?: number;
  maxPrice?: number;
  area?: string;
  rooms?: number;
  amenities?: string[]; // tiene que tener todas
  q?: string; // texto libre en titulo o descripcion
  sort?: "price" | "publishedAt" | "totalArea";
  order?: "asc" | "desc";
}

export interface StatusHistoryEntry {
  id: number;
  fromStatus: PropertyStatus | null; // null = la creacion
  toStatus: PropertyStatus;
  changedAt: string;
}

// ---------- Consultas (comentarios) ----------

export interface Comment {
  id: number;
  authorName: string;
  content: string;
  reply: string | null;
  createdAt: string;
}

// Una consulta en el panel del vendedor: ademas dice en que propiedad se hizo (GET /agencies/:id/comments).
export interface ReceivedComment extends Comment {
  property: { id: number; title: string };
}

export interface CommentInput {
  authorName: string;
  content: string;
}

// ---------- Solicitudes de visita ----------

export interface VisitRequest {
  id: number;
  requesterName: string;
  requesterPhone: string;
  proposedAt: string;
  message: string | null;
  status: VisitRequestStatus;
  createdAt: string;
  property?: { id: number; title: string };
}

export interface VisitRequestInput {
  requesterName: string;
  requesterPhone: string;
  proposedAt: string; // ISO 8601 con zona horaria, futura: "2026-11-20T15:00:00-03:00"
  message?: string | null;
}

// ---------- Reseñas ----------

export interface Review {
  id: number;
  authorName: string;
  content: string;
  rating: number; // 1 a 5
  createdAt: string;
}

export interface ReviewInput {
  authorName: string;
  content: string;
  rating: number;
}

// El listado de reseñas trae ademas el resumen de la inmobiliaria.
export interface ReviewsPage extends Page<Review> {
  rating: RatingSummary;
}

// ---------- Actividad ----------

export interface Activity {
  id: number;
  type: ActivityType;
  sourceId: number; // id del comentario / solicitud / cambio de estado / reseña que la genero
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ---------- Reportes ----------

export interface StatusSummary {
  items: { status: PropertyStatus; count: number }[]; // siempre los 7 estados
  total: number;
}

export interface MonthlyRow {
  month: string; // "2026-10"
  published: number;
  sold: number;
  rented: number;
}

export interface MonthlyReport {
  items: MonthlyRow[];
}

export interface TimeOnMarket {
  averageDays: number | null; // null si todavia no se cerro ninguna
  closedCount: number;
}

export interface Health {
  status: string;
}
