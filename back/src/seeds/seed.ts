import bcrypt from "bcryptjs";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { runInTransaction } from "../config/transaction";
import { Activity } from "../entities/activity.entity";
import { Agency } from "../entities/agency.entity";
import { Comment } from "../entities/comment.entity";
import { ActivityType, OperationType, PropertyStatus, PropertyType, VisitRequestStatus } from "../entities/enums";
import { Property } from "../entities/property.entity";
import { PropertyStatusHistory } from "../entities/property-status-history.entity";
import { Review } from "../entities/review.entity";
import { Seller } from "../entities/seller.entity";
import { VisitRequest } from "../entities/visit-request.entity";
import { PROPERTY_STATUS_LABEL } from "../services/status-labels";
import seedFixture from "./seed.json";

// Carga los datos de desarrollo de seed.json. BORRA TODAS LAS TABLAS y las vuelve a cargar, asi que se puede correr las veces que haga falta.
//   npm run seed
// Las fechas son relativas a "hoy": el seed siempre deja datos recientes (los reportes mensuales muestran los ultimos meses).

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number): Date => new Date(Date.now() - days * DAY);
const fromNow = (days: number): Date => new Date(Date.now() + days * DAY);

const photo = (name: string) => [
  { url: `https://picsum.photos/seed/${name}-1/1200/800`, isCover: true },
  { url: `https://picsum.photos/seed/${name}-2/1200/800`, isCover: false },
  { url: `https://picsum.photos/seed/${name}-3/1200/800`, isCover: false },
];

// Los datos viven en seed.json: este script solo los carga.
// Las fechas del fixture son relativas: "daysAgo" = hace N dias, "proposedIn" = dentro de N dias.
interface PropertyFixture {
  title: string;
  description: string;
  type: PropertyType;
  operation: OperationType;
  price: number;
  currency: "ARS" | "USD";
  address: string;
  area: string;
  coveredAreaM2?: number;
  totalAreaM2: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  ageYears?: number;
  tags: string[];
  // Fotos de la propiedad (URLs; la primera es la portada). Opcional: si falta, se usan fotos de ejemplo de picsum.
  photos?: string[];
  // Cambios de estado en orden cronologico. El primero siempre es DRAFT (alta) y el ultimo es el estado actual.
  timeline: { status: PropertyStatus; daysAgo: number }[];
}

interface SeedFixture {
  password: string; // la misma para los tres vendedores de prueba
  accounts: {
    fullName: string;
    email: string;
    phone: string;
    agency: { name: string; description: string; contactPhone: string; officeAddress: string };
    properties: PropertyFixture[];
  }[];
  comments: { property: string; authorName: string; content: string; reply: string | null; daysAgo: number }[];
  visits: { property: string; requesterName: string; requesterPhone: string; proposedIn: number; message: string | null; status: VisitRequestStatus; daysAgo: number }[];
  reviews: { agency: string; authorName: string; content: string; rating: number; daysAgo: number }[];
}

const fixture = seedFixture as SeedFixture;
const { PUBLISHED } = PropertyStatus;
const PASSWORD = fixture.password;
const ACCOUNTS = fixture.accounts;
const { comments: COMMENTS, visits: VISITS, reviews: REVIEWS } = fixture;

// Una Activity pendiente de guardar: se arma al cargar cada comentario, visita, reseña o cambio de estado.
interface ActivityDraft {
  agency: Agency;
  type: ActivityType;
  sourceId: number;
  message: string;
  at: Date;
}

async function resetDatabase(): Promise<void> {
  const tables = AppDataSource.entityMetadatas.map((metadata) => `"${metadata.tableName}"`).join(", ");
  await AppDataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

async function load(manager: EntityManager): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const activities: ActivityDraft[] = [];
  const propertiesByTitle = new Map<string, Property>();
  const agenciesByName = new Map<string, Agency>();

  for (const account of ACCOUNTS) {
    const seller = await manager.save(manager.create(Seller, { fullName: account.fullName, email: account.email, passwordHash, phone: account.phone }));
    const agency = await manager.save(
      manager.create(Agency, { ...account.agency, logoUrl: null, contactEmail: account.email, seller }),
    );
    agenciesByName.set(agency.name, agency);

    for (const [index, data] of account.properties.entries()) {
      const timeline = data.timeline;
      const firstPublished = timeline.find((step) => step.status === PUBLISHED);
      const property = await manager.save(
        manager.create(Property, {
          title: data.title,
          description: data.description,
          type: data.type,
          operation: data.operation,
          price: String(data.price),
          currency: data.currency,
          address: data.address,
          area: data.area,
          coveredAreaM2: data.coveredAreaM2 === undefined ? null : String(data.coveredAreaM2),
          totalAreaM2: String(data.totalAreaM2),
          rooms: data.rooms ?? null,
          bedrooms: data.bedrooms ?? null,
          bathrooms: data.bathrooms ?? null,
          ageYears: data.ageYears ?? null,
          tags: data.tags,
          status: timeline[timeline.length - 1].status,
          images: data.photos?.length ? data.photos.map((url, position) => ({ url, isCover: position === 0 })) : photo(`${account.agency.name.split(" ")[0].toLowerCase()}-${index + 1}`),
          publishedAt: firstPublished ? ago(firstPublished.daysAgo) : null,
          agency,
          createdAt: ago(timeline[0].daysAgo),
        }),
      );
      propertiesByTitle.set(property.title, property);

      // Historial de estados: el alta (null -> DRAFT) y cada cambio, igual que lo escribe el service.
      let previous: PropertyStatus | null = null;
      for (const { status, daysAgo } of timeline) {
        const history = await manager.save(manager.create(PropertyStatusHistory, { property, fromStatus: previous, toStatus: status, createdAt: ago(daysAgo) }));
        if (previous !== null) {
          activities.push({
            agency,
            type: ActivityType.PROPERTY_STATUS_CHANGE,
            sourceId: history.id,
            message: `"${property.title}" pasó de ${PROPERTY_STATUS_LABEL[previous]} a ${PROPERTY_STATUS_LABEL[status]}`,
            at: ago(daysAgo),
          });
        }
        previous = status;
      }
    }
  }

  const propertyOf = (title: string): Property => {
    const property = propertiesByTitle.get(title);
    if (!property) throw new Error(`El seed no tiene la propiedad "${title}"`);
    return property;
  };
  // La inmobiliaria de una propiedad se busca por su dueño (los datos de arriba ya estan guardados).
  const agencyOfProperty = async (property: Property): Promise<Agency> => {
    const loaded = await manager.findOneOrFail(Property, { where: { id: property.id }, relations: { agency: true } });
    return loaded.agency;
  };

  for (const data of COMMENTS) {
    const property = propertyOf(data.property);
    const comment = await manager.save(manager.create(Comment, { authorName: data.authorName, content: data.content, reply: data.reply, property, createdAt: ago(data.daysAgo) }));
    activities.push({ agency: await agencyOfProperty(property), type: ActivityType.COMMENT, sourceId: comment.id, message: `Nueva consulta de ${data.authorName} en "${property.title}"`, at: ago(data.daysAgo) });
  }

  for (const data of VISITS) {
    const property = propertyOf(data.property);
    const visit = await manager.save(
      manager.create(VisitRequest, { requesterName: data.requesterName, requesterPhone: data.requesterPhone, proposedAt: fromNow(data.proposedIn), message: data.message, status: data.status, property, createdAt: ago(data.daysAgo) }),
    );
    activities.push({ agency: await agencyOfProperty(property), type: ActivityType.VISIT_REQUEST, sourceId: visit.id, message: `Nueva solicitud de visita de ${data.requesterName} para "${property.title}"`, at: ago(data.daysAgo) });
  }

  for (const data of REVIEWS) {
    const agency = agenciesByName.get(data.agency)!;
    const review = await manager.save(manager.create(Review, { authorName: data.authorName, content: data.content, rating: data.rating, agency, createdAt: ago(data.daysAgo) }));
    activities.push({ agency, type: ActivityType.REVIEW, sourceId: review.id, message: `Nueva reseña de ${data.authorName}: ${data.rating}/5`, at: ago(data.daysAgo) });
  }

  // Las actividades de hace mas de una semana ya estan leidas; las ultimas quedan sin leer (para el badge).
  activities.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const draft of activities) {
    await manager.save(
      manager.create(Activity, { agency: draft.agency, type: draft.type, sourceId: draft.sourceId, message: draft.message, isRead: draft.at.getTime() < Date.now() - 7 * DAY, createdAt: draft.at }),
    );
  }
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed borra todos los datos: no se corre con NODE_ENV=production");
  }

  await AppDataSource.initialize();
  try {
    await resetDatabase();
    await runInTransaction(load);

    const [sellers, properties, comments, visits, reviews, activities, unread] = await Promise.all([
      AppDataSource.getRepository(Seller).count(),
      AppDataSource.getRepository(Property).count(),
      AppDataSource.getRepository(Comment).count(),
      AppDataSource.getRepository(VisitRequest).count(),
      AppDataSource.getRepository(Review).count(),
      AppDataSource.getRepository(Activity).count(),
      AppDataSource.getRepository(Activity).count({ where: { isRead: false } }),
    ]);
    console.log("Seed listo.");
    console.log(`  ${sellers} vendedores/inmobiliarias, ${properties} propiedades, ${comments} comentarios, ${visits} visitas, ${reviews} reseñas, ${activities} actividades (${unread} sin leer)`);
    console.log(`  Usuarios de prueba (contraseña ${PASSWORD}): ${ACCOUNTS.map((account) => account.email).join(", ")}`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
