import postgres from "postgres";

// Connection to EasyOrder PostgreSQL database
// This is used to fetch user contact data (email, phone, name) directly from EasyOrder
const EASYORDER_DATABASE_URL = process.env.EASYORDER_DATABASE_URL;

let easyorderDb: ReturnType<typeof postgres> | null = null;

export function getEasyOrderDb() {
  if (!EASYORDER_DATABASE_URL) {
    return null;
  }

  if (!easyorderDb) {
    easyorderDb = postgres(EASYORDER_DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return easyorderDb;
}

export interface EasyOrderUser {
  id: number;
  nombre: string;
  correo_electronico: string;
  telefono?: string | null;
}

/**
 * Fetch user data from EasyOrder database by user ID
 */
export async function getEasyOrderUserById(
  userId: string | number
): Promise<EasyOrderUser | null> {
  const db = getEasyOrderDb();

  if (!db) {
    return null;
  }

  try {
    const result = await db`
      SELECT id, nombre, correo_electronico
      FROM usuarios
      WHERE id = ${Number(userId)}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      id: result[0].id,
      nombre: result[0].nombre,
      correo_electronico: result[0].correo_electronico,
      telefono: null, // EasyOrder doesn't have phone field yet
    };
  } catch (error) {
    console.error("Error fetching user from EasyOrder:", error);
    return null;
  }
}

/**
 * Fetch multiple users from EasyOrder database by user IDs
 */
export async function getEasyOrderUsersByIds(
  userIds: (string | number)[]
): Promise<Map<string, EasyOrderUser>> {
  const db = getEasyOrderDb();
  const userMap = new Map<string, EasyOrderUser>();

  if (!db || userIds.length === 0) {
    return userMap;
  }

  try {
    const numericIds = userIds.map((id) => Number(id)).filter((id) => !isNaN(id));

    if (numericIds.length === 0) {
      return userMap;
    }

    const result = await db`
      SELECT id, nombre, correo_electronico
      FROM usuarios
      WHERE id = ANY(${numericIds})
    `;

    for (const row of result) {
      userMap.set(String(row.id), {
        id: row.id,
        nombre: row.nombre,
        correo_electronico: row.correo_electronico,
        telefono: null,
      });
    }

    return userMap;
  } catch (error) {
    console.error("Error fetching users from EasyOrder:", error);
    return userMap;
  }
}
