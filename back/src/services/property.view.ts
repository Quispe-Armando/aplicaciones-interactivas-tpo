import { Agency } from "../entities/agency.entity";
import { OperationType, PropertyStatus, PropertyType } from "../entities/enums";
import { Property, PropertyImage } from "../entities/property.entity";

// Lo que se le devuelve al cliente. Los decimales de Postgres llegan como texto
// ("120000.00"); aca se pasan a numero. Nunca incluye datos del vendedor.
export interface PropertyView {
  id: number;
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: number;
  currency: "ARS" | "USD";
  address: string;
  area: string;
  coveredAreaM2: number | null;
  totalAreaM2: number;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ageYears: number | null;
  tags: string[];
  status: PropertyStatus;
  images: PropertyImage[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Solo si la inmobiliaria se cargo junto con la propiedad.
  agency?: { id: number; name: string; logoUrl: string | null; contactPhone: string; contactEmail: string; officeAddress: string | null };
}

const toNumberOrNull = (value: string | null): number | null => (value === null ? null : Number(value));

function toAgencyView(agency: Agency): NonNullable<PropertyView["agency"]> {
  return {
    id: agency.id,
    name: agency.name,
    logoUrl: agency.logoUrl,
    contactPhone: agency.contactPhone,
    contactEmail: agency.contactEmail,
    officeAddress: agency.officeAddress,
  };
}

export function toPropertyView(property: Property): PropertyView {
  return {
    id: property.id,
    title: property.title,
    description: property.description,
    type: property.type,
    operation: property.operation,
    price: Number(property.price),
    currency: property.currency,
    address: property.address,
    area: property.area,
    coveredAreaM2: toNumberOrNull(property.coveredAreaM2),
    totalAreaM2: Number(property.totalAreaM2),
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    ageYears: property.ageYears,
    tags: property.tags,
    status: property.status,
    images: property.images,
    publishedAt: property.publishedAt,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    ...(property.agency ? { agency: toAgencyView(property.agency) } : {}),
  };
}
